"use client";

import { useState } from "react";
import { TextInput } from "../components/TextInput";
import { Combobox } from "../components/Combobox";
import { DateTimeInput } from "../components/DateTimeInput";
import { RadioGroup } from "../components/RadioGroup";
import { Button } from "../components/Button";

const stationOptions = [
  { value: "Leeds", label: "Leeds" },
  { value: "London King's Cross", label: "London King's Cross" },
  { value: "York", label: "York" },
  { value: "Doncaster", label: "Doncaster" },
  { value: "Peterborough", label: "Peterborough" },
];

const networkOptions = [
  { value: "ee", label: "EE" },
  { value: "o2", label: "O2" },
  { value: "vodafone", label: "Vodafone" },
  { value: "three", label: "Three" },
];

/**
 * Demo page that renders all component primitives in various states.
 * Used by the Playwright axe-core test (e2e/components.spec.ts) to
 * verify WCAG AAA compliance on every component.
 */
export default function ComponentsDemo() {
  const [textValue, setTextValue] = useState("");
  const [textErrorValue, setTextErrorValue] = useState("");
  const [comboValue, setComboValue] = useState("");
  const [comboErrorValue, setComboErrorValue] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("14:30");
  const [dateErrorDateValue, setDateErrorDateValue] = useState("");
  const [dateErrorTimeValue, setDateErrorTimeValue] = useState("");
  const [network, setNetwork] = useState("");
  const [networkError, setNetworkError] = useState("vodafone");

  return (
    <main>
      <h1>Component primitives</h1>
      <p>
        This page shows every component primitive in its key states, for
        accessibility testing.
      </p>

      <h2>TextInput</h2>

      <h3>Empty</h3>
      <TextInput
        id="text-empty"
        label="Origin station"
        value={textValue}
        onChange={setTextValue}
        hint="Type the name of the station you are leaving from"
      />

      <h3>With value</h3>
      <TextInput
        id="text-filled"
        label="Origin station"
        value="Leeds"
        onChange={() => {}}
      />

      <h3>With error</h3>
      <TextInput
        id="text-error"
        label="Origin station"
        value={textErrorValue}
        onChange={setTextErrorValue}
        error="Enter an origin station."
        required
      />

      <h2>Combobox</h2>

      <h3>With options</h3>
      <Combobox
        id="combo-normal"
        label="Destination station"
        value={comboValue}
        onChange={setComboValue}
        options={stationOptions}
      />

      <h3>With error</h3>
      <Combobox
        id="combo-error"
        label="Destination station"
        value={comboErrorValue}
        onChange={setComboErrorValue}
        options={stationOptions}
        error="Enter a destination station."
        required
      />

      <h2>DateTimeInput</h2>

      <h3>Empty</h3>
      <DateTimeInput
        id="dt-empty"
        label="When are you travelling?"
        dateValue={dateValue}
        timeValue={timeValue}
        onDateChange={setDateValue}
        onTimeChange={setTimeValue}
        minDate="2026-07-01"
        maxDate="2026-09-30"
      />

      <h3>With error</h3>
      <DateTimeInput
        id="dt-error"
        label="When are you travelling?"
        dateValue={dateErrorDateValue}
        timeValue={dateErrorTimeValue}
        onDateChange={setDateErrorDateValue}
        onTimeChange={setDateErrorTimeValue}
        error="Choose a date within the next 8 weeks."
      />

      <h2>RadioGroup</h2>

      <h3>No selection</h3>
      <RadioGroup
        legend="Mobile network"
        name="network-none"
        options={networkOptions}
        value={network}
        onChange={setNetwork}
      />

      <h3>With selection</h3>
      <RadioGroup
        legend="Mobile network"
        name="network-selected"
        options={networkOptions}
        value={networkError}
        onChange={setNetworkError}
      />

      <h3>With error</h3>
      <RadioGroup
        legend="Mobile network"
        name="network-error"
        options={networkOptions}
        value=""
        onChange={() => {}}
        error="Choose a mobile network."
      />

      <h2>Button</h2>

      <h3>Primary</h3>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Button type="submit">Search for signal</Button>
      </div>

      <h3>Secondary</h3>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Button variant="secondary">Plan a new journey</Button>
      </div>

      <h3>Disabled</h3>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Button disabled>Search for signal</Button>
      </div>
    </main>
  );
}
