# Train Signal

**When during your train journey can you actually take a call?**

You're booking a meeting for next Tuesday. You know you'll be on the 14:12 from Leeds.
Can you take a Teams call at 15:00?

Train Signal answers that. Enter your journey and your mobile network, and it shows you
where along the route you'll have signal good enough for a video call, good enough for
a voice call, or nothing at all — and names the best window to put the meeting in.

## How it works

Most coverage maps are *predictions*. They tell you about a 200-metre square; they don't
know your train is in a cutting.

Train Signal uses something better: **Ofcom publishes mobile signal actually measured
from antennas mounted on Network Rail's yellow engineering trains**, recorded along the
real rail network at roof height, split by operator. Tunnels and cuttings show up in
that data because the measurement genuinely drops — no modelling required.

We combine it with National Rail timetables and OpenStreetMap track geometry to place
those measurements against your specific journey, minute by minute.

## Honesty

The measurement data is a 2018–19 snapshot. Networks have improved since, so our
verdicts skew **conservative** — we would rather tell you a call won't hold and be wrong
than tell you it will and drop you mid-sentence with a client.

Where the measurement data is thin, the app says it doesn't know rather than guessing.

## Accessibility

Built to **WCAG 2.2 Level AAA** throughout, which is a deliberately high bar. In
practice that means: full keyboard operation, 7:1 contrast, a signal timeline that works
completely without colour, plain English at lower-secondary reading level, and a
structured table of the journey that is a first-class view rather than a screen-reader
fallback.

Accessibility was a design input here, not a compliance pass at the end.

## Status

In development.

## Data sources

| Source | Licence |
|---|---|
| [Ofcom mobile signal measurement data](https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/data-downloads2) | Ofcom open data |
| [National Rail Darwin](https://www.nationalrail.co.uk/developers/darwin-data-feeds/) | OGL 2.0 with NRE amendments |
| [Network Rail SCHEDULE](https://datafeeds.networkrail.co.uk) | OGL 2.0 |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | ODbL |

Cross-checked against [mastdatabase.co.uk rail not-spots](https://mastdatabase.co.uk/gb/railway-coverage-notspots/)
by David Wheatley.

## Development

This project is built by a team of autonomous agents — product manager, designer,
accessibility specialist, developer, QA, data engineer and devops — coordinating through
files rather than conversation. See [agent/README.md](agent/README.md).

```bash
npm install
npm run dev       # local dev server
npm run verify    # everything CI runs
```

```powershell
./agent/ralph.ps1 -Once    # one iteration of autonomous development
```
