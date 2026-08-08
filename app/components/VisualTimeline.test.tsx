import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { VisualTimeline } from "./VisualTimeline";
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

describe("VisualTimeline", () => {
  it("renders without crashing", () => {
    const { container } = render(<VisualTimeline journey={fixtureJourney} />);
    const section = container.querySelector(".ts-visual-timeline");
    expect(section).toBeTruthy();
  });

  it("is hidden from the accessibility tree via aria-hidden", () => {
    const { container } = render(<VisualTimeline journey={fixtureJourney} />);
    const section = container.querySelector(".ts-visual-timeline");
    expect(section?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders one node per calling point", () => {
    const { container } = render(<VisualTimeline journey={fixtureJourney} />);
    const nodes = container.querySelectorAll(".ts-visual-timeline__node");
    // 4 calling points = 4 nodes
    expect(nodes).toHaveLength(fixtureJourney.callingPoints.length);
  });

  it("marks origin and terminus nodes with the terminus class", () => {
    const { container } = render(<VisualTimeline journey={fixtureJourney} />);
    const terminusNodes = container.querySelectorAll(
      ".ts-visual-timeline__node--terminus"
    );
    // Origin (Leeds) and terminus (London Kings Cross)
    expect(terminusNodes).toHaveLength(2);
  });

  it("renders the correct number of segments", () => {
    const { container } = render(<VisualTimeline journey={fixtureJourney} />);
    const segments = container.querySelectorAll(
      ".ts-visual-timeline__segment"
    );
    // 4 calling points = 3 segments between them
    expect(segments).toHaveLength(fixtureJourney.callingPoints.length - 1);
  });

  it("sets proportional segment heights", () => {
    const { container } = render(<VisualTimeline journey={fixtureJourney} />);
    const segments = container.querySelectorAll(
      ".ts-visual-timeline__segment"
    );

    // Leeds (departs 14:12) to Wakefield (arrives 14:25) = 13 min
    // 13 * 3 = 39px, but min is 48px
    expect((segments[0] as HTMLElement).style.height).toBe("48px");

    // Wakefield (departs 14:27) to Doncaster (arrives 14:44) = 17 min
    // 17 * 3 = 51px
    expect((segments[1] as HTMLElement).style.height).toBe("51px");

    // Doncaster (departs 14:46) to KGX (arrives 16:27) = 101 min
    // 101 * 3 = 303px
    expect((segments[2] as HTMLElement).style.height).toBe("303px");
  });

  it("handles a two-stop journey (single segment)", () => {
    const twoStop: Journey = {
      origin: {
        crs: "LDS",
        name: "Leeds",
        scheduledArrival: null,
        scheduledDeparture: "14:00",
      },
      destination: {
        crs: "KGX",
        name: "London Kings Cross",
        scheduledArrival: "16:00",
        scheduledDeparture: null,
      },
      callingPoints: [
        {
          crs: "LDS",
          name: "Leeds",
          scheduledArrival: null,
          scheduledDeparture: "14:00",
        },
        {
          crs: "KGX",
          name: "London Kings Cross",
          scheduledArrival: "16:00",
          scheduledDeparture: null,
        },
      ],
      network: "EE",
      date: "2026-07-14",
    };

    const { container } = render(<VisualTimeline journey={twoStop} />);
    const nodes = container.querySelectorAll(".ts-visual-timeline__node");
    const segments = container.querySelectorAll(
      ".ts-visual-timeline__segment"
    );

    expect(nodes).toHaveLength(2);
    expect(segments).toHaveLength(1);
  });

  it("displays station names as text content", () => {
    const { container } = render(<VisualTimeline journey={fixtureJourney} />);
    const names = container.querySelectorAll(
      ".ts-visual-timeline__station-name"
    );

    const nameTexts = Array.from(names).map((el) => el.textContent);
    expect(nameTexts).toEqual([
      "Leeds",
      "Wakefield Westgate",
      "Doncaster",
      "London Kings Cross",
    ]);
  });

  it("displays departure time for origin and arrival times for other stops", () => {
    const { container } = render(<VisualTimeline journey={fixtureJourney} />);
    const times = container.querySelectorAll(".ts-visual-timeline__time");

    const timeTexts = Array.from(times).map((el) => el.textContent);
    // Origin shows departure (14:12), others show arrival
    expect(timeTexts).toEqual(["14:12", "14:25", "14:44", "16:27"]);
  });
});
