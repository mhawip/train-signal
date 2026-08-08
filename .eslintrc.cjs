/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/strict",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "jsx-a11y"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_" },
    ],

    /*
     * Allow tabIndex={0} on elements with role="region".
     *
     * Justification (DW-01, confirmed by accessibility-specialist):
     *
     * The journey details table wrapper uses role="region" + aria-label +
     * tabIndex={0} so keyboard users can scroll the table horizontally at
     * narrow viewports (320px / 400% zoom). Without tabIndex={0}, keyboard
     * users have no way to scroll the overflow content.
     *
     * This is the correct WCAG approach, supported by:
     *   - WCAG Technique SCR37 (Creating Custom Dialogs in a Device
     *     Independent Way) — establishes the general principle that
     *     keyboard-scrollable containers need tabindex.
     *   - WAI-ARIA Authoring Practices Guide — explicitly permits tabIndex
     *     on landmark roles (region is a landmark role) when the landmark
     *     contains scrollable content.
     *   - WCAG 1.4.10 Reflow — data tables are exempt from the no-horizontal-
     *     scroll requirement, but the scrollable container must still be
     *     keyboard-operable.
     *
     * The jsx-a11y/no-noninteractive-tabindex rule is overly strict here
     * because role="region" is a landmark role with interactive semantics
     * in this context (scrollable container). The rule does not distinguish
     * between non-interactive elements and landmark roles used as scrollable
     * containers.
     *
     * See: specs/accessibility.md section 7.4
     */
    "jsx-a11y/no-noninteractive-tabindex": [
      "error",
      {
        tags: [],
        roles: ["region"],
        allowExpressionValues: true,
      },
    ],
  },
};
