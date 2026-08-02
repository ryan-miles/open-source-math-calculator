import "./style.css";
import "katex/dist/katex.min.css";
import katex from "katex";
import {
  parseStatement,
  evaluate,
  formatResult,
  normalizeInput,
  sampleFunction,
  math,
} from "./engine.js";
import { createPlotter } from "./plotter.js";
import { KEYPAD, EXAMPLES } from "./keypad.js";
import { GUIDE_MARKDOWN } from "./guide-export.js";

const $ = (id) => document.getElementById(id);

const el = {
  expr: $("expr"),
  result: $("result"),
  live: $("live-preview"),
  katex: $("katex-preview"),
  status: $("status-chip"),
  history: $("history-list"),
  vars: $("vars-list"),
  keypad: $("keypad"),
  format: $("format-select"),
  digits: $("digits-input"),
  example: $("example-select"),
  toast: $("toast"),
  memInd: $("mem-indicator"),
  memVal: $("mem-value"),
  sidePane: $("side-pane"),
  splitter: $("splitter"),
  graphPane: $("graph-pane"),
  plotExpr: $("plot-expr"),
  xMin: $("x-min"),
  xMax: $("x-max"),
  plotCanvas: $("plot-canvas"),
  helpDialog: $("help-dialog"),
};

const STORE_KEY = "open-source-math-calculator:v1";
const MAX_HISTORY = 80;

const state = {
  angleMode: "DEG",
  pad: "num",
  history: [],
  variables: {}, // plain numbers / serializable
  functions: {}, // { name: { params, body } }
  memory: null,
  ans: 0,
  histCursor: -1, // -1 = live expr; >=0 index into history for ↑/↓
  liveDraft: "",
  graphOpen: false,
};

const plotter = createPlotter(el.plotCanvas);

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

function saveState() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        expr: el.expr.value,
        angleMode: state.angleMode,
        format: el.format.value,
        digits: el.digits.value,
        uiTheme: document.documentElement.dataset.uiTheme,
        history: state.history.slice(0, MAX_HISTORY),
        variables: state.variables,
        functions: state.functions,
        memory: state.memory,
        ans: state.ans,
        graphOpen: state.graphOpen,
        plotExpr: el.plotExpr.value,
        xMin: el.xMin.value,
        xMax: el.xMax.value,
        split: el.sidePane.style.flexBasis,
      })
    );
  } catch {
    /* private mode / quota */
  }
}

function loadState() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    saved = {};
  }

  if (saved.expr != null) el.expr.value = saved.expr;
  if (saved.angleMode) state.angleMode = saved.angleMode;
  if (saved.format) el.format.value = saved.format;
  if (saved.digits) el.digits.value = saved.digits;
  if (saved.uiTheme) document.documentElement.dataset.uiTheme = saved.uiTheme;
  if (Array.isArray(saved.history)) state.history = saved.history;
  if (saved.variables && typeof saved.variables === "object") state.variables = saved.variables;
  if (saved.functions && typeof saved.functions === "object") state.functions = saved.functions;
  if (saved.memory != null && Number.isFinite(saved.memory)) state.memory = saved.memory;
  if (typeof saved.ans === "number") state.ans = saved.ans;
  if (saved.graphOpen) state.graphOpen = true;
  if (saved.plotExpr) el.plotExpr.value = saved.plotExpr;
  if (saved.xMin != null) el.xMin.value = saved.xMin;
  if (saved.xMax != null) el.xMax.value = saved.xMax;
  if (saved.split) el.sidePane.style.flexBasis = saved.split;
}

/* ------------------------------------------------------------------ *
 * UI helpers
 * ------------------------------------------------------------------ */

let toastTimer;
function toast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle("error", isError);
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.toast.hidden = true), isError ? 5000 : 2400);
}

function setStatus(kind, text) {
  el.status.className = `chip ${kind}`;
  el.status.textContent = text;
}

function formatOpts() {
  return {
    format: el.format.value,
    digits: Math.min(16, Math.max(2, Number(el.digits.value) || 12)),
  };
}

function scopeVars() {
  return { ...state.variables, ans: state.ans };
}

/* ------------------------------------------------------------------ *
 * Evaluate
 * ------------------------------------------------------------------ */

function runEvaluate({ silent = false } = {}) {
  const raw = el.expr.value;
  const stmt = parseStatement(raw);

  if (stmt.kind === "empty") {
    el.result.textContent = formatResult(state.ans, formatOpts());
    el.result.classList.remove("error");
    setStatus("ok", "Ready");
    el.live.textContent = "";
    return null;
  }

  try {
    let displayExpr = normalizeInput(raw);
    let value;
    let note = "";

    if (stmt.kind === "assign") {
      value = evaluate(stmt.expr, state.angleMode, scopeVars(), state.functions);
      // Only store serializable scalars in variables map for persistence
      const n = toStorable(value);
      if (n !== undefined) state.variables[stmt.name] = n;
      else state.variables[stmt.name] = Number(value);
      note = ` → ${stmt.name}`;
      displayExpr = `${stmt.name} = ${stmt.expr}`;
    } else if (stmt.kind === "fn") {
      state.functions[stmt.name] = { params: stmt.params, body: stmt.body };
      value = `function ${stmt.name}(${stmt.params.join(", ")})`;
      note = " defined";
      displayExpr = `${stmt.name}(${stmt.params.join(", ")}) = ${stmt.body}`;
    } else {
      value = evaluate(stmt.expr, state.angleMode, scopeVars(), state.functions);
    }

    const formatted = formatResult(value, formatOpts());
    el.result.textContent = formatted;
    el.result.classList.remove("error");
    setStatus("ok", stmt.kind === "fn" ? "Defined" : "OK");

    if (typeof value === "number" && Number.isFinite(value)) {
      state.ans = value;
    } else if (value && typeof value === "object" && value.isUnit) {
      try {
        state.ans = value.toNumber();
      } catch {
        /* unit without numeric base */
      }
    }

    if (!silent) {
      pushHistory({
        expr: displayExpr,
        result: formatted,
        ok: true,
        raw,
      });
      renderHistory();
      renderVars();
      saveState();
      renderKatex(displayExpr);
    }

    el.live.textContent = note ? `${formatted}${note}` : "";
    return value;
  } catch (err) {
    const msg = cleanError(err);
    el.result.textContent = msg;
    el.result.classList.add("error");
    setStatus("err", "Error");
    el.live.textContent = "";
    if (!silent) {
      pushHistory({ expr: normalizeInput(raw) || raw, result: msg, ok: false, raw });
      renderHistory();
      saveState();
    }
    return null;
  }
}

function livePreview() {
  const raw = el.expr.value.trim();
  if (!raw) {
    el.live.textContent = "";
    el.result.textContent = formatResult(state.ans, formatOpts());
    el.result.classList.remove("error");
    setStatus("ok", "Ready");
    el.katex.hidden = true;
    return;
  }

  const stmt = parseStatement(raw);
  if (stmt.kind === "empty") return;

  try {
    if (stmt.kind === "fn") {
      el.live.textContent = `define ${stmt.name}(${stmt.params.join(", ")})`;
      setStatus("ok", "Function");
      el.result.classList.remove("error");
      return;
    }
    const expr = stmt.kind === "assign" ? stmt.expr : stmt.expr;
    const value = evaluate(expr, state.angleMode, scopeVars(), state.functions);
    const formatted = formatResult(value, formatOpts());
    el.live.textContent =
      stmt.kind === "assign" ? `${stmt.name} ← ${formatted}` : `= ${formatted}`;
    setStatus("ok", "Live");
    // Soft-update result while typing only if not a definition
    if (stmt.kind === "eval") {
      el.result.textContent = formatted;
      el.result.classList.remove("error");
    }
  } catch (err) {
    el.live.textContent = "";
    setStatus("warn", "…");
  }
}

function toStorable(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function cleanError(err) {
  let m = err?.message || String(err);
  m = m.replace(/^Error:\s*/i, "");
  // math.js verbose bits
  m = m.split("\n")[0];
  if (m.length > 120) m = m.slice(0, 117) + "…";
  return m;
}

function pushHistory(entry) {
  state.history.unshift({
    ...entry,
    t: Date.now(),
  });
  if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
  state.histCursor = -1;
}

/* ------------------------------------------------------------------ *
 * Render panels
 * ------------------------------------------------------------------ */

function renderHistory() {
  if (!state.history.length) {
    el.history.innerHTML =
      '<div class="history-empty">Results appear here. Click a row to reuse the expression or result.</div>';
    return;
  }

  el.history.innerHTML = state.history
    .map((h, i) => {
      const cls = h.ok ? "history-item" : "history-item error";
      return `<button type="button" class="${cls}" data-hist="${i}" role="listitem">
        <div class="h-expr">${escapeHtml(h.expr)}</div>
        <div class="h-result">${escapeHtml(h.result)}</div>
      </button>`;
    })
    .join("");
}

function renderVars() {
  const names = Object.keys(state.variables).sort();
  const fns = Object.keys(state.functions).sort();

  if (!names.length && !fns.length) {
    el.vars.innerHTML =
      '<div class="vars-empty">Assign with <code>x = 3</code> or <code>f(x) = x^2</code></div>';
    return;
  }

  let html = "";
  for (const n of names) {
    html += `<div class="var-row"><span class="var-name">${escapeHtml(n)}</span><span class="var-val">${escapeHtml(formatResult(state.variables[n], formatOpts()))}</span></div>`;
  }
  for (const n of fns) {
    const f = state.functions[n];
    html += `<div class="var-row"><span class="var-name">${escapeHtml(n)}(${escapeHtml(f.params.join(","))})</span><span class="var-val">${escapeHtml(f.body)}</span></div>`;
  }
  el.vars.innerHTML = html;
}

function renderMemory() {
  if (state.memory == null) {
    el.memInd.hidden = true;
    el.memVal.textContent = "";
  } else {
    el.memInd.hidden = false;
    el.memVal.textContent = formatResult(state.memory, formatOpts());
  }
}

function renderAngle() {
  document.querySelectorAll(".seg-btn[data-angle]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.angle === state.angleMode);
  });
}

function renderKatex(expr) {
  try {
    // Rough conversion for display only
    let tex = expr
      .replace(/\*/g, "\\cdot ")
      .replace(/pi/g, "\\pi ")
      .replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}")
      .replace(/\^(\d+)/g, "^{$1}")
      .replace(/\^\{([^}]+)\}/g, "^{$1}")
      .replace(/\^([a-zA-Z])/g, "^{$1}");
    katex.render(tex, el.katex, { throwOnError: false, displayMode: false });
    el.katex.hidden = false;
  } catch {
    el.katex.hidden = true;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------ *
 * Keypad
 * ------------------------------------------------------------------ */

function renderKeypad() {
  const rows = KEYPAD[state.pad] || KEYPAD.num;
  el.keypad.innerHTML = rows
    .map(
      (row) =>
        `<div class="key-row">${row
          .map((k) => {
            const cls = ["key", k.cls].filter(Boolean).join(" ");
            const title = k.title ? ` title="${escapeHtml(k.title)}"` : "";
            const action = k.action ? ` data-action="${k.action}"` : "";
            const insert = k.insert != null ? ` data-insert="${escapeHtml(k.insert)}"` : "";
            const wrap = k.wrap
              ? ` data-wrap-pre="${escapeHtml(k.wrap[0])}" data-wrap-post="${escapeHtml(k.wrap[1])}"`
              : "";
            return `<button type="button" class="${cls}"${title}${action}${insert}${wrap}>${escapeHtml(k.label)}</button>`;
          })
          .join("")}</div>`
    )
    .join("");
}

function insertAtCaret(text) {
  const ta = el.expr;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  const v = ta.value;
  ta.value = v.slice(0, start) + text + v.slice(end);
  const pos = start + text.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
  onExprInput();
}

function wrapSelection(pre, post) {
  const ta = el.expr;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  const v = ta.value;
  const selected = v.slice(start, end);
  ta.value = v.slice(0, start) + pre + selected + post + v.slice(end);
  if (selected) {
    const pos = start + pre.length + selected.length + post.length;
    ta.setSelectionRange(pos, pos);
  } else {
    const pos = start + pre.length;
    ta.setSelectionRange(pos, pos);
  }
  ta.focus();
  onExprInput();
}

function handleKeyAction(action) {
  switch (action) {
    case "clear":
      el.expr.value = "";
      el.result.textContent = formatResult(state.ans, formatOpts());
      el.result.classList.remove("error");
      el.live.textContent = "";
      el.katex.hidden = true;
      setStatus("ok", "Ready");
      el.expr.focus();
      saveState();
      break;
    case "backspace": {
      const ta = el.expr;
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      if (start !== end) {
        ta.value = ta.value.slice(0, start) + ta.value.slice(end);
        ta.setSelectionRange(start, start);
      } else if (start > 0) {
        ta.value = ta.value.slice(0, start - 1) + ta.value.slice(start);
        ta.setSelectionRange(start - 1, start - 1);
      }
      ta.focus();
      onExprInput();
      break;
    }
    case "equals":
      runEvaluate();
      break;
    case "negate": {
      const ta = el.expr;
      const v = ta.value;
      if (!v.trim()) {
        insertAtCaret("-");
        return;
      }
      // Toggle leading minus on whole expression if no selection
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start === end && start === v.length) {
        if (v.startsWith("-")) {
          ta.value = v.slice(1);
        } else {
          ta.value = "-(" + v + ")";
        }
        ta.setSelectionRange(ta.value.length, ta.value.length);
        onExprInput();
      } else {
        wrapSelection("-(", ")");
      }
      break;
    }
    default:
      break;
  }
}

/* ------------------------------------------------------------------ *
 * Memory
 * ------------------------------------------------------------------ */

function memoryOp(op) {
  const current = (() => {
    try {
      const stmt = parseStatement(el.expr.value);
      if (stmt.kind === "eval") {
        const v = evaluate(stmt.expr, state.angleMode, scopeVars(), state.functions);
        if (typeof v === "number" && Number.isFinite(v)) return v;
      }
    } catch {
      /* use ans */
    }
    return typeof state.ans === "number" ? state.ans : 0;
  })();

  switch (op) {
    case "MC":
      state.memory = null;
      toast("Memory cleared");
      break;
    case "MR":
      if (state.memory == null) {
        toast("Memory empty", true);
        return;
      }
      insertAtCaret(String(state.memory));
      break;
    case "M+":
      state.memory = (state.memory ?? 0) + current;
      toast(`M = ${formatResult(state.memory, formatOpts())}`);
      break;
    case "M−":
      state.memory = (state.memory ?? 0) - current;
      toast(`M = ${formatResult(state.memory, formatOpts())}`);
      break;
    case "MS":
      state.memory = current;
      toast(`Stored ${formatResult(state.memory, formatOpts())}`);
      break;
    default:
      break;
  }
  renderMemory();
  saveState();
}

/* ------------------------------------------------------------------ *
 * Graph
 * ------------------------------------------------------------------ */

function setGraphOpen(open) {
  state.graphOpen = open;
  el.graphPane.hidden = !open;
  $("plot-toggle").classList.toggle("primary", open);
  if (open) {
    requestAnimationFrame(() => {
      redrawPlot();
    });
  }
  saveState();
}

function redrawPlot() {
  if (el.graphPane.hidden) return;
  const body = (el.plotExpr.value || "sin(x)").trim();
  const xMin = Number(el.xMin.value);
  const xMax = Number(el.xMax.value);
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) {
    toast("Invalid x range", true);
    return;
  }

  // If body looks like f(x)=..., extract RHS
  let expr = body;
  const fnDef = body.match(/^([a-zA-Z_]\w*)\s*\(\s*x\s*\)\s*=\s*(.+)$/);
  if (fnDef) expr = fnDef[2];

  const points = sampleFunction(
    expr,
    xMin,
    xMax,
    400,
    state.angleMode,
    scopeVars(),
    state.functions
  );

  const theme = document.documentElement.dataset.uiTheme === "light" ? "light" : "dark";
  plotter.draw({ points, xMin, xMax, theme, expression: expr });
}

/* ------------------------------------------------------------------ *
 * Splitter
 * ------------------------------------------------------------------ */

function initSplitter() {
  const split = el.splitter;
  let dragging = false;

  const onMove = (e) => {
    if (!dragging) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    if (x == null) return;
    const min = 160;
    const max = Math.min(480, window.innerWidth * 0.45);
    const w = Math.max(min, Math.min(max, x));
    el.sidePane.style.flexBasis = `${w}px`;
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    saveState();
  };

  split.addEventListener("mousedown", (e) => {
    dragging = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

function onExprInput() {
  state.histCursor = -1;
  livePreview();
  saveState();
}

function initEvents() {
  el.expr.addEventListener("input", onExprInput);

  el.expr.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runEvaluate();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleKeyAction("clear");
      return;
    }
    if (e.key === "ArrowUp" && !e.altKey && !e.metaKey) {
      // Only hijack when caret at start or single-line feel
      if (el.expr.selectionStart === 0 || state.histCursor >= 0) {
        e.preventDefault();
        browseHistory(1);
      }
      return;
    }
    if (e.key === "ArrowDown" && !e.altKey && !e.metaKey) {
      if (state.histCursor >= 0) {
        e.preventDefault();
        browseHistory(-1);
      }
    }
  });

  el.keypad.addEventListener("click", (e) => {
    const btn = e.target.closest(".key");
    if (!btn) return;
    if (btn.dataset.action) {
      handleKeyAction(btn.dataset.action);
      return;
    }
    if (btn.dataset.wrapPre != null) {
      wrapSelection(btn.dataset.wrapPre, btn.dataset.wrapPost || "");
      return;
    }
    if (btn.dataset.insert != null) {
      insertAtCaret(btn.dataset.insert);
    }
  });

  document.querySelectorAll(".keypad-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.pad = tab.dataset.pad;
      document.querySelectorAll(".keypad-tabs .tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
      });
      renderKeypad();
    });
  });

  document.querySelectorAll(".seg-btn[data-angle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.angleMode = btn.dataset.angle;
      renderAngle();
      livePreview();
      if (state.graphOpen) redrawPlot();
      saveState();
    });
  });

  el.format.addEventListener("change", () => {
    livePreview();
    renderHistory();
    renderVars();
    renderMemory();
    saveState();
  });

  el.digits.addEventListener("change", () => {
    livePreview();
    renderHistory();
    renderVars();
    renderMemory();
    saveState();
  });

  el.history.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-hist]");
    if (!btn) return;
    const i = Number(btn.dataset.hist);
    const h = state.history[i];
    if (!h) return;
    // Click expression area vs result: always load expression; double path
    // Use result if they click the result line and it was ok
    if (e.target.classList.contains("h-result") && h.ok) {
      el.expr.value = h.result;
    } else {
      el.expr.value = h.raw || h.expr;
    }
    el.expr.focus();
    onExprInput();
  });

  $("clear-history").addEventListener("click", () => {
    state.history = [];
    renderHistory();
    saveState();
    toast("History cleared");
  });

  $("clear-vars").addEventListener("click", () => {
    state.variables = {};
    state.functions = {};
    renderVars();
    saveState();
    toast("Variables cleared");
  });

  document.querySelectorAll("[data-mem]").forEach((btn) => {
    btn.addEventListener("click", () => memoryOp(btn.dataset.mem));
  });

  $("ui-theme-btn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.uiTheme;
    document.documentElement.dataset.uiTheme = cur === "dark" ? "light" : "dark";
    if (state.graphOpen) redrawPlot();
    saveState();
  });

  $("plot-toggle").addEventListener("click", () => setGraphOpen(!state.graphOpen));
  $("plot-btn").addEventListener("click", () => {
    if (!el.plotExpr.value.trim() && el.expr.value.trim()) {
      el.plotExpr.value = el.expr.value.trim();
    }
    redrawPlot();
  });
  el.plotExpr.addEventListener("change", redrawPlot);
  el.xMin.addEventListener("change", redrawPlot);
  el.xMax.addEventListener("change", redrawPlot);

  function openGuide(section = "overview") {
    showHelpSection(section);
    el.helpDialog.showModal();
  }

  function showHelpSection(id) {
    document.querySelectorAll(".help-nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.helpSec === id);
    });
    document.querySelectorAll("[data-help-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.helpPanel !== id;
    });
  }

  async function copyGuideForAi() {
    const text = GUIDE_MARKDOWN;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // file:// or older browsers
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast("Guide copied as Markdown — paste into your AI agent");
    } catch (err) {
      toast("Could not copy to clipboard", true);
      console.error(err);
    }
  }

  $("help-btn").addEventListener("click", () => openGuide("overview"));
  $("about-open-guide")?.addEventListener("click", () => openGuide("overview"));
  $("about-copy-ai")?.addEventListener("click", () => copyGuideForAi());
  $("help-copy-ai")?.addEventListener("click", () => copyGuideForAi());
  $("help-close")?.addEventListener("click", () => el.helpDialog.close());
  $("help-close-footer")?.addEventListener("click", () => el.helpDialog.close());

  document.querySelectorAll(".help-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => showHelpSection(btn.dataset.helpSec));
  });

  el.helpDialog.addEventListener("click", (e) => {
    // Click backdrop (dialog itself) to close
    if (e.target === el.helpDialog) el.helpDialog.close();
  });

  // Examples
  EXAMPLES.forEach((ex, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = ex.name;
    el.example.appendChild(opt);
  });
  el.example.addEventListener("change", () => {
    const i = Number(el.example.value);
    if (!Number.isFinite(i) || !EXAMPLES[i]) return;
    const ex = EXAMPLES[i];
    if (ex.setup) {
      // Run setup assignments
      for (const part of ex.setup.split(";")) {
        const s = part.trim();
        if (!s) continue;
        el.expr.value = s;
        runEvaluate({ silent: true });
      }
    }
    el.expr.value = ex.expr;
    if (ex.plot) {
      el.plotExpr.value = ex.expr;
      setGraphOpen(true);
      redrawPlot();
    }
    onExprInput();
    el.example.value = "";
    el.expr.focus();
    renderVars();
    saveState();
  });

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      el.expr.focus();
      el.expr.select();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "g") {
      e.preventDefault();
      setGraphOpen(!state.graphOpen);
    }
  });

  window.addEventListener("resize", () => {
    if (state.graphOpen) redrawPlot();
  });
}

function browseHistory(dir) {
  // dir +1 = older, -1 = newer
  if (!state.history.length) return;
  if (state.histCursor === -1) state.liveDraft = el.expr.value;
  const next = state.histCursor + dir;
  if (next < -1) return;
  if (next >= state.history.length) return;
  state.histCursor = next;
  if (next === -1) {
    el.expr.value = state.liveDraft;
  } else {
    el.expr.value = state.history[next].raw || state.history[next].expr;
  }
  livePreview();
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

function boot() {
  loadState();
  renderAngle();
  renderKeypad();
  renderHistory();
  renderVars();
  renderMemory();
  initSplitter();
  initEvents();

  if (state.graphOpen) {
    el.graphPane.hidden = false;
    $("plot-toggle").classList.add("primary");
  }

  // Seed display
  if (el.expr.value.trim()) {
    livePreview();
  } else {
    el.result.textContent = formatResult(state.ans, formatOpts());
  }

  // Unit conversion uses math.js built-in evaluate path for "to"/"in"
  // Ensure math is available for advanced console use
  window.calc = { math, evaluate, state, runEvaluate };

  if (state.graphOpen) {
    requestAnimationFrame(redrawPlot);
  }
}

boot();
