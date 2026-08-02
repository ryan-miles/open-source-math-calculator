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
| Combinatorics | factorial(n); nCr(n, r); nPr(n, r) |
| Modular / number theory | mod, modmul, modpow, invmod, gcd, lcm, xgcd — exact BigInt path in Auto |
| Stats helpers | min, max, mean, sum, hypot |
| Constants | pi / π, e, tau / τ, phi |
| Variables | Assign with \`name = expression\`; reuse later |
| User functions | Define \`f(x) = …\` or \`g(x, y) = …\`, then call them |
| Last answer | \`ans\` in the next expression; or click a history row |
| Memory | MC / MR / M+ / M− / MS |
| Units | Convert with \`to\` / \`in\` (math.js units + mph/kph aliases) |
| Precision modes | Auto (exact mod), Float, BigNumber, Fraction |
| Display formats | Auto, fixed, scientific, engineering, fraction approximation |
| Graphing | Plot y = f(x) over an x-range (sampled curve, not symbolic) |
| Persistence | History, vars, functions, memory, theme, settings survive tab close (same browser/profile) |

---

## Precision and modular arithmetic (important)

JavaScript IEEE-754 doubles are only exact for integers up to **2^53 − 1** (\`Number.MAX_SAFE_INTEGER\` ≈ 9.007e15). A product like \`314159265 * 575450284\` overflows that range, so a naive \`mod(a * b, m)\` in float returns a wrong remainder.

**Default Precision: Auto** fixes this for modular work:

1. \`mod\`, \`modmul\`, \`modpow\`, \`invmod\`, \`gcd\`, \`lcm\`, \`xgcd\` use **native BigInt** (exact integers).
2. Expressions of the form \`mod(a * b * …, m)\` are rewritten to nested \`modmul(...)\` before evaluation.
3. Expressions of the form \`mod(a^e, m)\` are rewritten to \`modpow(a, e, m)\`.
4. Large integer results print as full decimal strings (not scientific notation).

| Mode | Behavior |
|------|----------|
| **Auto** (default) | Fast float for everyday math; exact BigInt helpers + rewrites for modular ops |
| **Float** | Classic doubles only. May lose bits; UI warns on risky \`mod(a*b,m)\` patterns |
| **BigNumber** | math.js arbitrary-precision decimals |
| **Fraction** | math.js rational arithmetic where applicable |

### Required modular test cases

\`\`\`
invmod(314159265, 1000000007)          // → 575450284
mod(314159265 * 575450284, 1000000007) // → 1   (exact; not 999999996)
mod(2^60, 1000000007)                  // → 536396504 via modpow rewrite
invmod(2^30 + 3, 10^9 + 7)             // → 827452827; modmul(a, inv, m) = 1
modmul(a, b, m)                        // explicit exact (a*b) mod m
modpow(a, e, m)                        // explicit exact a^e mod m
\`\`\`

Prefer \`modmul\` / \`modpow\` when writing crypto-style chains yourself.

---

## Syntax and examples

Type in the expression box. Implicit multiplication works where unambiguous.

| Idea | Example |
|------|---------|
| Basic ops | \`2 + 3 * 4\`, \`(1+2)^3\` |
| Implicit multiply | \`2pi\`, \`3(4+5)\` |
| Powers / roots | \`2^10\`, \`sqrt(2)\`, \`cbrt(27)\`, \`x²\` |
| Trig (degrees) | Set DEG, then \`sin(30)\` ≈ 0.5 |
| Trig (radians) | Set RAD, then \`sin(pi/2)\` → 1 |
| Assign variable | \`r = 5\` then \`pi * r^2\` |
| Define function | \`f(x) = x^2 * sin(x)\` then \`f(pi/2)\` |
| Chain with ans | Evaluate something, then \`ans * 2\` |
| Percent | \`50%\` → 0.5; e.g. \`200 * 15%\` |
| Combinations | \`nCr(52, 5)\`, \`factorial(10)\` |
| Modular inverse | \`invmod(314159265, 1000000007)\` |
| Exact mod product | \`mod(314159265 * 575450284, 1000000007)\` → 1 |
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
- **Float mode still has 2^53 limits** for non-rewritten arithmetic. Use Auto for modular work.
- **IEEE float noise** on everyday reals (e.g. 0.1 + 0.2). Fraction mode/format can help.
- **Factorial:** Float mode 0…170; Auto/BigNumber allows larger n with a safety cap.
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
- **Keypad tabs** — Basic / Scientific / More (includes invmod, modmul, modpow).
- **DEG / RAD** — affects trig and inverse trig only (not hyperbolic).
- **Precision** — Auto / Float / BigNumber / Fraction (see above).
- **Format & digits** — display only; large integers print full decimals in Auto.
- **Graph** — toggle panel, set f(x) and x-range, Plot. Free variable must be \`x\`.
- **Theme** — light/dark chrome, saved locally.
- **Guide / Copy for AI** — human docs + Markdown paste for agents.

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
| **Custom engine** (\`src/engine.js\`) | Normalize input, DEG/RAD trig, BigInt modular ops, mod rewrite, formatting, plot sampling |
| **BigInt helpers** | \`modmul\`, \`modpow\`, \`invmod\`, exact \`mod\`/\`gcd\`/\`lcm\`/\`xgcd\` |
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
