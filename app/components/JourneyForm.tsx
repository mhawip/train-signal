"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StationCombobox } from "./StationCombobox";
import { RadioGroup } from "./RadioGroup";
import { Button } from "./Button";
import {
  parseJourneyParams,
  buildResultsUrl,
  getTodayISO,
  getMaxDateISO,
  NETWORKS,
  isValidNetwork,
} from "@/app/lib/journey-params";

interface FormErrors {
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  network?: string;
}

const NETWORK_OPTIONS = NETWORKS.map((n) => ({
  value: n,
  label: n,
}));

/**
 * Journey search form -- the landing page entry point.
 *
 * Five fields: origin station, destination station, date, time, network.
 * On submit, navigates to /results with all fields encoded as URL search params.
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
    setErrors((prev) => ({ ...prev, network: undefined }));
  }, []);

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

    if (!network || !isValidNetwork(network)) {
      errs.network = "Choose your mobile network.";
    }

    return errs;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);

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

    const url = buildResultsUrl({
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
    network: "network-ee",
  };

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

      <StationCombobox
        id="from-station"
        label="Origin station"
        value={fromCRS}
        onChange={handleFromChange}
        error={errors.from}
        required
        hint="Type a station name or code"
      />

      <StationCombobox
        id="to-station"
        label="Destination station"
        value={toCRS}
        onChange={handleToChange}
        error={errors.to}
        required
        hint="Type a station name or code"
      />

      <fieldset className="ts-field ts-datetime">
        <legend className="ts-field__label">Date and time</legend>
        <div className="ts-datetime__inputs">
          <div className="ts-datetime__group">
            <label htmlFor="journey-date" className="ts-visually-hidden">
              Date
            </label>
            <input
              id="journey-date"
              type="date"
              className={`ts-field__input${
                errors.date ? " ts-field__input--error" : ""
              }`}
              value={date}
              onChange={handleDateChange}
              min={todayISO}
              max={maxDateISO}
              aria-required
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
              aria-required
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

      <RadioGroup
        legend="Mobile network"
        name="network"
        options={NETWORK_OPTIONS}
        value={network}
        onChange={handleNetworkChange}
        error={errors.network}
      />

      <div className="ts-form__actions">
        <Button type="submit" variant="primary">
          Find signal
        </Button>
      </div>
    </form>
  );
}
