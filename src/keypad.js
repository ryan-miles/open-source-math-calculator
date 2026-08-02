/**
 * Keypad layout definitions.
 * Each key: { label, insert?, action?, cls?, title? }
 * - insert: text to insert at caret
 * - action: named action handled in main.js
 * - wrap: [prefix, suffix] wraps selection / inserts with caret between
 */

export const KEYPAD = {
  num: [
    [
      { label: "C", action: "clear", cls: "warn" },
      { label: "⌫", action: "backspace", cls: "muted" },
      { label: "(", insert: "(" },
      { label: ")", insert: ")" },
      { label: "÷", insert: "÷", cls: "op" },
    ],
    [
      { label: "7", insert: "7" },
      { label: "8", insert: "8" },
      { label: "9", insert: "9" },
      { label: "×", insert: "×", cls: "op" },
      { label: "%", insert: "%", cls: "op" },
    ],
    [
      { label: "4", insert: "4" },
      { label: "5", insert: "5" },
      { label: "6", insert: "6" },
      { label: "−", insert: "−", cls: "op" },
      { label: "1/x", wrap: ["1/(", ")"], cls: "fn" },
    ],
    [
      { label: "1", insert: "1" },
      { label: "2", insert: "2" },
      { label: "3", insert: "3" },
      { label: "+", insert: "+", cls: "op" },
      { label: "x²", insert: "²", cls: "fn" },
    ],
    [
      { label: "±", action: "negate", cls: "muted" },
      { label: "0", insert: "0" },
      { label: ".", insert: "." },
      { label: "ans", insert: "ans", cls: "fn" },
      { label: "=", action: "equals", cls: "primary equals" },
    ],
  ],

  sci: [
    [
      { label: "sin", wrap: ["sin(", ")"], cls: "fn" },
      { label: "cos", wrap: ["cos(", ")"], cls: "fn" },
      { label: "tan", wrap: ["tan(", ")"], cls: "fn" },
      { label: "π", insert: "π", cls: "const" },
      { label: "e", insert: "e", cls: "const" },
    ],
    [
      { label: "asin", wrap: ["asin(", ")"], cls: "fn" },
      { label: "acos", wrap: ["acos(", ")"], cls: "fn" },
      { label: "atan", wrap: ["atan(", ")"], cls: "fn" },
      { label: "τ", insert: "τ", cls: "const" },
      { label: "φ", insert: "phi", cls: "const" },
    ],
    [
      { label: "ln", wrap: ["ln(", ")"], cls: "fn" },
      { label: "log", wrap: ["log(", ")"], cls: "fn" },
      { label: "log₂", wrap: ["log2(", ")"], cls: "fn" },
      { label: "exp", wrap: ["exp(", ")"], cls: "fn" },
      { label: "10ˣ", wrap: ["10^(", ")"], cls: "fn" },
    ],
    [
      { label: "√", wrap: ["√(", ")"], cls: "fn" },
      { label: "∛", wrap: ["cbrt(", ")"], cls: "fn" },
      { label: "xʸ", insert: "^", cls: "op" },
      { label: "x!", wrap: ["factorial(", ")"], cls: "fn" },
      { label: "|x|", wrap: ["abs(", ")"], cls: "fn" },
    ],
    [
      { label: "nCr", wrap: ["nCr(", ")"], cls: "fn", title: "Combinations" },
      { label: "nPr", wrap: ["nPr(", ")"], cls: "fn", title: "Permutations" },
      { label: "mod", insert: " mod ", cls: "op" },
      { label: "rand", insert: "rand()", cls: "fn" },
      { label: ",", insert: ", ", cls: "muted" },
    ],
  ],

  more: [
    [
      { label: "sinh", wrap: ["sinh(", ")"], cls: "fn" },
      { label: "cosh", wrap: ["cosh(", ")"], cls: "fn" },
      { label: "tanh", wrap: ["tanh(", ")"], cls: "fn" },
      { label: "floor", wrap: ["floor(", ")"], cls: "fn" },
      { label: "ceil", wrap: ["ceil(", ")"], cls: "fn" },
    ],
    [
      { label: "round", wrap: ["round(", ")"], cls: "fn" },
      { label: "hypot", wrap: ["hypot(", ")"], cls: "fn" },
      { label: "min", wrap: ["min(", ")"], cls: "fn" },
      { label: "max", wrap: ["max(", ")"], cls: "fn" },
      { label: "mean", wrap: ["mean(", ")"], cls: "fn" },
    ],
    [
      { label: "gcd", wrap: ["gcd(", ")"], cls: "fn" },
      { label: "lcm", wrap: ["lcm(", ")"], cls: "fn" },
      { label: "sum", wrap: ["sum(", ")"], cls: "fn" },
      { label: "to", insert: " to ", cls: "op", title: "Unit convert: 5 ft to m" },
      { label: "in", insert: " in ", cls: "op", title: "Unit convert: 100 km/h in mph" },
    ],
  ],
};

export const EXAMPLES = [
  { name: "Quadratic roots", expr: "(-b + sqrt(b^2 - 4*a*c)) / (2*a)", setup: "a=1; b=-3; c=2" },
  { name: "Compound interest", expr: "P * (1 + r/n)^(n*t)", setup: "P=10000; r=0.05; n=12; t=10" },
  { name: "Law of cosines", expr: "sqrt(a^2 + b^2 - 2*a*b*cos(C))", setup: "a=5; b=7; C=60" },
  { name: "Combinations", expr: "nCr(52, 5)" },
  { name: "Unit convert", expr: "100 km/h to mph" },
  { name: "Temperature", expr: "72 degF to degC" },
  { name: "Define function", expr: "f(x) = x^2 * sin(x)" },
  { name: "Plot-friendly", expr: "sin(x) * exp(-x/5)", plot: true },
  { name: "Golden ratio", expr: "(1 + sqrt(5)) / 2" },
  { name: "Sphere volume", expr: "(4/3) * pi * r^3", setup: "r=3" },
];
