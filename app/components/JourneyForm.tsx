"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StationCombobox } from "./StationCombobox";
import { RadioGroup } from "./RadioGroup";
import { Button } from "./Button";
import {
  parseJourneyParams,
  buildDeparturesUrl,
  getTodayISO,
  getMaxDateISO,
  NETWORKS,
} from "@/app/lib/journey-params";

interface FormErrors {
  from?: string;
  to?: string;
  date?: string;
  time?: string;
}

const NETWORK_OPTIONS = NETWORKS.map((n) => ({
  value: n,
  label: n,
}));

/**
 * Journey search form -- the landing page entry point.
 *
 * Three always-visible fields: origin station, destination station, network.
 * Date and time fields are hidden behind a disclosure toggle, revealed on
 * demand. Without JavaScript, the full form is visible and functional
 * (progressive enhancement per specs/design-system.md section 10).
 *
 * Pre-fills from URL search params on page load so bookmarked/shared URLs
 * restore the form state (WCAG 3.3.6: error prevention via reversibility;
 * 3.3.7: no redundant entry).
 */
export function JourneyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayISO = getTodayISO();
  const maxDateISO = getMaxDateISO();

  // Initialise form state from URL params
  const initial = parseJourneyParams(searchParams);

  const [fromCRS, setFromCRS] = useState(initial.from);
  const [toCRS, setToCRS] = useState(initial.to);
  const [date, setDate] = useState(initial.date || todayISO);
  const [time, setTime] = useState(initial.time);
  const [network, setNetwork] = useState(initial.network);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Progressive enhancement: fields start visible (server render / no-JS).
  // After hydration, JS collapses them unless mode=timed is in the URL.
  const [isRevealed, setIsRevealed] = useState(true);

  // Whether JS has enhanced the form (toggle button is shown, fields
  // are managed). Starts false so the server render shows all fields
  // and hides the toggle button.
  const [isEnhanced, setIsEnhanced] = useState(false);

  // Prompt shown when submit is pressed without date/time revealed.
  // Announced via aria-live="polite" (4.1.3).
  const [showPrompt, setShowPrompt] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const networkToggleButtonRef = useRef<HTMLButtonElement>(null);

  // Whether the network accordion is open. Mirrors isRevealed/isEnhanced pattern.
  const [isNetworkRevealed, setIsNetworkRevealed] = useState(true);

  // Progressive enhancement setup: runs once after hydration.
  // Collapses accordions unless the relevant URL params are present.
  useEffect(() => {
    setIsEnhanced(true);
    const hasTimed = searchParams.get("mode") === "timed";
    if (!hasTimed) {
      setIsRevealed(false);
    }
    const hasNetwork = !!searchParams.get("network");
    if (!hasNetwork) {
      setIsNetworkRevealed(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFromChange = useCallback((crs: string, _name: string) => {
    setFromCRS(crs);
    setErrors((prev) => ({ ...prev, from: undefined }));
  }, []);

  const handleToChange = useCallback((crs: string, _name: string) => {
    setToCRS(crs);
    setErrors((prev) => ({ ...prev, to: undefined }));
  }, []);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDate(e.target.value);
      setErrors((prev) => ({ ...prev, date: undefined }));
      setShowPrompt(false);
    },
    []
  );

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTime(e.target.value);
      setErrors((prev) => ({ ...prev, time: undefined }));
    },
    []
  );

  const handleNetworkChange = useCallback((value: string) => {
    setNetwork(value);
  }, []);

  const revealNetwork = useCallback(() => {
    setIsNetworkRevealed(true);
    requestAnimationFrame(() => {
      document.getElementById(`network-${NETWORK_OPTIONS[0].value}`)?.focus();
    });
  }, []);

  const collapseNetwork = useCallback(() => {
    setIsNetworkRevealed(false);
    requestAnimationFrame(() => {
      networkToggleButtonRef.current?.focus();
    });
  }, []);

  const handleNetworkToggle = useCallback(() => {
    if (isNetworkRevealed) {
      collapseNetwork();
    } else {
      revealNetwork();
    }
  }, [isNetworkRevealed, revealNetwork, collapseNetwork]);

  /**
   * Update the URL to reflect disclosure state via history.replaceState.
   * Uses replaceState (not pushState) so toggling does not add
   * history entries -- pressing Back goes to the previous page,
   * not through toggle states (specs/design-system.md section 10).
   */
  const updateUrlMode = useCallback(
    (timed: boolean) => {
      const url = new URL(window.location.href);
      if (timed) {
        url.searchParams.set("mode", "timed");
      } else {
        url.searchParams.delete("mode");
      }
      window.history.replaceState({}, "", url.toString());
    },
    []
  );

  /**
   * Reveal the date/time fields: remove hidden, update aria-expanded,
   * add required back, move focus to the date input.
   */
  const reveal = useCallback(() => {
    setIsRevealed(true);
    updateUrlMode(true);
    // Focus the date input after React renders the revealed fields
    requestAnimationFrame(() => {
      dateInputRef.current?.focus();
    });
  }, [updateUrlMode]);

  /**
   * Collapse the date/time fields: add hidden, update aria-expanded,
   * remove required, clear date/time errors, move focus to toggle button.
   */
  const collapse = useCallback(() => {
    setIsRevealed(false);
    setShowPrompt(false);
    setErrors((prev) => ({ ...prev, date: undefined, time: undefined }));
    updateUrlMode(false);
    // Return focus to the toggle button
    requestAnimationFrame(() => {
      toggleButtonRef.current?.focus();
    });
  }, [updateUrlMode]);

  const handleToggle = useCallback(() => {
    if (isRevealed) {
      collapse();
    } else {
      reveal();
    }
  }, [isRevealed, reveal, collapse]);

  const validate = (): FormErrors => {
    const errs: FormErrors = {};

    if (!fromCRS) {
      errs.from = "Enter an origin station.";
    }

    if (!toCRS) {
      errs.to = "Enter a destination station.";
    }

    if (fromCRS && toCRS && fromCRS === toCRS) {
      errs.to = "The destination must be different from the origin.";
    }

    // Only validate date/time if the fields are revealed (11.5).
    // Validating invisible fields would be a 3.3.1 violation.
    if (isRevealed) {
      if (!date) {
        errs.date = "Choose a date for your journey.";
      } else if (date < todayISO) {
        errs.date = "Choose a date from today onwards.";
      } else if (date > maxDateISO) {
        errs.date = "We can only search up to 8 weeks ahead.";
      }

      if (!time) {
        errs.time = "Enter a departure time.";
      }
    }

    return errs;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);

    // If date/time fields are not yet revealed, reveal them and prompt
    // the user rather than navigating (11.9). Until route-overview mode
    // is built, the form cannot produce results without a time.
    if (!isRevealed) {
      setShowPrompt(true);
      reveal();
      return;
    }

    const errs = validate();
    setErrors(errs);

    const hasErrors = Object.values(errs).some(Boolean);
    if (hasErrors) {
      // Move focus to the error summary for screen readers
      const summary = document.getElementById("error-summary");
      if (summary) {
        summary.focus();
      }
      return;
    }

    const url = buildDeparturesUrl({
      from: fromCRS,
      to: toCRS,
      date,
      time,
      network,
    });
    router.push(url);
  };

  const errorList = Object.entries(errors).filter(
    ([, msg]) => msg !== undefined
  );
  const hasErrors = errorList.length > 0;

  // Map field keys to the input IDs for error summary links
  const fieldIds: Record<string, string> = {
    from: "from-station",
    to: "to-station",
    date: "journey-date",
    time: "journey-time",
  };

  // The hidden attribute controls visibility and tab order.
  // When isEnhanced is false (server render / no-JS), the toggle buttons
  // are hidden and all fields are visible. After JS enhances, toggle buttons
  // are shown and fields are controlled by isRevealed / isNetworkRevealed.
  const datetimeHidden = isEnhanced ? !isRevealed : false;
  const toggleHidden = !isEnhanced;
  const networkHidden = isEnhanced ? !isNetworkRevealed : false;
  const networkToggleHidden = !isEnhanced;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Error summary at the top (3.3.1) */}
      {hasErrors && submitted && (
        <div
          id="error-summary"
          role="alert"
          tabIndex={-1}
          className="ts-error-summary"
        >
          <h2 className="ts-error-summary__heading">
            There is a problem
          </h2>
          <ul className="ts-error-summary__list">
            {errorList.map(([key, msg]) => (
              <li key={key}>
                <a href={`#${fieldIds[key]}`}>{msg}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Origin station combobox */}
      <StationCombobox
        id="from-station"
        label="Origin station"
        value={fromCRS}
        onChange={handleFromChange}
        error={errors.from}
        required
        hint="Type a station name or code"
      />

      {/* 2. Destination station combobox */}
      <StationCombobox
        id="to-station"
        label="Destination station"
        value={toCRS}
        onChange={handleToChange}
        error={errors.to}
        required
        hint="Type a station name or code"
      />

      {/* 3. Mobile network accordion -- same pattern as date/time.
       * Hidden in server HTML; revealed by JS. When no network is
       * selected, the results page uses worst-case across all operators. */}
      <button
        ref={networkToggleButtonRef}
        type="button"
        className="ts-accordion__header"
        aria-expanded={isNetworkRevealed ? "true" : "false"}
        aria-controls="network-fields"
        hidden={networkToggleHidden}
        onClick={handleNetworkToggle}
      >
        <span className="ts-accordion__title">
          {!isNetworkRevealed && network
            ? `Mobile network: ${network}`
            : "Choose your mobile network"}
        </span>
        <span className="ts-accordion__chevron" aria-hidden="true">
          {isNetworkRevealed ? "\u25B4" : "\u25BE"}
        </span>
      </button>

      <div id="network-fields" className="ts-accordion__panel" hidden={networkHidden}>
        <RadioGroup
          legend="Mobile network"
          name="network"
          options={NETWORK_OPTIONS}
          value={network}
          onChange={handleNetworkChange}
        />
      </div>

      {/* 4. Accordion toggle -- hidden in server HTML, revealed by JS.
       * Uses aria-expanded + aria-controls per specs/accessibility.md 11.2.
       * The hidden attribute (not CSS display:none) removes it from
       * the tab order and accessibility tree when not enhanced. */}
      <button
        ref={toggleButtonRef}
        type="button"
        className="ts-accordion__header"
        aria-expanded={isRevealed ? "true" : "false"}
        aria-controls="datetime-fields"
        hidden={toggleHidden}
        onClick={handleToggle}
      >
        <span className="ts-accordion__title">
          Find a specific train journey
        </span>
        <span className="ts-accordion__chevron" aria-hidden="true">
          {isRevealed ? "\u25B4" : "\u25BE"}
        </span>
      </button>

      {/* 5-6. Date and time fields -- visible in server HTML, hidden
       * by JS on load (progressive enhancement per 11.4).
       * The hidden attribute genuinely removes fields from tab order
       * and the accessibility tree (2.1.1). */}
      <div id="datetime-fields" className="ts-accordion__panel" hidden={datetimeHidden}>
        {/* Prompt: announced via aria-live when submit triggers
         * auto-reveal (11.9). Cleared when the user interacts
         * with the date field. */}
        <p
          className="ts-disclosure-prompt"
          aria-live="polite"
        >
          {showPrompt ? "Enter a date and time to search for trains." : ""}
        </p>
        <fieldset className="ts-field ts-datetime">
          <legend className="ts-field__label">Date and time</legend>
          <div className="ts-datetime__inputs">
            <div className="ts-datetime__group">
              <label htmlFor="journey-date" className="ts-visually-hidden">
                Date
              </label>
              <input
                ref={dateInputRef}
                id="journey-date"
                type="date"
                className={`ts-field__input${
                  errors.date ? " ts-field__input--error" : ""
                }`}
                value={date}
                onChange={handleDateChange}
                min={todayISO}
                max={maxDateISO}
                aria-required={isRevealed || !isEnhanced ? true : undefined}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby="date-hint date-error"
              />
            </div>
            <div className="ts-datetime__group">
              <label htmlFor="journey-time" className="ts-visually-hidden">
                Time
              </label>
              <input
                id="journey-time"
                type="time"
                className={`ts-field__input${
                  errors.time ? " ts-field__input--error" : ""
                }`}
                value={time}
                onChange={handleTimeChange}
                aria-required={isRevealed || !isEnhanced ? true : undefined}
                aria-invalid={errors.time ? true : undefined}
                aria-describedby="time-error"
              />
            </div>
          </div>
          <p id="date-hint" className="ts-field__hint">
            You can search up to 8 weeks ahead.
          </p>
          <p id="date-error" className="ts-field__error" aria-live="polite">
            {errors.date ?? ""}
          </p>
          <p id="time-error" className="ts-field__error" aria-live="polite">
            {errors.time ?? ""}
          </p>
        </fieldset>
      </div>

      {/* 7. Submit button */}
      <div className="ts-form__actions">
        <Button type="submit" variant="primary">
          Find signal
        </Button>
      </div>
    </form>
  );
}
