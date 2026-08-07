"use client";

interface ComboboxProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
}

/**
 * Station search combobox using native <input> + <datalist>.
 *
 * This is the simplest accessible pattern for autocomplete: it is
 * keyboard-accessible and works without JavaScript for the matching.
 * The browser provides arrow-key navigation of suggestions natively.
 *
 * In Phase 1 (P1-04) this will be replaced with a real async combobox
 * that fetches station suggestions from the server. For now we prove
 * the accessible pattern with a static option list.
 */
export function Combobox({
  id,
  label,
  value,
  onChange,
  options,
  error,
  required,
}: ComboboxProps) {
  const listId = `${id}-list`;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="ts-field">
      <label htmlFor={id} className="ts-field__label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        list={listId}
        className={`ts-field__input${error ? " ts-field__input--error" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </datalist>
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
