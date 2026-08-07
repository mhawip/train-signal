"use client";

interface DateTimeInputProps {
  id: string;
  label: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  error?: string;
  minDate?: string;
  maxDate?: string;
}

/**
 * Grouped date and time inputs using native <input type="date"> and
 * <input type="time">.
 *
 * - Wrapped in <fieldset> + <legend> for the group label (1.3.1).
 * - Each sub-input has its own visually-hidden <label>.
 * - Error associated to the group via aria-describedby on the fieldset.
 * - Both inputs meet the 44px minimum target size (2.5.5).
 */
export function DateTimeInput({
  id,
  label,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  error,
  minDate,
  maxDate,
}: DateTimeInputProps) {
  const dateId = `${id}-date`;
  const timeId = `${id}-time`;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <fieldset
      className="ts-field ts-datetime"
      aria-describedby={errorId}
    >
      <legend className="ts-field__label">{label}</legend>
      <div className="ts-datetime__inputs">
        <div className="ts-datetime__group">
          <label htmlFor={dateId} className="ts-visually-hidden">
            Date
          </label>
          <input
            id={dateId}
            type="date"
            className={`ts-field__input${error ? " ts-field__input--error" : ""}`}
            value={dateValue}
            onChange={(e) => onDateChange(e.target.value)}
            min={minDate}
            max={maxDate}
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="ts-datetime__group">
          <label htmlFor={timeId} className="ts-visually-hidden">
            Time
          </label>
          <input
            id={timeId}
            type="time"
            className={`ts-field__input${error ? " ts-field__input--error" : ""}`}
            value={timeValue}
            onChange={(e) => onTimeChange(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </div>
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
