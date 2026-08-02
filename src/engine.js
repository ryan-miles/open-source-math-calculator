import { create, all } from "mathjs";

const math = create(all, {
  number: "number",
  precision: 64,
});

// Everyday aliases math.js does not ship by default.
try {
  math.createUnit("mph", "1 mi/h", { override: true });
  math.createUnit("kph", "1 km/h", { override: true });
  math.createUnit("kmh", "1 km/h", { override: true });
} catch {
  /* units already defined on hot reload */
}

/** Degrees → radians when angle mode is DEG. */
function toRad(x, angleMode) {
  return angleMode === "DEG" ? (x * Math.PI) / 180 : x;
}

function toDeg(x, angleMode) {
  return angleMode === "DEG" ? (x * 180) / Math.PI : x;
}

/**
 * Build a scope with angle-aware trig and common helpers.
 * Callers pass their own variables (ans, memory, user vars) on top.
 */
export function buildScope(angleMode, extra = {}) {
  const wrap = (fn) => (x) => fn(toRad(Number(x), angleMode));
  const wrapInv = (fn) => (x) => toDeg(fn(Number(x)), angleMode);

  return {
    // Trig (respects DEG / RAD)
    sin: wrap(Math.sin),
    cos: wrap(Math.cos),
    tan: wrap(Math.tan),
    asin: wrapInv(Math.asin),
    acos: wrapInv(Math.acos),
    atan: wrapInv(Math.atan),
    atan2: (y, x) => toDeg(Math.atan2(Number(y), Number(x)), angleMode),
    sinh: (x) => Math.sinh(Number(x)),
    cosh: (x) => Math.cosh(Number(x)),
    tanh: (x) => Math.tanh(Number(x)),
    asinh: (x) => Math.asinh(Number(x)),
    acosh: (x) => Math.acosh(Number(x)),
    atanh: (x) => Math.atanh(Number(x)),

    // Logs / exp
    ln: (x) => Math.log(Number(x)),
    log: (x, base) =>
      base === undefined
        ? Math.log10(Number(x))
        : Math.log(Number(x)) / Math.log(Number(base)),
    log10: (x) => Math.log10(Number(x)),
    log2: (x) => Math.log2(Number(x)),
    exp: (x) => Math.exp(Number(x)),

    // Roots / powers
    sqrt: (x) => Math.sqrt(Number(x)),
    cbrt: (x) => Math.cbrt(Number(x)),
    root: (x, n) => Math.pow(Number(x), 1 / Number(n)),
    pow: (x, y) => Math.pow(Number(x), Number(y)),

    // Rounding / abs
    abs: (x) => Math.abs(Number(x)),
    floor: (x) => Math.floor(Number(x)),
    ceil: (x) => Math.ceil(Number(x)),
    round: (x, n = 0) => {
      const f = 10 ** Number(n);
      return Math.round(Number(x) * f) / f;
    },
    trunc: (x) => Math.trunc(Number(x)),
    sign: (x) => Math.sign(Number(x)),

    // Combinatorics
    factorial: (n) => {
      n = Number(n);
      if (!Number.isInteger(n) || n < 0 || n > 170) {
        throw new Error("factorial expects an integer 0…170");
      }
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    },
    nCr: (n, r) => {
      n = Number(n);
      r = Number(r);
      if (r < 0 || n < 0 || r > n) return 0;
      r = Math.min(r, n - r);
      let num = 1;
      for (let i = 1; i <= r; i++) num = (num * (n - r + i)) / i;
      return Math.round(num);
    },
    nPr: (n, r) => {
      n = Number(n);
      r = Number(r);
      if (r < 0 || n < 0 || r > n) return 0;
      let p = 1;
      for (let i = 0; i < r; i++) p *= n - i;
      return p;
    },

    // Misc
    percent: (x) => Number(x) / 100,
    mod: (a, b) => Number(a) % Number(b),
    gcd: (...args) => math.gcd(...args.map(Number)),
    lcm: (...args) => math.lcm(...args.map(Number)),
    hypot: (...args) => Math.hypot(...args.map(Number)),
    min: (...args) => Math.min(...args.map(Number)),
    max: (...args) => Math.max(...args.map(Number)),
    mean: (...args) => args.reduce((s, x) => s + Number(x), 0) / args.length,
    sum: (...args) => args.reduce((s, x) => s + Number(x), 0),
    rand: () => Math.random(),
    randi: (a, b) => {
      a = Math.ceil(Number(a));
      b = Math.floor(Number(b));
      return Math.floor(Math.random() * (b - a + 1)) + a;
    },

    // Constants (also available as bare identifiers via math.evaluate)
    pi: Math.PI,
    e: Math.E,
    phi: (1 + Math.sqrt(5)) / 2,
    tau: Math.PI * 2,
    deg: Math.PI / 180,
    rad: 180 / Math.PI,

    ...extra,
  };
}

/**
 * Normalize user-friendly input into math.js-friendly expression text.
 * - Unicode operators (× ÷ − ² ³ √ π)
 * - Implicit percent: 50% → percent(50)
 * - Trailing = is stripped
 * - Unit-friendly implicit multiplication (skip unit convert keywords)
 */
export function normalizeInput(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return "";

  s = s
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/·/g, "*")
    .replace(/π/g, "pi")
    .replace(/τ/g, "tau")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/√\s*([0-9.]+|[a-zA-Z_]\w*)/g, "sqrt($1)")
    .replace(/∛\s*\(/g, "cbrt(")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/(\d+(?:\.\d+)?)\s*%/g, "percent($1)")
    .replace(/\s*=+\s*$/, "")
    .trim();

  // Implicit multiplication: 2pi → 2*pi, 3(4+1) → 3*(4+1), )( → )*(
  // Avoid glueing across unit-conversion keywords "to" / "in".
  s = s
    .replace(/(\d)\s*([a-zA-Z_])/g, "$1*$2")
    .replace(/(\d)\s*\(/g, "$1*(")
    .replace(/\)\s*(\d)/g, ")*$1")
    .replace(/\)\s*\(/g, ")*(")
    .replace(/\)\s*([a-zA-Z_])/g, ")*$1")
    .replace(/(pi|e|tau|phi|ans|ans\d+)\s*\(/gi, "$1*(")
    // Undo accidental "to*unit" / "in*unit" from digit*letter if ever applied
    .replace(/\bto\*([a-zA-Z_])/g, "to $1")
    .replace(/\bin\*([a-zA-Z_])/g, "in $1");

  return s;
}

/**
 * Detect assignment: `x = expr` or `f(x) = expr` (function definition stored as string).
 * Returns { kind: 'eval', expr } | { kind: 'assign', name, expr } | { kind: 'fn', name, params, body }
 */
export function parseStatement(raw) {
  const s = normalizeInput(raw);
  if (!s) return { kind: "empty" };

  // Function def: f(x) = x^2 + 1  or  f(x,y) = x*y
  const fnMatch = s.match(
    /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\)\s*=\s*(.+)$/
  );
  if (fnMatch) {
    const name = fnMatch[1];
    const params = fnMatch[2].split(",").map((p) => p.trim());
    return { kind: "fn", name, params, body: fnMatch[3].trim() };
  }

  // Variable assign: name = expr  (not comparison; single =)
  const asg = s.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
  if (asg && !["e", "pi", "tau", "phi"].includes(asg[1])) {
    return { kind: "assign", name: asg[1], expr: asg[2].trim() };
  }

  return { kind: "eval", expr: s };
}

/**
 * Evaluate a normalized expression with the given angle mode and variables.
 * Returns a JS number, complex-like object, unit, matrix, or string.
 */
export function evaluate(expr, angleMode, variables = {}, functions = {}) {
  const scope = buildScope(angleMode, { ...variables });

  // Inject user-defined functions into scope
  for (const [name, def] of Object.entries(functions)) {
    scope[name] = (...args) => {
      const local = { ...scope };
      def.params.forEach((p, i) => {
        local[p] = args[i];
      });
      return math.evaluate(def.body, local);
    };
  }

  return math.evaluate(expr, scope);
}

/**
 * Format a result for display.
 * @param {*} value
 * @param {{ format: 'auto'|'fixed'|'sci'|'eng'|'frac', digits: number }} opts
 */
export function formatResult(value, opts = {}) {
  const format = opts.format || "auto";
  const digits = opts.digits ?? 12;

  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";

  // math.js Unit
  if (value && typeof value === "object" && value.isUnit) {
    try {
      return value.format({ precision: digits });
    } catch {
      return String(value);
    }
  }

  // math.js Complex
  if (value && typeof value === "object" && value.isComplex) {
    return value.format({ precision: digits });
  }

  // math.js Matrix / Array
  if (value && typeof value === "object" && (value.isMatrix || Array.isArray(value))) {
    try {
      return math.format(value, { precision: digits });
    } catch {
      return String(value);
    }
  }

  // BigNumber
  if (value && typeof value === "object" && value.isBigNumber) {
    value = value.toNumber();
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    if (typeof value === "number") {
      if (Number.isNaN(value)) return "NaN";
      if (value === Infinity) return "∞";
      if (value === -Infinity) return "−∞";
    }
    try {
      return math.format(value, { precision: digits });
    } catch {
      return String(value);
    }
  }

  if (format === "frac") {
    try {
      const f = math.fraction(value);
      if (f.d === 1) return String(f.n * (f.s < 0 ? -1 : 1));
      const num = f.n * (f.s < 0 ? -1 : 1);
      return `${num}/${f.d}`;
    } catch {
      /* fall through */
    }
  }

  if (format === "sci") {
    return value.toExponential(Math.max(0, digits - 1));
  }

  if (format === "eng") {
    if (value === 0) return "0";
    const exp = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
    const mant = value / 10 ** exp;
    const m = stripTrailingZeros(mant.toFixed(Math.max(0, digits - 1)));
    return exp === 0 ? m : `${m}e${exp}`;
  }

  if (format === "fixed") {
    return stripTrailingZeros(value.toFixed(Math.min(digits, 20)));
  }

  // auto
  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return String(value);
  }
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
    return value.toExponential(Math.min(digits - 1, 11));
  }
  // enough digits to be useful without float noise
  const s = value.toPrecision(digits);
  return stripTrailingZeros(String(Number(s) === value ? Number(s) : s));
}

function stripTrailingZeros(s) {
  if (!s.includes(".")) return s;
  if (s.includes("e") || s.includes("E")) {
    return s.replace(/(\.\d*?[1-9])0+(e)/i, "$1$2").replace(/\.0+(e)/i, "$1");
  }
  return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

/** Approximate equality for "exact-ish" answers. */
export function nearlyEqual(a, b, eps = 1e-10) {
  if (typeof a !== "number" || typeof b !== "number") return false;
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Sample y = f(x) over [xMin, xMax] for plotting. */
export function sampleFunction(body, xMin, xMax, steps, angleMode, variables = {}, functions = {}) {
  const pts = [];
  const dx = (xMax - xMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + dx * i;
    try {
      const y = evaluate(body, angleMode, { ...variables, x }, functions);
      const yn = typeof y === "number" ? y : Number(y);
      if (Number.isFinite(yn)) pts.push({ x, y: yn });
      else pts.push({ x, y: null });
    } catch {
      pts.push({ x, y: null });
    }
  }
  return pts;
}

export { math };
