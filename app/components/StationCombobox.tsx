"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Station } from "@/app/lib/stations";

interface StationComboboxProps {
  id: string;
  label: string;
  value: string;
  onChange: (crs: string, name: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
}

/**
 * Accessible station search combobox implementing the ARIA combobox pattern.
 *
 * Fetches station suggestions from /api/stations?q= as the user types,
 * keeping the 332 KB station dataset out of the client bundle. Requests
 * are debounced at 300ms to avoid excessive network calls on slow
 * train connections.
 *
 * ARIA pattern:
 * - role="combobox" on the input, with aria-expanded, aria-controls,
 *   aria-autocomplete="list", and aria-activedescendant
 * - role="listbox" on the suggestion list
 * - role="option" on each suggestion item
 *
 * Keyboard:
 * - Arrow Down/Up: navigate suggestions
 * - Enter: select the highlighted suggestion
 * - Escape: close the suggestion list
 * - Tab: close and move focus forward (no trap)
 *
 * On blur, if the typed text matches exactly one station (by name or CRS),
 * it is accepted. Otherwise an error is shown by the parent.
 */
export function StationCombobox({
  id,
  label,
  value,
  onChange,
  error,
  required,
  hint,
}: StationComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Station[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the latest fetch to ignore stale responses
  const fetchIdRef = useRef(0);

  const listboxId = `${id}-listbox`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const statusId = `${id}-status`;

  // Build aria-describedby from hint and error
  const describedByParts: string[] = [];
  if (hintId) describedByParts.push(hintId);
  if (error) describedByParts.push(errorId);
  const describedBy = describedByParts.length > 0
    ? describedByParts.join(" ")
    : undefined;

  // Sync display value from the CRS prop (for URL pre-fill)
  useEffect(() => {
    if (value && !inputValue) {
      fetchStationByCRS(value).then((station) => {
        if (station) {
          setInputValue(`${station.name} (${station.crs})`);
        }
      });
    }
  // Only run when value changes from outside, not on every inputValue change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const updateSuggestions = useCallback((query: string) => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      setStatusMessage("");
      return;
    }

    // Debounce API calls to avoid hammering the server on every keystroke
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setStatusMessage("Searching\u2026");

    debounceRef.current = setTimeout(() => {
      const currentFetchId = ++fetchIdRef.current;

      fetch(`/api/stations?q=${encodeURIComponent(query)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Station search failed");
          return res.json() as Promise<Station[]>;
        })
        .then((results) => {
          // Ignore stale responses from earlier queries
          if (currentFetchId !== fetchIdRef.current) return;

          setSuggestions(results);
          setIsOpen(results.length > 0);
          setActiveIndex(-1);

          // Announce result count for screen readers
          if (results.length === 0) {
            setStatusMessage("No stations found.");
          } else if (results.length === 1) {
            setStatusMessage(`1 station found: ${results[0].name}.`);
          } else {
            setStatusMessage(
              `${results.length} stations found. Use arrow keys to choose.`
            );
          }
        })
        .catch(() => {
          // On fetch failure, show no suggestions -- user can try again
          if (currentFetchId !== fetchIdRef.current) return;
          setSuggestions([]);
          setIsOpen(false);
          setStatusMessage("");
        });
    }, 300);
  }, []);

  const selectStation = useCallback(
    (station: Station) => {
      setInputValue(`${station.name} (${station.crs})`);
      onChange(station.crs, station.name);
      setIsOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);
      setStatusMessage(`${station.name} selected.`);
    },
    [onChange]
  );

  const closeSuggestions = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Clear the selected CRS if the user is typing something new
    onChange("", "");
    updateSuggestions(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      // If the user presses Down on a non-empty input with no open list,
      // re-trigger the search
      if (e.key === "ArrowDown" && inputValue.trim().length > 0) {
        e.preventDefault();
        updateSuggestions(inputValue);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const nextIndex =
          activeIndex < suggestions.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(nextIndex);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prevIndex =
          activeIndex > 0 ? activeIndex - 1 : suggestions.length - 1;
        setActiveIndex(prevIndex);
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          selectStation(suggestions[activeIndex]);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        closeSuggestions();
        break;
      }
      // Tab: let it move focus naturally (no keyboard trap per 2.1.2)
    }
  };

  /**
   * On blur, attempt to resolve the typed value to a station.
   * If it matches a CRS code exactly, or a single station by name, accept it.
   * This allows users to type "KGX" and tab away without picking from the list.
   */
  const handleBlur = () => {
    // Delay to allow click on suggestion to fire first
    setTimeout(() => {
      closeSuggestions();

      const trimmed = inputValue.trim();
      if (!trimmed) return;

      // Already selected? Nothing to resolve.
      if (value) return;

      // Try CRS lookup via API
      fetchStationByCRS(trimmed).then((crsStation) => {
        if (crsStation) {
          selectStation(crsStation);
          return;
        }

        // Try name match via search API
        fetch(`/api/stations?q=${encodeURIComponent(trimmed)}`)
          .then((res) => res.ok ? res.json() as Promise<Station[]> : [])
          .then((results) => {
            if (
              results.length === 1 &&
              results[0].name.toLowerCase() === trimmed.toLowerCase()
            ) {
              selectStation(results[0]);
            }
          })
          .catch(() => {
            // Silently fail -- user can re-try
          });
      });
    }, 200);
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const activeOptionId =
    activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  return (
    <div className="ts-field ts-combobox">
      <label htmlFor={id} className="ts-field__label">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="ts-field__hint">
          {hint}
        </p>
      )}
      <div className="ts-combobox__wrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`ts-field__input${error ? " ts-field__input--error" : ""}`}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoComplete="off"
        />
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="ts-combobox__listbox"
          hidden={!isOpen}
        >
          {suggestions.map((station, index) => (
            <div
              key={station.crs}
              id={`${id}-option-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              className={`ts-combobox__option${
                index === activeIndex ? " ts-combobox__option--active" : ""
              }`}
              onMouseDown={(e) => {
                // Prevent blur from firing before selection
                e.preventDefault();
                selectStation(station);
                inputRef.current?.focus();
              }}
            >
              <span className="ts-combobox__option-name">{station.name}</span>
              <span className="ts-combobox__option-crs">{station.crs}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Status announcements for screen readers */}
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="ts-visually-hidden"
      >
        {statusMessage}
      </div>
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

/**
 * Fetch a single station by CRS code from the API.
 * Returns null if the station is not found or the request fails.
 */
async function fetchStationByCRS(crs: string): Promise<Station | null> {
  try {
    const res = await fetch(`/api/stations/${encodeURIComponent(crs)}`);
    if (!res.ok) return null;
    return (await res.json()) as Station;
  } catch {
    return null;
  }
}
