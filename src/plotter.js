/**
 * Lightweight canvas plotter for y = f(x).
 * Draws grid, axes, and a polyline; skips gaps where y is null.
 */

export function createPlotter(canvas) {
  const ctx = canvas.getContext("2d");
  let dpr = 1;

  function resize() {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || 400;
    const h = parent?.clientHeight || 280;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  /**
   * @param {{
   *   points: {x:number,y:number|null}[],
   *   xMin: number, xMax: number,
   *   yMin?: number, yMax?: number,
   *   theme: 'dark'|'light',
   *   expression?: string
   * }} opts
   */
  function draw(opts) {
    const { w, h } = resize();
    const { points, xMin, xMax, theme, expression } = opts;
    const pad = { l: 48, r: 16, t: 16, b: 32 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const valid = points.filter((p) => p.y != null && Number.isFinite(p.y));
    let yMin = opts.yMin;
    let yMax = opts.yMax;
    if (yMin == null || yMax == null) {
      if (valid.length === 0) {
        yMin = -1;
        yMax = 1;
      } else {
        const ys = valid.map((p) => p.y);
        yMin = Math.min(...ys);
        yMax = Math.max(...ys);
        if (yMin === yMax) {
          yMin -= 1;
          yMax += 1;
        }
        // pad 8%
        const span = yMax - yMin;
        yMin -= span * 0.08;
        yMax += span * 0.08;
      }
    }

    const colors =
      theme === "light"
        ? {
            bg: "#ffffff",
            grid: "#e2e8f0",
            axis: "#64748b",
            curve: "#2563eb",
            text: "#475569",
            label: "#0f172a",
          }
        : {
            bg: "#151922",
            grid: "#2a303c",
            axis: "#64748b",
            curve: "#4f8cff",
            text: "#98a2b3",
            label: "#e7ebf3",
          };

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    const xToPx = (x) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * plotW;
    const yToPx = (y) => pad.t + ((yMax - y) / (yMax - yMin || 1)) * plotH;

    // Grid + ticks
    const xTicks = niceTicks(xMin, xMax, 8);
    const yTicks = niceTicks(yMin, yMax, 6);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (const t of xTicks) {
      const px = xToPx(t);
      ctx.beginPath();
      ctx.moveTo(px, pad.t);
      ctx.lineTo(px, pad.t + plotH);
      ctx.stroke();
      ctx.fillText(formatTick(t), px, pad.t + plotH + 6);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const t of yTicks) {
      const py = yToPx(t);
      ctx.beginPath();
      ctx.moveTo(pad.l, py);
      ctx.lineTo(pad.l + plotW, py);
      ctx.stroke();
      ctx.fillText(formatTick(t), pad.l - 6, py);
    }

    // Axes at 0 if in range
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1.5;
    if (xMin <= 0 && xMax >= 0) {
      const zx = xToPx(0);
      ctx.beginPath();
      ctx.moveTo(zx, pad.t);
      ctx.lineTo(zx, pad.t + plotH);
      ctx.stroke();
    }
    if (yMin <= 0 && yMax >= 0) {
      const zy = yToPx(0);
      ctx.beginPath();
      ctx.moveTo(pad.l, zy);
      ctx.lineTo(pad.l + plotW, zy);
      ctx.stroke();
    }

    // Curve
    ctx.strokeStyle = colors.curve;
    ctx.lineWidth = 2.25;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    let drawing = false;
    ctx.beginPath();
    for (const p of points) {
      if (p.y == null || !Number.isFinite(p.y)) {
        drawing = false;
        continue;
      }
      const px = xToPx(p.x);
      const py = yToPx(p.y);
      if (!drawing) {
        ctx.moveTo(px, py);
        drawing = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Expression label
    if (expression) {
      ctx.fillStyle = colors.label;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`y = ${expression}`, pad.l + 4, 4);
    }

    return { yMin, yMax };
  }

  return { draw, resize };
}

function niceTicks(min, max, target) {
  const span = max - min || 1;
  const rough = span / target;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const err = rough / pow;
  let step;
  if (err >= 5) step = 10 * pow;
  else if (err >= 2) step = 5 * pow;
  else if (err >= 1) step = 2 * pow;
  else step = pow;

  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 1e-9; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
}

function formatTick(v) {
  if (Math.abs(v) < 1e-9) return "0";
  if (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0)) {
    return v.toExponential(1);
  }
  return String(Number(v.toPrecision(6)));
}
