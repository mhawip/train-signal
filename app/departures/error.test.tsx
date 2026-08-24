import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DeparturesError from "./error";

describe("DeparturesError", () => {
  it("renders the heading", () => {
    render(
      <DeparturesError error={new Error("test")} reset={vi.fn()} />,
    );
    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeDefined();
  });

  it("renders the error message", () => {
    render(
      <DeparturesError error={new Error("test")} reset={vi.fn()} />,
    );
    expect(
      screen.getByText(/could not find trains for that journey/i),
    ).toBeDefined();
  });

  it("renders a Try again button", () => {
    const reset = vi.fn();
    render(
      <DeparturesError error={new Error("test")} reset={reset} />,
    );
    const button = screen.getByRole("button", { name: /try again/i });
    expect(button).toBeDefined();
  });

  it("calls reset when Try again is clicked", async () => {
    const reset = vi.fn();
    render(
      <DeparturesError error={new Error("test")} reset={reset} />,
    );
    const button = screen.getByRole("button", { name: /try again/i });
    button.click();
    expect(reset).toHaveBeenCalledOnce();
  });

  it("renders a Back to search link pointing to /", () => {
    render(
      <DeparturesError error={new Error("test")} reset={vi.fn()} />,
    );
    const link = screen.getByRole("link", { name: /back to search/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/");
  });

  it("wraps navigation in a nav landmark", () => {
    render(
      <DeparturesError error={new Error("test")} reset={vi.fn()} />,
    );
    const nav = screen.getByRole("navigation", {
      name: /page navigation/i,
    });
    expect(nav).toBeDefined();
  });
});
