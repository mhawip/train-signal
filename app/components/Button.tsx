"use client";

import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

/**
 * Accessible button using native <button>.
 *
 * - Uses aria-disabled instead of the disabled attribute to keep the
 *   button in the tab order when disabled (so users can discover it).
 * - Minimum 44x44px target size per WCAG 2.5.5.
 * - Primary variant: filled background. Secondary: outline style.
 */
export function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
}: ButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.();
  };

  return (
    <button
      type={type}
      className={`ts-button ts-button--${variant}`}
      onClick={handleClick}
      aria-disabled={disabled || undefined}
    >
      {children}
    </button>
  );
}
