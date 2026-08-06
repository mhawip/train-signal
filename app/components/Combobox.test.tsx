import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./Combobox";

const stations = [
  { value: "LDS", label: "Leeds" },
  { value: "KGX", label: "London King's Cross" },
  { value: "YRK", label: "York" },
];

describe("Combobox", () => {
  it("renders a labelled input with correct for/id association", () => {
    render(
      <Combobox
        id="from"
        label="From"
        value=""
        onChange={() => {}}
        options={stations}
      />
    );

    const input = screen.getByLabelText("From");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "from");
  });

  it("associates the input with a datalist via the list attribute", () => {
    render(
      <Combobox
        id="from"
        label="From"
        value=""
        onChange={() => {}}
        options={stations}
      />
    );

    const input = screen.getByLabelText("From");
    expect(input).toHaveAttribute("list", "from-list");
  });

  it("renders options in the datalist", () => {
    const { container } = render(
      <Combobox
        id="from"
        label="From"
        value=""
        onChange={() => {}}
        options={stations}
      />
    );

    const datalist = container.querySelector("#from-list");
    expect(datalist).toBeInTheDocument();
    expect(datalist?.querySelectorAll("option")).toHaveLength(3);
  });

  it("calls onChange when the user types", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Combobox
        id="from"
        label="From"
        value=""
        onChange={handleChange}
        options={stations}
      />
    );

    await user.type(screen.getByLabelText("From"), "L");
    expect(handleChange).toHaveBeenCalledWith("L");
  });

  it("renders error text and sets aria-invalid", () => {
    render(
      <Combobox
        id="from"
        label="From"
        value=""
        onChange={() => {}}
        options={stations}
        error="Enter an origin station."
      />
    );

    const input = screen.getByLabelText("From");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "from-error");
    expect(screen.getByText("Enter an origin station.")).toBeInTheDocument();
  });

  it("sets aria-required when required", () => {
    render(
      <Combobox
        id="from"
        label="From"
        value=""
        onChange={() => {}}
        options={stations}
        required
      />
    );

    expect(screen.getByLabelText("From")).toHaveAttribute(
      "aria-required",
      "true"
    );
  });
});
