import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DeparturesLoading from "./loading";

describe("DeparturesLoading", () => {
  it("renders the loading message", () => {
    render(<DeparturesLoading />);
    expect(
      screen.getByText("Finding trains for your journey..."),
    ).toBeDefined();
  });

  it("has role=status for screen reader announcement", () => {
    render(<DeparturesLoading />);
    const status = screen.getByRole("status");
    expect(status).toBeDefined();
    expect(status.textContent).toBe(
      "Finding trains for your journey...",
    );
  });

  it("renders inside a main landmark", () => {
    render(<DeparturesLoading />);
    const main = screen.getByRole("main");
    expect(main).toBeDefined();
  });
});
