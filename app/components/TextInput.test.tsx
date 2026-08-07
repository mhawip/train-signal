import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextInput } from "./TextInput";

describe("TextInput", () => {
  it("renders a labelled input with correct for/id association", () => {
    render(
      <TextInput id="origin" label="From" value="" onChange={() => {}} />
    );

    const input = screen.getByLabelText("From");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "origin");
  });

  it("calls onChange when the user types", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TextInput id="origin" label="From" value="" onChange={handleChange} />
    );

    await user.type(screen.getByLabelText("From"), "Leeds");
    expect(handleChange).toHaveBeenCalledWith("L");
  });

  it("renders hint text linked via aria-describedby", () => {
    render(
      <TextInput
        id="origin"
        label="From"
        value=""
        onChange={() => {}}
        hint="Type a station name"
      />
    );

    const input = screen.getByLabelText("From");
    expect(input).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("origin-hint")
    );
    expect(screen.getByText("Type a station name")).toHaveAttribute(
      "id",
      "origin-hint"
    );
  });

  it("renders error text linked via aria-describedby and sets aria-invalid", () => {
    render(
      <TextInput
        id="origin"
        label="From"
        value=""
        onChange={() => {}}
        error="Enter an origin station."
      />
    );

    const input = screen.getByLabelText("From");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("origin-error")
    );
    expect(screen.getByText("Enter an origin station.")).toBeInTheDocument();
  });

  it("sets aria-required when required is true", () => {
    render(
      <TextInput
        id="origin"
        label="From"
        value=""
        onChange={() => {}}
        required
      />
    );

    expect(screen.getByLabelText("From")).toHaveAttribute(
      "aria-required",
      "true"
    );
  });

  it("does not set aria-invalid or aria-describedby when there is no error", () => {
    render(
      <TextInput id="origin" label="From" value="" onChange={() => {}} />
    );

    const input = screen.getByLabelText("From");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});
