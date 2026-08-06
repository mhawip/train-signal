import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DateTimeInput } from "./DateTimeInput";

describe("DateTimeInput", () => {
  it("renders a fieldset with a legend as the group label", () => {
    render(
      <DateTimeInput
        id="travel"
        label="When are you travelling?"
        dateValue=""
        timeValue=""
        onDateChange={() => {}}
        onTimeChange={() => {}}
      />
    );

    const group = screen.getByRole("group", {
      name: "When are you travelling?",
    });
    expect(group).toBeInTheDocument();
    expect(group.tagName).toBe("FIELDSET");
  });

  it("renders individually labelled date and time inputs", () => {
    render(
      <DateTimeInput
        id="travel2"
        label="Travel date and time"
        dateValue="2026-07-14"
        timeValue="14:30"
        onDateChange={() => {}}
        onTimeChange={() => {}}
      />
    );

    const dateInput = screen.getByLabelText("Date");
    expect(dateInput).toHaveAttribute("type", "date");
    expect(dateInput).toHaveAttribute("id", "travel2-date");

    const timeInput = screen.getByLabelText("Time");
    expect(timeInput).toHaveAttribute("type", "time");
    expect(timeInput).toHaveAttribute("id", "travel2-time");
  });

  it("passes min and max date constraints to the date input", () => {
    const { container } = render(
      <DateTimeInput
        id="travel3"
        label="Departure date and time"
        dateValue=""
        timeValue=""
        onDateChange={() => {}}
        onTimeChange={() => {}}
        minDate="2026-07-01"
        maxDate="2026-08-31"
      />
    );

    // Use querySelector to check the attribute directly since jsdom may
    // not expose min/max through testing-library's toHaveAttribute on
    // date inputs in all environments.
    const dateInput = container.querySelector("#travel3-date");
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute("min", "2026-07-01");
    expect(dateInput).toHaveAttribute("max", "2026-08-31");
  });

  it("renders error text associated to the fieldset", () => {
    render(
      <DateTimeInput
        id="travel4"
        label="Arrival date and time"
        dateValue=""
        timeValue=""
        onDateChange={() => {}}
        onTimeChange={() => {}}
        error="Choose a date within the next 8 weeks."
      />
    );

    const group = screen.getByRole("group", {
      name: "Arrival date and time",
    });
    expect(group).toHaveAttribute("aria-describedby", "travel4-error");
    expect(
      screen.getByText("Choose a date within the next 8 weeks.")
    ).toBeInTheDocument();
  });

  it("sets aria-invalid on both inputs when there is an error", () => {
    render(
      <DateTimeInput
        id="travel5"
        label="Journey time"
        dateValue=""
        timeValue=""
        onDateChange={() => {}}
        onTimeChange={() => {}}
        error="Choose a date."
      />
    );

    const dateInput = screen.getByLabelText("Date");
    expect(dateInput).toHaveAttribute("aria-invalid", "true");

    const timeInput = screen.getByLabelText("Time");
    expect(timeInput).toHaveAttribute("aria-invalid", "true");
  });

  it("calls onDateChange when the date input changes", () => {
    const onDateChange = vi.fn();

    const { container } = render(
      <DateTimeInput
        id="travel6"
        label="When are you going?"
        dateValue=""
        timeValue=""
        onDateChange={onDateChange}
        onTimeChange={() => {}}
      />
    );

    const dateInput = container.querySelector(
      "#travel6-date"
    ) as HTMLInputElement;
    // Simulate a change event directly since date inputs in jsdom
    // do not respond to userEvent.type
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    nativeValueSetter?.call(dateInput, "2026-07-14");
    dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onDateChange).toHaveBeenCalled();
  });
});
