import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  JourneyTimeline,
  parseTimeToMinutes,
  elapsedMinutes,
  formatDuration,
} from "./JourneyTimeline";
import type { Journey } from "@/app/lib/journey-types";

const fixtureJourney: Journey = {
  origin: {
    crs: "LDS",
    name: "Leeds",
    scheduledArrival: null,
    scheduledDeparture: "14:12",
  },
  destination: {
    crs: "KGX",
    name: "London Kings Cross",
    scheduledArrival: "16:27",
    scheduledDeparture: null,
  },
  callingPoints: [
    {
      crs: "LDS",
      name: "Leeds",
      scheduledArrival: null,
      scheduledDeparture: "14:12",
    },
    {
      crs: "WKF",
      name: "Wakefield Westgate",
      scheduledArrival: "14:25",
      scheduledDeparture: "14:27",
    },
    {
      crs: "DON",
      name: "Doncaster",
      scheduledArrival: "14:44",
      scheduledDeparture: "14:46",
    },
    {
      crs: "KGX",
      name: "London Kings Cross",
      scheduledArrival: "16:27",
      scheduledDeparture: null,
    },
  ],
  network: "EE",
  date: "2026-07-14",
};

describe("parseTimeToMinutes", () => {
  it("converts HH:MM to total minutes", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("14:12")).toBe(852);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });
});

describe("elapsedMinutes", () => {
  it("calculates elapsed time between two times on the same day", () => {
    expect(elapsedMinutes("14:12", "16:27")).toBe(135);
  });

  it("handles midnight crossing correctly", () => {
    // Origin departs 23:45, next stop arrives 00:20 = 35 minutes
    expect(elapsedMinutes("23:45", "00:20")).toBe(35);
  });

  it("handles midnight crossing where arrival is well past midnight", () => {
    // Departs 23:00, arrives 01:30 = 150 minutes (2 hr 30 min)
    expect(elapsedMinutes("23:00", "01:30")).toBe(150);
  });

  it("returns 0 when both times are the same", () => {
    expect(elapsedMinutes("14:00", "14:00")).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats minutes under an hour", () => {
    expect(formatDuration(45)).toBe("45 min");
  });

  it("formats exact hours", () => {
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(120)).toBe("2 hr");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(135)).toBe("2 hr 15 min");
    expect(formatDuration(75)).toBe("1 hr 15 min");
  });

  it("formats zero minutes", () => {
    expect(formatDuration(0)).toBe("0 min");
  });
});

describe("JourneyTimeline", () => {
  it("renders the correct number of rows", () => {
    render(<JourneyTimeline journey={fixtureJourney} />);

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // 1 header row + 4 body rows + 1 footer row = 6
    expect(rows).toHaveLength(6);
  });

  it("shows en dash for origin arrival", () => {
    render(<JourneyTimeline journey={fixtureJourney} />);

    // Origin row: Leeds
    const originRow = screen.getByRole("row", { name: /Leeds/i });
    const cells = within(originRow).getAllByRole("cell");
    // First cell after the row header is Arrives
    expect(cells[0]).toHaveTextContent("\u2013");
  });

  it("shows en dash for terminus departure", () => {
    render(<JourneyTimeline journey={fixtureJourney} />);

    const terminusRow = screen.getByRole("row", {
      name: /London Kings Cross/i,
    });
    const cells = within(terminusRow).getAllByRole("cell");
    // Second cell (Departs) should be en dash
    expect(cells[1]).toHaveTextContent("\u2013");
  });

  it("calculates journey times correctly", () => {
    render(<JourneyTimeline journey={fixtureJourney} />);

    // Wakefield Westgate: arrives 14:25, origin departs 14:12 = 13 min
    const wakefieldRow = screen.getByRole("row", {
      name: /Wakefield Westgate/i,
    });
    const wakefieldCells = within(wakefieldRow).getAllByRole("cell");
    expect(wakefieldCells[2]).toHaveTextContent("13 min");

    // Doncaster: arrives 14:44, origin departs 14:12 = 32 min
    const doncasterRow = screen.getByRole("row", { name: /Doncaster/i });
    const doncasterCells = within(doncasterRow).getAllByRole("cell");
    expect(doncasterCells[2]).toHaveTextContent("32 min");

    // London Kings Cross: arrives 16:27, origin departs 14:12 = 135 min = 2 hr 15 min
    const kgxRow = screen.getByRole("row", { name: /London Kings Cross/i });
    const kgxCells = within(kgxRow).getAllByRole("cell");
    expect(kgxCells[2]).toHaveTextContent("2 hr 15 min");
  });

  it("shows en dash for origin journey time", () => {
    render(<JourneyTimeline journey={fixtureJourney} />);

    const originRow = screen.getByRole("row", { name: /Leeds/i });
    const cells = within(originRow).getAllByRole("cell");
    // Journey time (third cell) should be en dash for origin
    expect(cells[2]).toHaveTextContent("\u2013");
  });

  it("shows total duration in the footer", () => {
    render(<JourneyTimeline journey={fixtureJourney} />);

    const table = screen.getByRole("table");
    // The footer row contains "Total" and the duration
    const footerCells = within(table).getAllByRole("cell");
    const lastCell = footerCells[footerCells.length - 1];
    expect(lastCell).toHaveTextContent("2 hr 15 min");
  });

  it("includes origin and destination in the caption", () => {
    render(<JourneyTimeline journey={fixtureJourney} />);

    const caption = screen.getByText(/Leeds to London Kings Cross/);
    expect(caption).toBeInTheDocument();
    expect(caption.tagName).toBe("CAPTION");
  });

  it("includes the date in the caption", () => {
    render(<JourneyTimeline journey={fixtureJourney} />);

    const caption = screen.getByText(/14 July 2026/);
    expect(caption).toBeInTheDocument();
  });

  it("handles midnight crossing in journey times", () => {
    const midnightJourney: Journey = {
      origin: {
        crs: "AAA",
        name: "Station A",
        scheduledArrival: null,
        scheduledDeparture: "23:45",
      },
      destination: {
        crs: "CCC",
        name: "Station C",
        scheduledArrival: "00:50",
        scheduledDeparture: null,
      },
      callingPoints: [
        {
          crs: "AAA",
          name: "Station A",
          scheduledArrival: null,
          scheduledDeparture: "23:45",
        },
        {
          crs: "BBB",
          name: "Station B",
          scheduledArrival: "00:20",
          scheduledDeparture: "00:22",
        },
        {
          crs: "CCC",
          name: "Station C",
          scheduledArrival: "00:50",
          scheduledDeparture: null,
        },
      ],
      network: "EE",
      date: "2026-08-14",
    };

    render(<JourneyTimeline journey={midnightJourney} />);

    // Station B: departs 23:45, arrives 00:20 = 35 min (not negative)
    const stationBRow = screen.getByRole("row", { name: /Station B/i });
    const stationBCells = within(stationBRow).getAllByRole("cell");
    expect(stationBCells[2]).toHaveTextContent("35 min");

    // Station C: departs 23:45, arrives 00:50 = 65 min = 1 hr 5 min
    const stationCRow = screen.getByRole("row", { name: /Station C/i });
    const stationCCells = within(stationCRow).getAllByRole("cell");
    expect(stationCCells[2]).toHaveTextContent("1 hr 5 min");
  });
});
