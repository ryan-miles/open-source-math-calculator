/**
 * Regression tests for exact modular arithmetic (2^53 safety).
 * Run: node scripts/test-mod.mjs
 */
import {
  evaluate,
  normalizeInput,
  formatResult,
  invmod,
  modmul,
  modpow,
  rewriteExactIntegerOps,
} from "../src/engine.js";

let failed = 0;

function assertEq(name, got, want) {
  const g = String(got);
  const w = String(want);
  if (g !== w) {
    console.error(`FAIL ${name}: got ${g}, want ${w}`);
    failed++;
  } else {
    console.log(`OK   ${name}: ${g}`);
  }
}

function evalAuto(expr) {
  return evaluate(normalizeInput(expr), "DEG", {}, {}, "auto");
}

// Core feedback cases
assertEq("invmod", formatResult(evalAuto("invmod(314159265, 1000000007)").value), "575450284");
assertEq(
  "mod product → 1",
  formatResult(evalAuto("mod(314159265 * 575450284, 1000000007)").value),
  "1"
);

const powWant = formatResult(modpow(2n, 60n, 1000000007n));
assertEq("mod(2^60, m)", formatResult(evalAuto("mod(2^60, 1000000007)").value), powWant);

const inv2 = evalAuto("invmod(2^30 + 3, 10^9 + 7)").value;
assertEq("invmod(2^30+3, 10^9+7) verify", formatResult(modmul(2 ** 30 + 3, inv2, 10 ** 9 + 7)), "1");

// Rewrite
assertEq(
  "rewrite product",
  rewriteExactIntegerOps("mod(314159265 * 575450284, 1000000007)").expr,
  "modmul(314159265, 575450284, 1000000007)"
);
assertEq(
  "rewrite pow",
  rewriteExactIntegerOps("mod(2^60, 1000000007)").expr,
  "modpow(2, 60, 1000000007)"
);

// Direct helpers
assertEq("modmul direct", formatResult(modmul(314159265, 575450284, 1000000007)), "1");
assertEq("invmod direct", formatResult(invmod(314159265, 1000000007)), "575450284");

// Float mode still wrong / warns
const floatOut = evaluate(
  normalizeInput("mod(314159265 * 575450284, 1000000007)"),
  "DEG",
  {},
  {},
  "number"
);
assertEq("float mode wrong product", formatResult(floatOut.value), "999999996");
if (!floatOut.meta.precisionWarning) {
  console.error("FAIL float mode should set precisionWarning");
  failed++;
} else {
  console.log("OK   float mode warning present");
}

// Everyday still works
assertEq("2+2", formatResult(evalAuto("2+2").value), "4");

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll modular arithmetic tests passed.");
