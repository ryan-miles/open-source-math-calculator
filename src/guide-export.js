/**
 * Full calculator guide as Markdown for pasting into AI agents / tools.
 * Keep in sync with the human-facing Guide dialog in index.html.
 */
export const GUIDE_MARKDOWN = `# Open-Source Math Calculator — Agent Guide

**Live URL:** https://ryan-miles.github.io/open-source-math-calculator/
**Source:** https://github.com/ryan-miles/open-source-math-calculator

This document describes what the calculator can do, what it cannot do, how to use it, and how it is implemented. Use it when driving or testing the tool as an agent, or when explaining capabilities to a model.

---

## Overview

An advanced **expression calculator** that runs 100% in the browser (static web app). Type math as text, press Enter (or =), get a numeric/unit result. Includes history, variables, user-defined functions, memory registers, unit conversion, display formats, and a simple y = f(x) graph.

**It is not:** a full computer-algebra system (CAS), a spreadsheet, a symbolic equation solver, or a certified financial/medical/legal calculator.

**Privacy:** Nothing is uploaded. Expression, history, variables, memory, and settings live in the browser \`localStorage\` on this origin only.

---

## What you can do

| Area | Capability |
|------|------------|
| Arithmetic | +, −, ×, ÷, powers, roots, percent, abs, floor/ceil/round/trunc |
| Trig & hyperbolic | sin, cos, tan + inverses; sinh, cosh, tanh; angle mode DEG or RAD |
| Logs & exp | ln, log (base 10), log2, exp, 10^(…) |
| Combinatorics | factorial(n) for integers 0…170; nCr(n, r); nPr(n, r) |
| Stats helpers | min, max, mean, sum, hypot, gcd, lcm |
| Constants | pi / π, e, tau / τ, phi |
| Variables | Assign with \`name = expression\`; reuse later |
| User functions | Define \`f(x) = …\` or \`g(x, y) = …\`, then call them |
| Last answer | \`ans\` in the next expression; or click a history row |
| Memory | MC / MR / M+ / M− / MS |
| Units | Convert with \`to\` / \`in\` (math.js units + mph/kph aliases) |
| Display formats | Auto, fixed, scientific, engineering, fraction approximation |
| Graphing | Plot y = f(x) over an x-range (sampled curve, not symbolic) |
| Persistence | History, vars, functions, memory, theme, settings survive tab close (same browser/profile) |

---

## Syntax and examples

Type in the expression box. Implicit multiplication works where unambiguous.

| Idea | Example |
|------|---------|
| Basic ops | \`2 + 3 * 4\`, \`(1+2)^3\` |
| Implicit multiply | \`2pi\`, \`3(4+5)\` |
| Powers / roots | \`2^10\`, \`sqrt(2)\`, \`cbrt(27)\`, \`x²\` |
| Trig (degrees) | Set DEG, then \`sin(30)\` → 0.5 |
| Trig (radians) | Set RAD, then \`sin(pi/2)\` → 1 |
| Assign variable | \`r = 5\` then \`pi * r^2\` |
| Define function | \`f(x) = x^2 * sin(x)\` then \`f(pi/2)\` |
| Chain with ans | Evaluate something, then \`ans * 2\` |
| Percent | \`50%\` → 0.5; e.g. \`200 * 15%\` |
| Combinations | \`nCr(52, 5)\`, \`factorial(10)\` |
| Length units | \`5 ft to m\`, \`1 mile to km\` |
| Temperature | \`72 degF to degC\` (use degC / degF) |
| Speed | \`100 km/h to mph\` (mph, kph aliases included) |
| Random | \`rand()\` in 0…1; \`randi(1, 6)\` integer in range |

Unicode operators accepted: × ÷ − · π τ √ ∛ ² ³. Trailing \`=\` is stripped.

The top-bar **Examples** menu loads ready-made expressions (and setup variables when needed).

---

## Limits — what you cannot expect

- **No symbolic algebra.** Will not expand/simplify polynomials or rearrange formulas symbolically.
- **No equation solving.** \`2x + 3 = 11\` is not solved; assign values and evaluate expressions instead.
- **No calculus CAS.** No symbolic derivatives/integrals; graphing is numeric sampling only.
- **IEEE floating point.** Tiny float noise possible (e.g. 0.1 + 0.2). Fraction format can help.
- **Factorial range:** integers **0…170** only.
- **Graphing is sampled.** Hundreds of points; asymptotes show as gaps; sharp spikes can be missed.
- **Units need recognized names.** Prefer math.js units (m, ft, km/h, degC). Aliases: mph, kph.
- **Not certified** for tax, medical, or legal computations.
- **Local data only.** Clearing site data / other browser / private mode wipes state. No cloud sync.
- **Matrix / complex UI is minimal.** math.js may accept some advanced values, but there is no matrix editor or complex-plane view.

---

## Using the UI

- **Expression box** — free typing; live preview while editing; Enter commits to history.
- **History (left)** — click expression to reload; click result line to insert that number.
- **Variables (left)** — user assignments and defined functions; Clear drops both.
- **Keypad tabs** — Basic / Scientific / More.
- **DEG / RAD** — affects trig and inverse trig only (not hyperbolic).
- **Format & digits** — display only; underlying value unchanged.
- **Graph** — toggle panel, set f(x) and x-range, Plot. Free variable must be \`x\`.
- **Theme** — light/dark chrome, saved locally.
- **Guide** — in-app human documentation (this content).

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Enter | Evaluate (adds to history) |
| Esc | Clear expression box |
| ↑ / ↓ | Step through history from the expression box |
| Ctrl+L | Focus and select expression |
| Ctrl+G | Toggle graph panel |

Number keys and operators work as a normal text field; on-screen keypad is optional.

---

## How it is implemented

Static HTML/CSS/JS bundled with **Vite**. No backend API for calculations. GitHub Pages (or any static host) only serves files.

| Piece | Role |
|-------|------|
| **math.js** | Parse/evaluate expressions, units, many numeric functions |
| **Custom engine** (\`src/engine.js\`) | Normalize friendly input, DEG/RAD trig, factorial/nCr, formatting, plot sampling |
| **KaTeX** | Pretty render of last committed expression |
| **Canvas plotter** (\`src/plotter.js\`) | Sample y=f(x), draw grid/axes/curve |
| **localStorage** | Persist UI + calculator state on this origin |
| **GitHub Pages** | Host built static assets only |

**Local / offline:**
\`\`\`
npm install
npm run dev        # http://localhost:5181
npm run build      # single-file dist/index.html
npm run build:web  # code-split dist-web/ (what Pages deploys)
\`\`\`

Windows: double-click \`Open-Source Math Calculator.bat\` (builds offline file on first run).

**Agent tip:** Prefer typing expressions into the expression field and evaluating with Enter. Use DEG/RAD explicitly before trig. For graphs, set the free variable to \`x\`. Do not assume symbolic solve or CAS features.

---

*Generated for AI-agent paste from the in-app Guide. Human UI remains the interactive Guide dialog on the site.*
`;

/** Plain filename suggestion if someone saves the clipboard to a file. */
export const GUIDE_EXPORT_FILENAME = "open-source-math-calculator-agent-guide.md";
