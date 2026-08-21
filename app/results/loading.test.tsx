import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultsLoading from "./loading";

describe("ResultsLoading", () => {
  it("renders the loading message", () => {
    render(<ResultsLoading />);
    expect(
      screen.getByText("Checking signal for your journey..."),
    ).toBeDefined();
  });

  it("has role=status for screen reader announcement", () => {
    render(<ResultsLoading />);
    const status = screen.getByRole("status");
    expect(status).toBeDefined();
    expect(status.textContent).toBe(
      "Checking signal for your journey...",
    );
  });

  it("renders inside a main landmark", () => {
    render(<ResultsLoading />);
    const main = screen.getByRole("main");
    expect(main).toBeDefined();
  });
});
