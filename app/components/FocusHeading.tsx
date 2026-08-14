"use client";

import { useEffect, useRef } from "react";

/**
 * A heading that receives programmatic focus on mount.
 *
 * Used on pages that load in response to a user action (e.g. form
 * submission) to orient screen reader users immediately. The visual
 * focus ring is suppressed via :focus:not(:focus-visible) in CSS --
 * only keyboard-initiated focus shows the ring.
 *
 * The element uses tabindex="-1" so it can receive programmatic focus
 * but does not appear in the natural Tab order.
 */
export function FocusHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <h1 ref={ref} className={className} tabIndex={-1}>
      {children}
    </h1>
  );
}
