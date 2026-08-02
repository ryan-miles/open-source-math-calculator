import { create, all } from "mathjs";

const math = create(all, {
  number: "number",
  precision: 64,
});

const mathBN = create(all, {
  number: "BigNumber",
  precision: 128,
});

const mathFrac = create(all, {
  number: "Fraction",
});

for (const m of [math, mathBN, mathFrac]) {
  try {
    m.createUnit("mph", "1 mi/h", { override: true });
    m.createUnit("kph", "1 km/h", { override: true });
    m.createUnit("kmh", "1 km/h", { override: true });
  } catch {
    /* already defined */
  }
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);

/** @typedef {'auto'|'number'|'BigNumber'|'Fraction'} NumberMode */

/* ------------------------------------------------------------------ *
 * BigInt modular arithmetic (exact)
 * ------------------------------------------------------------------ */

export function toBigInt(x) {
  if (typeof x === "bigint") return x;
  if (typeof x === "number") {
    if (!Number.isFinite(x)) throw new Error("Expected a finite number");
    if (!Number.isInteger(x)) {
      throw new Error("Modular integer ops require integers (got a non-integer)");
    }
    return BigInt(x);
  }
  if (typeof x === "string") {
    const s = x.trim().replace(/n$/i, "");
    if (!/^-?\d+$/.test(s)) throw new Error(`Not an integer: ${x}`);
    return BigInt(s);
  }
  if (x && typeof x === "object") {
    if (x.isBigNumber) {
      if (!x.isInteger()) throw new Error("Modular integer ops require integers");
      return BigInt(x.toFixed(0));
    }
    if (x.isFraction) {
      if (x.d !== 1 && String(x.d) !== "1") {
        throw new Error("Modular integer ops require integers");
      }
      return BigInt(x.n) * BigInt(x.s < 0 ? -1 : 1);
    }
  }
  throw new Error("Cannot convert value to BigInt");
}

/** Prefer Number when safe; otherwise keep BigInt for exact display. */
export function fromBigInt(n) {
  if (n <= MAX_SAFE && n >= MIN_SAFE) return Number(n);
  return n;
}

function positiveMod(a, m) {
  m = toBigInt(m);
  if (m === 0n) throw new Error("modulus must be non-zero");
  const mm = m < 0n ? -m : m;
  let r = toBigInt(a) % mm;
  if (r < 0n) r += mm;
  return r;
}

/** Exact a mod m */
export function modExact(a, m) {
  return fromBigInt(positiveMod(a, m));
}

/** Exact (a * b) mod m without intermediate float overflow */
export function modmul(a, b, m) {
  return fromBigInt(positiveMod(toBigInt(a) * toBigInt(b), m));
}

/** Modular inverse via extended Euclidean algorithm */
export function invmod(a, m) {
  let mod = toBigInt(m);
  if (mod < 0n) mod = -mod;
  if (mod <= 1n) throw new Error("invmod: modulus must be > 1");

  let r0 = positiveMod(a, mod);
  let r1 = mod;
  let s0 = 1n;
  let s1 = 0n;

  while (r1 !== 0n) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  if (r0 !== 1n && r0 !== -1n) {
    throw new Error("invmod: inverse does not exist (not coprime to modulus)");
  }
  let inv = s0;
  if (r0 === -1n) inv = -inv;
  inv = positiveMod(inv, mod);
  return fromBigInt(inv);
}

/** Exact modular exponentiation base^exp mod m */
export function modpow(base, exp, m) {
  let e = toBigInt(exp);
  if (e < 0n) {
    // base^(-k) ≡ inv(base)^k mod m
    return modpow(invmod(base, m), -e, m);
  }
  let b = positiveMod(base, m);
  let mod = toBigInt(m);
  if (mod < 0n) mod = -mod;
  let result = 1n;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return fromBigInt(result);
}

function gcdTwo(a, b) {
  a = toBigInt(a);
  b = toBigInt(b);
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function gcdExact(...args) {
  if (args.length === 0) return 0;
  let g = toBigInt(args[0]);
  for (let i = 1; i < args.length; i++) g = gcdTwo(g, args[i]);
  return fromBigInt(g < 0n ? -g : g);
}

export function lcmExact(...args) {
  if (args.length === 0) return 0;
  let l = toBigInt(args[0]);
  if (l < 0n) l = -l;
  for (let i = 1; i < args.length; i++) {
    const b = toBigInt(args[i]);
    const bb = b < 0n ? -b : b;
    if (l === 0n || bb === 0n) {
      l = 0n;
      break;
    }
    l = (l / gcdTwo(l, bb)) * bb;
  }
  return fromBigInt(l);
}

/** Extended gcd → [gcd, x, y] with ax+by=gcd (math.js-compatible shape) */
export function xgcdExact(a, b) {
  a = toBigInt(a);
  b = toBigInt(b);
  let x0 = 1n;
  let x1 = 0n;
  let y0 = 0n;
  let y1 = 1n;
  while (b !== 0n) {
    const q = a / b;
    [a, b] = [b, a % b];
    [x0, x1] = [x1, x0 - q * x1];
    [y0, y1] = [y1, y0 - q * y1];
  }
  if (a < 0n) {
    a = -a;
    x0 = -x0;
    y0 = -y0;
  }
  return [fromBigInt(a), fromBigInt(x0), fromBigInt(y0)];
}

/* ------------------------------------------------------------------ *
 * Rewrite mod(a*b, m) / mod(a^b, m) into exact helpers
 * ------------------------------------------------------------------ */

/**
 * Split top-level commas (not inside nested parens).
 */
function splitTopLevelArgs(inside) {
  const args = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inside.length; i++) {
    const c = inside[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      args.push(inside.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(inside.slice(start).trim());
  return args;
}

/**
 * Split top-level * factors (respect parens).
 */
function splitTopLevelProduct(expr) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "*" && depth === 0) {
      parts.push(expr.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(expr.slice(start).trim());
  return parts.filter(Boolean);
}

/**
 * If expr is A^B at top level (single ^), return [A,B]; else null.
 */
function splitTopLevelPow(expr) {
  let depth = 0;
  let idx = -1;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "^" && depth === 0) {
      if (idx !== -1) return null; // multiple powers — leave alone
      idx = i;
    } else if ((c === "+" || c === "-" || c === "*" || c === "/") && depth === 0 && i > 0) {
      // binary ops other than leading unary minus
      if (!(c === "-" && i === 0)) {
        // still allow a^b only
      }
    }
  }
  if (idx <= 0) return null;
  // Disallow other top-level ops
  depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0 && (c === "+" || c === "*" || c === "/")) {
      if (c === "+" || c === "*" || c === "/") return null;
    } else if (depth === 0 && c === "-" && i !== 0 && idx !== i) {
      // minus as binary
      const prev = expr[i - 1];
      if (prev !== "e" && prev !== "E" && prev !== "^") return null;
    }
  }
  const base = expr.slice(0, idx).trim();
  const exp = expr.slice(idx + 1).trim();
  if (!base || !exp) return null;
  return [base, exp];
}

/**
 * Rewrite mod / invmod / etc. so integer modular arithmetic stays exact.
 * Returns { expr, rewrote, notes[] }
 */
export function rewriteExactIntegerOps(expr) {
  const notes = [];
  let s = expr;
  let rewrote = false;
  let guard = 0;

  // Repeatedly rewrite mod(...) calls
  while (guard++ < 32) {
    const next = rewriteOneModCall(s);
    if (!next) break;
    s = next.expr;
    rewrote = true;
    notes.push(...next.notes);
  }

  return { expr: s, rewrote, notes };
}

function rewriteOneModCall(s) {
  // Find "mod(" not already modmul/modpow/invmod
  const re = /(?<![\w.])mod\s*\(/gi;
  let m;
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1;
    const close = findMatchingParen(s, open);
    if (close < 0) continue;
    const inside = s.slice(open + 1, close);
    const args = splitTopLevelArgs(inside);
    if (args.length !== 2) continue;

    const [body, modulus] = args;
    const factors = splitTopLevelProduct(body);
    if (factors.length >= 2) {
      // mod(a*b*c, m) → modmul(modmul(a,b,m),c,m)
      let folded = `modmul(${factors[0]}, ${factors[1]}, ${modulus})`;
      for (let i = 2; i < factors.length; i++) {
        folded = `modmul(${folded}, ${factors[i]}, ${modulus})`;
      }
      const expr = s.slice(0, m.index) + folded + s.slice(close + 1);
      return {
        expr,
        notes: [`rewrote mod(product, m) → modmul (exact integers)`],
      };
    }

    const pow = splitTopLevelPow(body);
    if (pow) {
      const [base, exp] = pow;
      const folded = `modpow(${base}, ${exp}, ${modulus})`;
      const expr = s.slice(0, m.index) + folded + s.slice(close + 1);
      return {
        expr,
        notes: [`rewrote mod(a^b, m) → modpow (exact integers)`],
      };
    }
  }
  return null;
}

function findMatchingParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Detect expressions that should prefer exact integer modular path in Auto mode.
 */
export function wantsExactIntegerPath(expr) {
  return /\b(mod|modmul|modpow|invmod|xgcd|gcd|lcm)\b/i.test(expr);
}

/* ------------------------------------------------------------------ *
 * Scope + evaluate
 * ------------------------------------------------------------------ */

function toRad(x, angleMode) {
  return angleMode === "DEG" ? (Number(x) * Math.PI) / 180 : Number(x);
}

function toDeg(x, angleMode) {
  return angleMode === "DEG" ? (Number(x) * 180) / Math.PI : Number(x);
}

function num(x) {
  if (typeof x === "bigint") return Number(x);
  if (x && x.isBigNumber) return x.toNumber();
  return Number(x);
}

/**
 * Build a scope with angle-aware trig and exact modular helpers.
 */
export function buildScope(angleMode, extra = {}, numberMode = "auto") {
  const wrap = (fn) => (x) => fn(toRad(x, angleMode));
  const wrapInv = (fn) => (x) => toDeg(fn(num(x)), angleMode);

  const exactOps = {
    mod: (a, b) => modExact(a, b),
    modmul: (a, b, m) => modmul(a, b, m),
    modpow: (base, exp, m) => modpow(base, exp, m),
    invmod: (a, m) => invmod(a, m),
    gcd: (...args) => gcdExact(...args),
    lcm: (...args) => lcmExact(...args),
    xgcd: (a, b) => xgcdExact(a, b),
  };

  return {
    // Trig (respects DEG / RAD)
    sin: wrap(Math.sin),
    cos: wrap(Math.cos),
    tan: wrap(Math.tan),
    asin: wrapInv(Math.asin),
    acos: wrapInv(Math.acos),
    atan: wrapInv(Math.atan),
    atan2: (y, x) => toDeg(Math.atan2(num(y), num(x)), angleMode),
    sinh: (x) => Math.sinh(num(x)),
    cosh: (x) => Math.cosh(num(x)),
    tanh: (x) => Math.tanh(num(x)),
    asinh: (x) => Math.asinh(num(x)),
    acosh: (x) => Math.acosh(num(x)),
    atanh: (x) => Math.atanh(num(x)),

    // Logs / exp
    ln: (x) => Math.log(num(x)),
    log: (x, base) =>
      base === undefined
        ? Math.log10(num(x))
        : Math.log(num(x)) / Math.log(num(base)),
    log10: (x) => Math.log10(num(x)),
    log2: (x) => Math.log2(num(x)),
    exp: (x) => Math.exp(num(x)),

    // Roots / powers (float; use modpow for modular)
    sqrt: (x) => Math.sqrt(num(x)),
    cbrt: (x) => Math.cbrt(num(x)),
    root: (x, n) => Math.pow(num(x), 1 / num(n)),
    pow: (x, y) => {
      // Integer power that may exceed MAX_SAFE_INTEGER → BigInt when both integers
      if (numberMode !== "number") {
        try {
          const xb = toBigInt(x);
          const yb = toBigInt(y);
          if (yb >= 0n && yb <= 100000n) {
            return fromBigInt(xb ** yb);
          }
        } catch {
          /* fall through to float */
        }
      }
      return Math.pow(num(x), num(y));
    },

    abs: (x) => {
      if (typeof x === "bigint") return x < 0n ? -x : x;
      return Math.abs(num(x));
    },
    floor: (x) => Math.floor(num(x)),
    ceil: (x) => Math.ceil(num(x)),
    round: (x, n = 0) => {
      const f = 10 ** num(n);
      return Math.round(num(x) * f) / f;
    },
    trunc: (x) => Math.trunc(num(x)),
    sign: (x) => {
      if (typeof x === "bigint") return x === 0n ? 0 : x > 0n ? 1 : -1;
      return Math.sign(num(x));
    },

    factorial: (n) => {
      let v = typeof n === "bigint" ? n : BigInt(Math.trunc(num(n)));
      if (v < 0n) throw new Error("factorial expects an integer ≥ 0");
      if (v > 10000n) throw new Error("factorial: n too large (max 10000 in exact mode)");
      // Float path limit for classic mode
      if (numberMode === "number" && v > 170n) {
        throw new Error("factorial expects an integer 0…170 in Float mode");
      }
      let r = 1n;
      for (let i = 2n; i <= v; i++) r *= i;
      return fromBigInt(r);
    },
    nCr: (n, r) => {
      n = toBigInt(typeof n === "number" || typeof n === "bigint" ? n : num(n));
      r = toBigInt(typeof r === "number" || typeof r === "bigint" ? r : num(r));
      if (r < 0n || n < 0n || r > n) return 0;
      r = r < n - r ? r : n - r;
      let nume = 1n;
      for (let i = 1n; i <= r; i++) {
        nume = (nume * (n - r + i)) / i;
      }
      return fromBigInt(nume);
    },
    nPr: (n, r) => {
      n = toBigInt(typeof n === "number" || typeof n === "bigint" ? n : num(n));
      r = toBigInt(typeof r === "number" || typeof r === "bigint" ? r : num(r));
      if (r < 0n || n < 0n || r > n) return 0;
      let p = 1n;
      for (let i = 0n; i < r; i++) p *= n - i;
      return fromBigInt(p);
    },

    percent: (x) => num(x) / 100,
    hypot: (...args) => Math.hypot(...args.map(num)),
    min: (...args) => Math.min(...args.map(num)),
    max: (...args) => Math.max(...args.map(num)),
    mean: (...args) => args.reduce((s, x) => s + num(x), 0) / args.length,
    sum: (...args) => {
      // Prefer bigint sum if all integers
      try {
        let s = 0n;
        for (const x of args) s += toBigInt(x);
        return fromBigInt(s);
      } catch {
        return args.reduce((s, x) => s + num(x), 0);
      }
    },
    rand: () => Math.random(),
    randi: (a, b) => {
      a = Math.ceil(num(a));
      b = Math.floor(num(b));
      return Math.floor(Math.random() * (b - a + 1)) + a;
    },

    pi: Math.PI,
    e: Math.E,
    phi: (1 + Math.sqrt(5)) / 2,
    tau: Math.PI * 2,
    deg: Math.PI / 180,
    rad: 180 / Math.PI,

    ...exactOps,
    ...extra,
  };
}

/**
 * Normalize user-friendly input into math.js-friendly expression text.
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

  // Infix-style "a mod b" → mod(a, b) when not already a function call form
  // Avoid transforming inside identifiers.
  s = s.replace(
    /([^,\s(]+(?:\([^)]*\))?)\s+mod\s+([^,)\s]+)/gi,
    "mod($1, $2)"
  );

  s = s
    .replace(/(\d)\s*([a-zA-Z_])/g, "$1*$2")
    .replace(/(\d)\s*\(/g, "$1*(")
    .replace(/\)\s*(\d)/g, ")*$1")
    .replace(/\)\s*\(/g, ")*(")
    .replace(/\)\s*([a-zA-Z_])/g, ")*$1")
    .replace(/(pi|e|tau|phi|ans|ans\d+)\s*\(/gi, "$1*(")
    .replace(/\bto\*([a-zA-Z_])/g, "to $1")
    .replace(/\bin\*([a-zA-Z_])/g, "in $1");

  return s;
}

export function parseStatement(raw) {
  const s = normalizeInput(raw);
  if (!s) return { kind: "empty" };

  const fnMatch = s.match(
    /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\)\s*=\s*(.+)$/
  );
  if (fnMatch) {
    return {
      kind: "fn",
      name: fnMatch[1],
      params: fnMatch[2].split(",").map((p) => p.trim()),
      body: fnMatch[3].trim(),
    };
  }

  const asg = s.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
  if (asg && !["e", "pi", "tau", "phi"].includes(asg[1])) {
    return { kind: "assign", name: asg[1], expr: asg[2].trim() };
  }

  return { kind: "eval", expr: s };
}

function pickMath(numberMode) {
  if (numberMode === "BigNumber") return mathBN;
  if (numberMode === "Fraction") return mathFrac;
  return math;
}

/**
 * Hydrate persisted variables (numbers or digit strings for big ints).
 */
export function hydrateVariables(variables = {}) {
  const out = {};
  for (const [k, v] of Object.entries(variables)) {
    if (typeof v === "string" && /^-?\d+n?$/.test(v)) {
      const bi = BigInt(v.replace(/n$/, ""));
      out[k] = fromBigInt(bi);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Evaluate expression.
 * @returns {{ value: *, meta: { rewrote: boolean, notes: string[], numberMode: string, precisionWarning: string|null } }}
 */
export function evaluate(
  expr,
  angleMode,
  variables = {},
  functions = {},
  numberMode = "auto"
) {
  const mode = numberMode || "auto";
  let work = expr;
  const notes = [];
  let rewrote = false;
  let precisionWarning = null;

  // Auto / BigNumber / Fraction: rewrite mod(a*b,m) → modmul and mod(a^b,m) → modpow
  // so intermediate products never go through IEEE doubles.
  // Explicit Float mode leaves the expression alone (and may warn).
  if (mode !== "number") {
    const rw = rewriteExactIntegerOps(work);
    work = rw.expr;
    rewrote = rw.rewrote;
    notes.push(...rw.notes);
  } else if (/\bmod\s*\([^)]*\*[^)]*,/i.test(expr) || /\bmod\s*\([^)]*\^[^)]*,/i.test(expr)) {
    precisionWarning =
      "Float mode can lose low bits past 2^53. Use Precision: Auto, or modmul(a, b, m) / modpow(a, e, m).";
  }

  const engine =
    mode === "BigNumber" ? mathBN : mode === "Fraction" ? mathFrac : math;

  const scope = buildScope(
    angleMode,
    hydrateVariables(variables),
    mode === "number" ? "number" : mode
  );

  for (const [name, def] of Object.entries(functions)) {
    scope[name] = (...args) => {
      const local = { ...scope };
      def.params.forEach((p, i) => {
        local[p] = args[i];
      });
      return engine.evaluate(def.body, local);
    };
  }

  const value = engine.evaluate(work, scope);

  return {
    value,
    meta: {
      rewrote,
      notes,
      numberMode: mode,
      precisionWarning,
      evaluatedExpr: work,
    },
  };
}

/** Back-compat: return value only (used by plotter). */
export function evaluateValue(expr, angleMode, variables = {}, functions = {}, numberMode = "auto") {
  return evaluate(expr, angleMode, variables, functions, numberMode).value;
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export function formatResult(value, opts = {}) {
  const format = opts.format || "auto";
  const digits = opts.digits ?? 12;

  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";

  // Native BigInt — always exact decimal string (never sci notation)
  if (typeof value === "bigint") {
    return formatBigInt(value, format, digits);
  }

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
      return math.format(value, {
        precision: digits,
        notation: "fixed",
      });
    } catch {
      return String(value);
    }
  }

  // BigNumber — prefer exact integer string when integer
  if (value && typeof value === "object" && value.isBigNumber) {
    if (value.isInteger()) {
      return formatBigInt(BigInt(value.toFixed(0)), format, digits);
    }
    if (format === "sci") return value.toExponential(Math.max(0, digits - 1));
    return stripTrailingZeros(value.toString());
  }

  // Fraction
  if (value && typeof value === "object" && value.isFraction) {
    if (String(value.d) === "1") {
      return String(Number(value.n) * (value.s < 0 ? -1 : 1));
    }
    const nume = (value.s < 0 ? "-" : "") + String(value.n);
    return `${nume}/${value.d}`;
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
      const n = f.n * (f.s < 0 ? -1 : 1);
      return `${n}/${f.d}`;
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

  // auto — integers as full decimal (no sci for safe ints)
  if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
    return String(value);
  }
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
    return value.toExponential(Math.min(digits - 1, 11));
  }
  const s = value.toPrecision(digits);
  return stripTrailingZeros(String(Number(s) === value ? Number(s) : s));
}

function formatBigInt(value, format, digits) {
  if (format === "sci") {
    // Scientific only if explicitly requested
    const s = value < 0n ? -value : value;
    const str = s.toString();
    if (str.length === 1) return (value < 0n ? "-" : "") + str;
    const exp = str.length - 1;
    const mant = `${str[0]}.${str.slice(1, digits)}`.replace(/\.$/, "");
    return `${value < 0n ? "-" : ""}${stripTrailingZeros(mant)}e+${exp}`;
  }
  return value.toString();
}

function stripTrailingZeros(s) {
  if (!s.includes(".")) return s;
  if (s.includes("e") || s.includes("E")) {
    return s.replace(/(\.\d*?[1-9])0+(e)/i, "$1$2").replace(/\.0+(e)/i, "$1");
  }
  return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

export function nearlyEqual(a, b, eps = 1e-10) {
  if (typeof a === "bigint" || typeof b === "bigint") return a === b;
  if (typeof a !== "number" || typeof b !== "number") return false;
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

export function sampleFunction(
  body,
  xMin,
  xMax,
  steps,
  angleMode,
  variables = {},
  functions = {},
  numberMode = "auto"
) {
  const pts = [];
  const dx = (xMax - xMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + dx * i;
    try {
      const y = evaluateValue(body, angleMode, { ...variables, x }, functions, numberMode);
      const yn = typeof y === "number" ? y : typeof y === "bigint" ? Number(y) : Number(y);
      if (Number.isFinite(yn)) pts.push({ x, y: yn });
      else pts.push({ x, y: null });
    } catch {
      pts.push({ x, y: null });
    }
  }
  return pts;
}

/** Serialize a value for localStorage variables / ans */
export function toStorable(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    if (value <= MAX_SAFE && value >= MIN_SAFE) return Number(value);
    return value.toString();
  }
  if (value && value.isBigNumber && value.isInteger()) {
    const bi = BigInt(value.toFixed(0));
    if (bi <= MAX_SAFE && bi >= MIN_SAFE) return Number(bi);
    return bi.toString();
  }
  return undefined;
}

export { math, mathBN, mathFrac };
