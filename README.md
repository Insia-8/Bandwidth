# Bandwidth

**See your semester before it sees you.**

![Bandwidth](og-image.png)

🔗 **Live site:** [insia-8.github.io/Bandwidth](https://insia-8.github.io/Bandwidth/)

Built for **DesignAthon 2026** · GDC RIT Dubai in partnership with +TWE

---

## The Problem

Students can see every individual deadline on their calendar — but they can't see how those deadlines *collide*. A database assignment, an ML lab, a presentation, and a report can each look manageable on their own, until they land in the same week and turn into 27 hours of work in four days. A 2026 UAE University study of 168 students found that having more than three assessments due in a two-week window produced one of the largest measurable jumps in perceived stress of any factor studied — ahead of financial hardship or lack of social support ([Farooq et al., 2026, *PLOS ONE*](https://doi.org/10.1371/journal.pone.0347553)).

The problem isn't knowing *what's* due. It's not seeing the shape of a week until it's already too late to plan around it.

## The Solution

Bandwidth turns a semester of deadlines into a **week-by-week workload skyline** — one continuous, color-coded chart (green → yellow → orange → red) that shows exactly which weeks are light and which ones are about to collide. Add a deadline once, and the skyline builds itself automatically. Click any week to see exactly what's driving the load, and get a suggestion for what to start early.

## Features

- **Workload skyline** — a smooth, animated, gradient area chart built from your deadlines, week by week
- **Click-to-inspect weeks** — see the breakdown of exactly what's due and how heavy each week is
- **Smart suggestions** — a simple heuristic flags the biggest task in a heavy week and suggests starting it during a lighter neighboring week
- **Add / delete deadlines** — a modal-based flow, no page reloads
- **Course color legend** — every course gets a consistent color across the dashboard
- **Scroll-reveal animations, animated counters, and hover micro-interactions** throughout
- **Fully responsive** — sidebar collapses to a top bar, grids stack on mobile


## Pages

| Page | Purpose |
|---|---|
| `index.html` | Marketing home page — hero, skyline preview, value props, How It Works |
| `dashboard.html` | The actual product — the workload skyline, stats, upcoming deadlines, week detail |
| `problem-solution.html` | The problem, research, solution narrative, and why it matters |

## Tech Stack

Plain **HTML / CSS / JavaScript** — no framework, no build step, no dependencies. Data persistence via the browser's `localStorage` API. Fonts via Google Fonts (Manrope + Inter).

## File Structure

```
├── index.html              # Home page
├── dashboard.html           # Main dashboard/app
├── problem-solution.html    # Problem & Solution page
├── style.css                 # All styling
├── app.js                    # All application logic (chart, data, interactions)
├── favicon.svg                # Browser tab icon
└── og-image.png                # Social share preview image
```

## Research

Farooq M, Hafeez U, Ahmad A, Waller S, Andrade G, Cevik AA, et al. (2026). *Academic workload and lifestyle predict emotional well-being among university students in the United Arab Emirates: A cross-sectional study.* PLOS ONE, 21(4): e0347553. [doi.org/10.1371/journal.pone.0347553](https://doi.org/10.1371/journal.pone.0347553)


