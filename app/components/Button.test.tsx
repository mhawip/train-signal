import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a native button element with the given text", () => {
    render(<Button>Search for signal</Button>);

    const button = screen.getByRole("button", { name: "Search for signal" });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });

  it("defaults to type=button", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("accepts type=submit", () => {
    render(<Button type="submit">Search for signal</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Search for signal</Button>);

    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("sets aria-disabled instead of disabled attribute when disabled", () => {
    render(<Button disabled>Search for signal</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-disabled", "true");
    // Must NOT use the native disabled attribute (removes from tab order)
    expect(button).not.toHaveAttribute("disabled");
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Search for signal
      </Button>
    );

    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies the primary variant class by default", () => {
    render(<Button>Search for signal</Button>);

    const button = screen.getByRole("button");
    expect(button.className).toContain("ts-button--primary");
  });

  it("applies the secondary variant class when specified", () => {
    render(<Button variant="secondary">Back</Button>);

    const button = screen.getByRole("button");
    expect(button.className).toContain("ts-button--secondary");
  });
});
