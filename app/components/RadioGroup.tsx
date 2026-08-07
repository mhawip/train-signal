"use client";

interface RadioGroupProps {
  legend: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Radio button group using native <fieldset> + <legend>.
 *
 * - Each <input type="radio"> has an associated <label>.
 * - The label extends the tap target to meet the 44x44px minimum (2.5.5).
 * - Arrow key navigation between radios is native browser behaviour.
 * - Error announced via aria-live and linked via aria-describedby.
 */
export function RadioGroup({
  legend,
  name,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <fieldset
      className="ts-field ts-radiogroup"
      aria-describedby={errorId}
    >
      <legend className="ts-field__label">{legend}</legend>
      <div className="ts-radiogroup__options">
        {options.map((opt) => {
          const optionId = `${name}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={optionId}
              className="ts-radiogroup__label"
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="ts-radiogroup__input"
              />
              <span className="ts-radiogroup__text">{opt.label}</span>
            </label>
          );
        })}
      </div>
      <p
        id={errorId}
        className="ts-field__error"
        aria-live="polite"
      >
        {error ?? ""}
      </p>
    </fieldset>
  );
}
