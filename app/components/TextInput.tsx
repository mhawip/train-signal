"use client";

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}

/**
 * Accessible text input with label, optional hint, and error state.
 *
 * - Label associated via htmlFor/id (never placeholder-only).
 * - Error text announced via aria-live="polite" and linked via aria-describedby.
 * - Uses aria-required rather than the native required attribute to avoid
 *   premature browser validation popups.
 * - Minimum target height of 44px (--target-min) per WCAG 2.5.5.
 */
export function TextInput({
  id,
  label,
  value,
  onChange,
  error,
  required,
  hint,
  placeholder,
}: TextInputProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  // Build aria-describedby from hint and error ids when present
  const describedBy =
    [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="ts-field">
      <label htmlFor={id} className="ts-field__label">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="ts-field__hint">
          {hint}
        </p>
      )}
      <input
        id={id}
        type="text"
        className={`ts-field__input${error ? " ts-field__input--error" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
      />
      <p
        id={errorId}
        className="ts-field__error"
        aria-live="polite"
      >
        {error ?? ""}
      </p>
    </div>
  );
}
