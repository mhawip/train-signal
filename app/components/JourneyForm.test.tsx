import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JourneyForm } from "./JourneyForm";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

// Mock StationCombobox to a simple input -- the combobox has its own tests.
// This lets us focus on the disclosure logic without fetching station data.
vi.mock("./StationCombobox", () => ({
  StationCombobox: ({
    id,
    label,
    value,
    onChange,
    error,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (crs: string, name: string) => void;
    error?: string;
    required?: boolean;
    hint?: string;
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value, e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error && <p>{error}</p>}
    </div>
  ),
}));

// Mock history.replaceState -- jsdom does not implement it
const replaceStateSpy = vi.fn();
Object.defineProperty(window, "history", {
  value: { replaceState: replaceStateSpy },
  writable: true,
});

// Mock window.location for URL manipulation
const mockLocation = new URL("http://localhost:3000/");
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// Mock requestAnimationFrame for focus management
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
});

beforeEach(() => {
  mockPush.mockClear();
  replaceStateSpy.mockClear();
  // Reset searchParams to empty for each test
  for (const key of Array.from(mockSearchParams.keys())) {
    mockSearchParams.delete(key);
  }
  mockLocation.search = "";
  mockLocation.href = "http://localhost:3000/";
});

describe("JourneyForm progressive reveal", () => {
  it("hides date/time fields after JS enhancement", async () => {
    render(<JourneyForm />);

    // After hydration (useEffect runs), the datetime-fields div
    // should have the hidden attribute
    const datetimeFields = document.getElementById("datetime-fields");
    expect(datetimeFields).toHaveAttribute("hidden");
  });

  it("shows the toggle button after JS enhancement", () => {
    render(<JourneyForm />);

    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });
    expect(toggle).not.toHaveAttribute("hidden");
  });

  it("toggle button has correct initial aria attributes", () => {
    render(<JourneyForm />);

    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "datetime-fields");
  });

  it("reveals date/time fields when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });

    await user.click(toggle);

    const datetimeFields = document.getElementById("datetime-fields");
    expect(datetimeFields).not.toHaveAttribute("hidden");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses date/time fields when toggle is clicked again", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });

    // Reveal
    await user.click(toggle);
    expect(document.getElementById("datetime-fields")).not.toHaveAttribute(
      "hidden"
    );

    // Collapse
    await user.click(
      screen.getByRole("button", { name: /find a specific train journey/i })
    );
    expect(document.getElementById("datetime-fields")).toHaveAttribute(
      "hidden"
    );
    expect(
      screen.getByRole("button", { name: /find a specific train journey/i })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("clears date/time errors on collapse", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    // Reveal fields
    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });
    await user.click(toggle);

    // Clear time field to trigger validation error
    const timeInput = screen.getByLabelText("Time");
    await user.clear(timeInput);

    // Submit to trigger validation
    const submitButton = screen.getByRole("button", { name: /find signal/i });
    await user.click(submitButton);

    // Collapse -- errors should be cleared
    await user.click(
      screen.getByRole("button", { name: /find a specific train journey/i })
    );

    // Date and time errors should not be visible
    const dateError = document.getElementById("date-error");
    const timeError = document.getElementById("time-error");
    // Hidden fields are inside a hidden div so not visible,
    // but the error state should be cleared
    expect(dateError?.textContent).toBe("");
    expect(timeError?.textContent).toBe("");
  });

  it("submitting without revealed date/time navigates to route overview", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    // Fill in the always-visible fields
    const fromInput = screen.getByLabelText("Origin station");
    const toInput = screen.getByLabelText("Destination station");
    await user.type(fromInput, "LDS");
    await user.type(toInput, "KGX");

    // Submit without revealing date/time
    const submitButton = screen.getByRole("button", { name: /find signal/i });
    await user.click(submitButton);

    // Should navigate to route-overview results (no date/time params)
    expect(mockPush).toHaveBeenCalledWith("/results?from=LDS&to=KGX");

    // Fields should remain hidden (no auto-reveal)
    const datetimeFields = document.getElementById("datetime-fields");
    expect(datetimeFields).toHaveAttribute("hidden");
  });

  it("does not validate date/time when fields are not revealed", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    // date/time are collapsed by JS enhancement.
    // Submit the form -- should trigger reveal, not date/time errors.
    const submitButton = screen.getByRole("button", { name: /find signal/i });
    await user.click(submitButton);

    // The error summary should show errors for origin/destination/network
    // but NOT for date or time
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("validates date/time only when fields are revealed", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    // Reveal fields
    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });
    await user.click(toggle);

    // Clear time so it is empty
    const timeInput = screen.getByLabelText("Time");
    await user.clear(timeInput);

    // Submit
    const submitButton = screen.getByRole("button", { name: /find signal/i });
    await user.click(submitButton);

    // Should not navigate (validation errors exist)
    expect(mockPush).not.toHaveBeenCalled();

    // Time error should be present (may appear in both error summary and inline)
    const timeErrors = screen.getAllByText("Enter a departure time.");
    expect(timeErrors.length).toBeGreaterThanOrEqual(1);
  });

  it("updates URL with mode=timed when revealing", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });
    await user.click(toggle);

    // history.replaceState should have been called with mode=timed
    expect(replaceStateSpy).toHaveBeenCalled();
    const lastCall =
      replaceStateSpy.mock.calls[replaceStateSpy.mock.calls.length - 1];
    expect(lastCall[2]).toContain("mode=timed");
  });

  it("removes mode param from URL when collapsing", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    // Reveal
    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });
    await user.click(toggle);

    // Collapse
    await user.click(
      screen.getByRole("button", { name: /find a specific train journey/i })
    );

    const lastCall =
      replaceStateSpy.mock.calls[replaceStateSpy.mock.calls.length - 1];
    expect(lastCall[2]).not.toContain("mode=timed");
  });

  it("initialises with fields revealed when mode=timed is in URL", () => {
    mockSearchParams.set("mode", "timed");

    render(<JourneyForm />);

    const datetimeFields = document.getElementById("datetime-fields");
    expect(datetimeFields).not.toHaveAttribute("hidden");

    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the downward chevron when collapsed and upward when expanded", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    // Collapsed: downward triangle U+25BE
    const toggle = screen.getByRole("button", {
      name: /find a specific train journey/i,
    });
    const chevron = toggle.querySelector(".ts-accordion__chevron");
    expect(chevron?.textContent).toBe("\u25BE");

    // Expanded: upward triangle U+25B4
    await user.click(toggle);
    expect(chevron?.textContent).toBe("\u25B4");
  });

  it("treats network=open as no network selected on route-overview submit", async () => {
    // Simulate arriving via the no-network notice link
    mockSearchParams.set("network", "open");

    const user = userEvent.setup();
    render(<JourneyForm />);

    // Fill in origin and destination
    const fromInput = screen.getByLabelText("Origin station");
    const toInput = screen.getByLabelText("Destination station");
    await user.type(fromInput, "LDS");
    await user.type(toInput, "KGX");

    // Submit without selecting a real network
    const submitButton = screen.getByRole("button", { name: /find signal/i });
    await user.click(submitButton);

    // Should navigate to route-overview WITHOUT network=open
    expect(mockPush).toHaveBeenCalledWith("/results?from=LDS&to=KGX");
  });

  it("does not show 'open' as a network name in the accordion label", () => {
    mockSearchParams.set("network", "open");

    render(<JourneyForm />);

    // The network accordion should show the generic label, not "Mobile network: open"
    const networkToggle = screen.getByRole("button", {
      name: /choose your mobile network/i,
    });
    expect(networkToggle).toBeTruthy();
    // Ensure it does NOT say "Mobile network: open"
    expect(networkToggle.textContent).not.toContain("Mobile network: open");
  });

  it("treats network=open as no network selected on timed submit", async () => {
    // Simulate arriving via the no-network notice link with date/time
    mockSearchParams.set("network", "open");
    mockSearchParams.set("mode", "timed");
    mockSearchParams.set("from", "LDS");
    mockSearchParams.set("to", "KGX");

    const user = userEvent.setup();
    render(<JourneyForm />);

    // The date/time fields should be revealed (mode=timed)
    const datetimeFields = document.getElementById("datetime-fields");
    expect(datetimeFields).not.toHaveAttribute("hidden");

    // Fill in the time field (date has a default)
    const timeInput = screen.getByLabelText("Time");
    await user.clear(timeInput);
    await user.type(timeInput, "10:00");

    // Submit
    const submitButton = screen.getByRole("button", { name: /find signal/i });
    await user.click(submitButton);

    // Should navigate to departures WITHOUT network=open
    expect(mockPush).toHaveBeenCalled();
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("network=open");
    expect(calledUrl).toContain("from=LDS");
    expect(calledUrl).toContain("to=KGX");
  });

  it("submitting without revealed date/time includes network param when selected", async () => {
    const user = userEvent.setup();
    render(<JourneyForm />);

    // Fill in origin and destination
    const fromInput = screen.getByLabelText("Origin station");
    const toInput = screen.getByLabelText("Destination station");
    await user.type(fromInput, "LDS");
    await user.type(toInput, "KGX");

    // Open network accordion and select a network
    const networkToggle = screen.getByRole("button", {
      name: /choose your mobile network/i,
    });
    await user.click(networkToggle);
    const eeRadio = screen.getByLabelText("EE");
    await user.click(eeRadio);

    // Submit without revealing date/time
    const submitButton = screen.getByRole("button", { name: /find signal/i });
    await user.click(submitButton);

    // Should navigate to route-overview with network param
    expect(mockPush).toHaveBeenCalledWith("/results?from=LDS&to=KGX&network=EE");
  });
});
