# Open-Source Math Calculator

An advanced math calculator that runs entirely in your browser — expressions,
scientific functions, variables, history, unit conversion, and function
graphing. No server, no account, nothing leaves your machine.

**Live: https://ryan-miles.github.io/open-source-math-calculator/**

## Run it locally

Double-click **`Open-Source Math Calculator.bat`**. The first run builds the app
(~1 min); after that it opens instantly.

Or from a terminal in this folder:

```
npm install
npm run dev        # live-reload dev server on http://localhost:5181
npm run build      # -> dist/      one self-contained index.html (offline)
npm run build:web  # -> dist-web/  code-split build (web hosting)
```

There are two build targets:

- **`npm run build`** produces **one self-contained `dist/index.html`**.
  Everything is inlined, so you can copy that single file anywhere, open it
  offline by double-clicking, or put it on a USB stick.
- **`npm run build:web`** produces a normal code-split build. This is what gets
  deployed to GitHub Pages.

## Deploying

Pushing to `main` publishes automatically via `.github/workflows/deploy.yml`
(build → `dist-web` → GitHub Pages). Nothing to run by hand.

Hosting is free and stays free: the app is 100% client-side, so there's no
compute, database or egress cost — just static files on a CDN.

Because `vite.config.js` sets `base: "./"`, the same build works from a domain
root, a project subpath like `/open-source-math-calculator/`, or `file://`.

> One setup note if you fork this: GitHub Pages must already be enabled on the
> repo (Settings → Pages → Source: **GitHub Actions**). The workflow's
> `GITHUB_TOKEN` can configure an existing Pages site but cannot create one.

## Using it

Type an expression and press **Enter** (or tap **=**). A live preview updates
as you type. History, variables, memory and settings are saved in the browser.

### What it can do

| Feature | Examples |
|---|---|
| **Arithmetic & powers** | `2 + 3 * 4`, `2^10`, `sqrt(2)`, `cbrt(27)` |
| **Trig (DEG/RAD)** | `sin(30)`, `cos(pi/4)`, `atan2(1, 1)` |
| **Logs & exp** | `ln(e)`, `log(100)`, `log2(8)`, `exp(1)` |
| **Combinatorics** | `factorial(10)`, `nCr(52, 5)`, `nPr(10, 3)` |
| **Variables** | `r = 5` then `pi * r^2` |
| **Functions** | `f(x) = x^2 * sin(x)` then `f(pi/2)` |
| **Last answer** | `ans * 2` |
| **Units** | `5 ft to m`, `72 degF to degC`, `100 km/h in mph` |
| **Memory** | MC / MR / M+ / M− / MS |
| **Formats** | Auto, fixed, scientific, engineering, fraction |
| **Graph** | Plot `y = f(x)` over a custom x-range |

### Keyboard shortcuts

| Key | Action |
|---|---|
| `Enter` | Evaluate |
| `Esc` | Clear expression |
| `↑` / `↓` | Browse history |
| `Ctrl` + `L` | Focus expression |
| `Ctrl` + `G` | Toggle graph panel |

### Tips

- Implicit multiplication works: `2pi`, `3(4+5)`, `)(`.
- Click a history row to reload the expression; click the result line to load
  the numeric result.
- Open the **Graph** panel, enter an expression in `x`, and hit **Plot**.
- Switch **DEG** / **RAD** in the top bar for trig functions.

## Layout

```
index.html          markup
src/main.js         app wiring: evaluate loop, history, keypad, graph
src/engine.js       expression normalize + math.js evaluation + formatting
src/plotter.js      canvas function plotter
src/keypad.js       keypad layouts and example gallery
src/style.css       styles
vite.config.js      dual build (offline single-file + web)
```

## Limits

- Factorial is defined for integers 0…170 (IEEE float range).
- Graphing samples a finite number of points; vertical asymptotes show as gaps.
- Unit conversion uses math.js’s unit system; unusual unit spellings may need
  the canonical form (e.g. `degC`, `degF`, `km/h`).
