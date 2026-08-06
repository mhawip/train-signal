import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup } from "./RadioGroup";

const networks = [
  { value: "ee", label: "EE" },
  { value: "o2", label: "O2" },
  { value: "vodafone", label: "Vodafone" },
  { value: "three", label: "Three" },
];

describe("RadioGroup", () => {
  it("renders a fieldset with a legend", () => {
    render(
      <RadioGroup
        legend="Mobile network"
        name="network"
        options={networks}
        value=""
        onChange={() => {}}
      />
    );

    const group = screen.getByRole("group", { name: "Mobile network" });
    expect(group).toBeInTheDocument();
  });

  it("renders labelled radio buttons for each option", () => {
    render(
      <RadioGroup
        legend="Mobile network"
        name="network"
        options={networks}
        value=""
        onChange={() => {}}
      />
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);

    expect(screen.getByLabelText("EE")).toBeInTheDocument();
    expect(screen.getByLabelText("O2")).toBeInTheDocument();
    expect(screen.getByLabelText("Vodafone")).toBeInTheDocument();
    expect(screen.getByLabelText("Three")).toBeInTheDocument();
  });

  it("checks the radio matching the current value", () => {
    render(
      <RadioGroup
        legend="Mobile network"
        name="network"
        options={networks}
        value="vodafone"
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText("Vodafone")).toBeChecked();
    expect(screen.getByLabelText("EE")).not.toBeChecked();
  });

  it("calls onChange when a radio is selected", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <RadioGroup
        legend="Mobile network"
        name="network"
        options={networks}
        value=""
        onChange={handleChange}
      />
    );

    await user.click(screen.getByLabelText("Three"));
    expect(handleChange).toHaveBeenCalledWith("three");
  });

  it("renders error text associated to the fieldset", () => {
    render(
      <RadioGroup
        legend="Mobile network"
        name="network"
        options={networks}
        value=""
        onChange={() => {}}
        error="Choose a mobile network."
      />
    );

    const group = screen.getByRole("group", { name: "Mobile network" });
    expect(group).toHaveAttribute("aria-describedby", "network-error");
    expect(
      screen.getByText("Choose a mobile network.")
    ).toBeInTheDocument();
  });
});
