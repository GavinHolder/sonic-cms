#!/usr/bin/env node
/**
 * check-route-guards.mjs — default-deny scan for unguarded mutating API routes.
 *
 * Walks every app/<...>/route.* file, parses it with the TypeScript compiler API
 * (no regex on source text, so comments and string literals cannot fool it) and
 * requires every exported POST / PUT / PATCH / DELETE handler to be GUARDED, or to
 * appear in BASELINE_ALLOWLIST below with a written reason. GET is intentionally out
 * of scope (public reads are legitimate). Anything not provably guarded FAILS CLOSED.
 *
 * A handler is GUARDED only if, at the TOP LEVEL of the function body, or of its single
 * top-level `try` block, there is
 *     const X = [await] requireRole(...) | requireAuth(...) | resolveVolt3DUser(...)
 * (imported from lib/api-middleware / lib/volt-3d-auth), immediately followed by
 *     if (X instanceof Response | NextResponse) return X;
 * and nothing before that guard reads the request body (.json/.formData/...), touches
 * prisma / fetch / fs, or returns early. The ONLY await/call allowed before the guard is
 * reading the handler's own route params (`const { id } = await params`, `await ctx.params`);
 * any other await/call/`new` before it means NOT guarded. Nested, conditional, inverted
 * (`if (e) return e`), ignored-result, non-`const` (`let auth = ...`) or after-side-effect
 * guards are NOT guarded.
 *
 * Any export form other than `export [async] function POST(...)` for a mutating method
 * name (`export const POST = ...`, `export { x as POST }`, `export * from`, default
 * export) is reported as an "unrecognized export form" violation. A route file with a
 * syntax error is reported as a violation of its own (its handlers cannot be analyzed).
 *
 * ASSUMPTIONS:
 *  1. Route handlers live in files named route.{ts,tsx,js,jsx,mts,mjs} under app/.
 *  2. Guards are called by their imported name (aliasing a guard makes it unrecognized,
 *     which fails closed).
 *  3. `typescript` resolves from node_modules (devDependency) and still exposes
 *     `SourceFile.parseDiagnostics` (checked at runtime; the scan throws if it does not).
 *
 * FAILURE MODES:
 *  - Recognizer too strict  -> false violation -> CI fails -> fix the route or add a
 *    reviewed allowlist entry with a reason (never widen the recognizer casually).
 *  - Recognizer too loose   -> unguarded write ships silently; the synthetic-fixture
 *    tests in __tests__/unit/api/route-guards.test.ts pin every rejected shape.
 *  - Stale allowlist entry  -> reported as a warning only; never fails the run.
 *  - Unreadable directory   -> the scan THROWS (with the path) instead of skipping it, so a
 *    permissions problem can never turn into a silent pass.
 *  - Zero route files       -> the CLI exits non-zero (wrong root / moved app dir), never PASS.
 *
 * CLI:  node scripts/check-route-guards.mjs [--no-allowlist] [--all] [rootDir]
 *   --no-allowlist  ignore BASELINE_ALLOWLIST (lists every unguarded handler)
 *   --all           also list guarded handlers
 * Exit code 1 when any violation exists, no route files are found, or a directory cannot be read.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

export const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Pseudo-method used for the per-file violation raised when a route file has syntax errors. */
export const SYNTAX_ERROR_METHOD = "SYNTAX-ERROR";

const GUARD_MODULES = {
  requireRole: /(^|\/)api-middleware$/,
  requireAuth: /(^|\/)api-middleware$/,
  resolveVolt3DUser: /(^|\/)volt-3d-auth$/,
};
const RESPONSE_CLASSES = new Set(["Response", "NextResponse"]);
const BODY_READERS = new Set(["json", "formData", "text", "arrayBuffer", "blob"]);
const ALWAYS_RISKY_IDENTIFIERS = new Set(["prisma", "fetch"]);
const FS_MODULES = new Set(["fs", "node:fs", "fs/promises", "node:fs/promises"]);
const ROUTE_FILE_RE = /^route\.(ts|tsx|js|jsx|mts|mjs)$/;

/**
 * Reviewed exceptions: mutating handlers that are NOT guarded by requireRole/requireAuth.
 * Key = `<repo-relative path>#<METHOD>`. Every entry needs a reason a reviewer can audit.
 * Adding an entry is a security decision — do not add one just to make this scan pass.
 */
export const BASELINE_ALLOWLIST = Object.freeze({
  // ── Public writes: called by anonymous visitors by design ──
  "app/api/auth/login/route.ts#POST": "Public: credential login; issues the session cookies (rate-limited in-handler).",
  "app/api/auth/logout/route.ts#POST": "Public: only clears the caller's own session cookies.",
  "app/api/auth/refresh/route.ts#POST": "Public entry point: authenticates itself via the refresh_token cookie and mints a new access token.",
  "app/api/forms/submit/route.ts#POST": "Public: website visitor form submission. Hardening (SSRF / mail relay / OTP enforcement) is tracked for Phase 2.",
  "app/api/contact/route.ts#POST": "Public: website contact form.",
  "app/api/otp/send/route.ts#POST": "Public: visitor OTP request for public forms.",
  "app/api/otp/verify/route.ts#POST": "Public: visitor OTP verification for public forms.",
  "app/api/coverage/lead/route.ts#POST": "Public: coverage-checker lead capture.",
  "app/api/calculator/quote-request/route.ts#POST": "Public: calculator quote request from site visitors.",
  "app/api/coverage-maps/public/[slug]/check/route.ts#POST": "Public: coverage lookup for the public coverage-map widget.",
  // ── Guarded, but by an idiom the recognizer deliberately does not accept ──
  "app/api/cron/seo-engine/route.ts#POST": "Bearer CRON_SECRET, else requireRole(EDITOR) inside `if (!isCron)` — conditional guard; unset CRON_SECRET fails closed to requireRole.",
  "app/api/seo/audit/route.ts#POST": "Bearer CRON_SECRET, else requireRole(EDITOR) inside `if (!isCron)` — conditional guard; unset CRON_SECRET fails closed to requireRole.",
  "app/api/seo/ping-google/route.ts#POST": "authenticate() + manual 401 (equivalent to requireAuth); deprecated no-op endpoint. Migrate to requireAuth later.",
  // ── Known-broken guards (fail CLOSED, not open). Phase 2 fix. ──
  "app/api/gbp/locations/route.ts#PATCH": "Inverted guard `if (e) return e`: requireRole returns the JWT payload on success, so the handler body is unreachable for everyone (fails closed). Phase 2 fix.",
  "app/api/gbp/posts/route.ts#POST": "Inverted guard `if (e) return e`: requireRole returns the JWT payload on success, so the handler body is unreachable for everyone (fails closed). Phase 2 fix.",
});

// ── helpers ──────────────────────────────────────────────────────────────────

function scriptKindFor(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.(js|mjs)$/.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function walkRouteFiles(rootDir) {
  const appDir = path.join(rootDir, "app");
  const out = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      // Never skip a directory we cannot read: that would silently drop its routes from the scan.
      throw new Error(`route-guards: cannot read directory ${dir}: ${err instanceof Error ? err.message : err}`, { cause: err });
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && ROUTE_FILE_RE.test(entry.name)) out.push(full);
    }
  };
  visit(appDir);
  return out;
}

function hasModifier(node, kind) {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return !!mods && mods.some((m) => m.kind === kind);
}

function boundNames(name, acc = []) {
  if (ts.isIdentifier(name)) acc.push(name.text);
  else for (const el of name.elements) if (!ts.isOmittedExpression(el)) boundNames(el.name, acc);
  return acc;
}

function unwrap(expr) {
  let e = expr;
  for (;;) {
    if (
      ts.isParenthesizedExpression(e) ||
      ts.isAwaitExpression(e) ||
      ts.isAsExpression(e) ||
      ts.isTypeAssertionExpression(e) ||
      ts.isNonNullExpression(e) ||
      ts.isSatisfiesExpression(e)
    ) {
      e = e.expression;
    } else return e;
  }
}

/** Import bookkeeping: which local names are real guards, and which are fs/prisma bindings. */
function collectImports(sf) {
  const guardLocals = new Set();
  const riskyLocals = new Set(ALWAYS_RISKY_IDENTIFIERS);
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const spec = stmt.moduleSpecifier.text;
    const clause = stmt.importClause;
    if (!clause || clause.isTypeOnly) continue;
    const isFs = FS_MODULES.has(spec);
    const isPrisma = /(^|\/)prisma$/.test(spec);
    if (clause.name && (isFs || isPrisma)) riskyLocals.add(clause.name.text);
    const nb = clause.namedBindings;
    if (!nb) continue;
    if (ts.isNamespaceImport(nb)) {
      if (isFs || isPrisma) riskyLocals.add(nb.name.text);
      continue;
    }
    for (const el of nb.elements) {
      if (el.isTypeOnly) continue;
      const imported = (el.propertyName ?? el.name).text;
      if (isFs || isPrisma) riskyLocals.add(el.name.text);
      const re = GUARD_MODULES[imported];
      if (re && re.test(spec)) guardLocals.add(el.name.text);
    }
  }
  return { guardLocals, riskyLocals, sf };
}

function isFunctionLike(n) {
  return (
    ts.isFunctionDeclaration(n) ||
    ts.isFunctionExpression(n) ||
    ts.isArrowFunction(n) ||
    ts.isMethodDeclaration(n) ||
    ts.isGetAccessorDeclaration(n) ||
    ts.isSetAccessorDeclaration(n) ||
    ts.isConstructorDeclaration(n)
  );
}

/** First thing in `statements` that must not run before the guard, or null. */
function findUnsafeBeforeGuard(statements, ctx) {
  let found = null;
  const visit = (n, insideFn) => {
    if (found) return;
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const prop = n.expression.name.text;
      if (BODY_READERS.has(prop)) {
        found = `a request body read (.${prop}())`;
        return;
      }
    }
    if (ts.isIdentifier(n) && ctx.riskyLocals.has(n.text)) {
      const p = n.parent;
      const isPropName =
        (ts.isPropertyAccessExpression(p) && p.name === n) ||
        (ts.isPropertyAssignment(p) && p.name === n) ||
        (ts.isPropertySignature(p) && p.name === n);
      if (!isPropName) {
        found = `a call into \`${n.text}\` (database / network / filesystem)`;
        return;
      }
    }
    if (ts.isReturnStatement(n) && !insideFn) {
      found = "an early return";
      return;
    }
    ts.forEachChild(n, (c) => visit(c, insideFn || isFunctionLike(n)));
  };
  for (const s of statements) {
    visit(s, false);
    if (found) break;
  }
  return found;
}

/**
 * How the handler reaches Next's route params: `{ params }` / `{ params: p }` in its second
 * parameter (`local` holds the bound name) or `ctx.params` (`ctxName` holds `ctx`).
 */
function paramsSourceOf(fn) {
  const local = new Set();
  let ctxName = null;
  const second = fn.parameters[1];
  if (second && ts.isIdentifier(second.name)) ctxName = second.name.text;
  else if (second && ts.isObjectBindingPattern(second.name)) {
    for (const el of second.name.elements) {
      const key = el.propertyName ?? el.name;
      if (!el.dotDotDotToken && ts.isIdentifier(key) && key.text === "params" && ts.isIdentifier(el.name)) {
        local.add(el.name.text);
      }
    }
  }
  return { local, ctxName };
}

/** `params` / `await params` / `ctx.params` / `await ctx.params` of THIS handler (nothing else). */
function isParamsRead(expr, src) {
  const e = unwrap(expr);
  if (ts.isIdentifier(e)) return src.local.has(e.text);
  return (
    ts.isPropertyAccessExpression(e) &&
    ts.isIdentifier(e.expression) &&
    src.ctxName !== null &&
    e.expression.text === src.ctxName &&
    e.name.text === "params"
  );
}

/** `const { id } = await params;`-style statement: every declarator just reads the route params. */
function isParamsDestructure(stmt, src) {
  return (
    ts.isVariableStatement(stmt) &&
    stmt.declarationList.declarations.every((d) => d.initializer && isParamsRead(d.initializer, src))
  );
}

/**
 * Catch-all second pass: any await / call / `new` / tagged template that runs before the
 * guard, except reading the handler's own route params. Runs after findUnsafeBeforeGuard so
 * the more specific reasons (body read, prisma, early return) still win.
 */
function findUnexpectedCallBeforeGuard(statements, ctx, src) {
  let found = null;
  const visit = (n) => {
    if (found) return;
    if (ts.isAwaitExpression(n) || ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n)) {
      const text = n.getText(ctx.sf).replace(/\s+/g, " ");
      found = `an await/call that is not a route-params read (\`${text.length > 60 ? `${text.slice(0, 57)}...` : text}\`)`;
      return;
    }
    ts.forEachChild(n, visit);
  };
  for (const s of statements) {
    if (isParamsDestructure(s, src)) {
      // the initializer is the allowed params read; the binding pattern itself must still be call-free
      for (const d of s.declarationList.declarations) visit(d.name);
    } else visit(s);
    if (found) break;
  }
  return found;
}

/** `let auth = requireRole(...)` / `var` / `const { role } = requireRole(...)`: a guard call bound the wrong way. */
function isNonConstGuardBinding(stmt, ctx) {
  if (!ts.isVariableStatement(stmt)) return false;
  const list = stmt.declarationList;
  if ((list.flags & ts.NodeFlags.Const) !== 0 && list.declarations.length === 1 && ts.isIdentifier(list.declarations[0].name)) {
    return false;
  }
  return list.declarations.some((d) => {
    const call = d.initializer && unwrap(d.initializer);
    return !!call && ts.isCallExpression(call) && ts.isIdentifier(call.expression) && ctx.guardLocals.has(call.expression.text);
  });
}

function guardBindingName(stmt, ctx) {
  if (!ts.isVariableStatement(stmt)) return null;
  const list = stmt.declarationList;
  if ((list.flags & ts.NodeFlags.Const) === 0 || list.declarations.length !== 1) return null;
  const decl = list.declarations[0];
  if (!ts.isIdentifier(decl.name) || !decl.initializer) return null;
  const call = unwrap(decl.initializer);
  if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return null;
  return ctx.guardLocals.has(call.expression.text) ? decl.name.text : null;
}

function returnsIdentifier(stmt, name) {
  if (ts.isReturnStatement(stmt)) {
    return !!stmt.expression && ts.isIdentifier(stmt.expression) && stmt.expression.text === name;
  }
  if (ts.isBlock(stmt)) return stmt.statements.length === 1 && returnsIdentifier(stmt.statements[0], name);
  return false;
}

/** `if (X instanceof Response|NextResponse) return X;` — the only accepted follow-up. */
function isGuardCheck(stmt, name) {
  if (!ts.isIfStatement(stmt) || stmt.elseStatement) return false;
  let cond = stmt.expression;
  while (ts.isParenthesizedExpression(cond)) cond = cond.expression;
  if (!ts.isBinaryExpression(cond) || cond.operatorToken.kind !== ts.SyntaxKind.InstanceOfKeyword) return false;
  if (!ts.isIdentifier(cond.left) || cond.left.text !== name) return false;
  if (!ts.isIdentifier(cond.right) || !RESPONSE_CLASSES.has(cond.right.text)) return false;
  return returnsIdentifier(stmt.thenStatement, name);
}

function containsGuardCall(node, ctx) {
  let hit = false;
  const visit = (n) => {
    if (hit) return;
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ctx.guardLocals.has(n.expression.text)) {
      hit = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return hit;
}

/**
 * Decide whether one handler function is guarded.
 * @returns {{ guarded: boolean, reason?: string }}
 */
function analyzeHandler(fn, ctx) {
  const body = fn.body.statements;
  const levels = [{ stmts: body, outerBefore: [] }];
  const tries = body.filter((s) => ts.isTryStatement(s));
  if (tries.length === 1) {
    levels.push({ stmts: tries[0].tryBlock.statements, outerBefore: body.slice(0, body.indexOf(tries[0])) });
  }

  const src = paramsSourceOf(fn);
  let reason = null;
  for (const { stmts, outerBefore } of levels) {
    for (let i = 0; i < stmts.length; i++) {
      const name = guardBindingName(stmts[i], ctx);
      if (name === null) {
        if (isNonConstGuardBinding(stmts[i], ctx)) {
          reason = "guard result must be bound with a single `const` identifier (`const auth = requireRole(...)`), not `let`/`var`/destructuring";
        }
        continue;
      }
      const before = [...outerBefore, ...stmts.slice(0, i)];
      const unsafe = findUnsafeBeforeGuard(before, ctx) ?? findUnexpectedCallBeforeGuard(before, ctx, src);
      if (unsafe) {
        reason = `guard runs after ${unsafe}`;
        continue;
      }
      const next = stmts[i + 1];
      if (!next || !isGuardCheck(next, name)) {
        reason = `guard result \`${name}\` is not followed by \`if (${name} instanceof Response|NextResponse) return ${name}\``;
        continue;
      }
      return { guarded: true };
    }
  }
  if (reason) return { guarded: false, reason };

  const ignored = body.some(
    (s) => ts.isExpressionStatement(s) && containsGuardCall(s.expression, ctx),
  );
  if (ignored) return { guarded: false, reason: "guard result is ignored" };
  if (containsGuardCall(fn.body, ctx)) {
    return { guarded: false, reason: "guard call is nested or conditional, not top-level" };
  }
  return { guarded: false, reason: "no requireRole/requireAuth/resolveVolt3DUser guard" };
}

/**
 * Enumerate mutating exports of one parsed route file.
 * @returns {Array<{ method: string, fn?: import("typescript").FunctionDeclaration, problem?: string }>}
 */
function mutatingExports(sf) {
  const found = [];
  const flag = (method, problem) => found.push({ method, problem: `unrecognized export form: ${problem}` });

  for (const stmt of sf.statements) {
    if (ts.isExportAssignment(stmt)) {
      flag("default", "`export default` / `export =`");
      continue;
    }
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue;
      const clause = stmt.exportClause;
      if (!clause) flag("*", "`export * from` re-export");
      else if (ts.isNamespaceExport(clause)) {
        if (MUTATING_METHODS.has(clause.name.text)) flag(clause.name.text, "`export * as`");
      } else {
        for (const el of clause.elements) {
          if (!el.isTypeOnly && MUTATING_METHODS.has(el.name.text)) {
            flag(el.name.text, stmt.moduleSpecifier ? "re-export" : "`export { x as METHOD }`");
          }
        }
      }
      continue;
    }
    if (!hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) continue;

    if (ts.isFunctionDeclaration(stmt)) {
      if (hasModifier(stmt, ts.SyntaxKind.DefaultKeyword)) {
        flag("default", "`export default function`");
        continue;
      }
      const name = stmt.name?.text;
      if (name && MUTATING_METHODS.has(name) && stmt.body) found.push({ method: name, fn: stmt });
      continue;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        for (const n of boundNames(decl.name)) {
          if (MUTATING_METHODS.has(n)) flag(n, "`export const/let/var`");
        }
      }
      continue;
    }
    if (ts.isClassDeclaration(stmt) || ts.isEnumDeclaration(stmt) || ts.isModuleDeclaration(stmt)) {
      const name = stmt.name && ts.isIdentifier(stmt.name) ? stmt.name.text : undefined;
      if (name && MUTATING_METHODS.has(name)) flag(name, "exported class/enum/namespace");
    }
  }
  return found;
}

function analyzeFile(rootDir, absPath) {
  const text = fs.readFileSync(absPath, "utf8");
  const sf = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, scriptKindFor(absPath));
  const rel = path.relative(rootDir, absPath).split(path.sep).join("/");

  // A file the parser cannot read cleanly must not silently yield "zero handlers": raise one
  // violation for the file itself (it cannot be allowlisted: only mutating METHOD keys are valid).
  // `parseDiagnostics` is a TypeScript-internal field, so fail loudly if it ever disappears.
  const diagnostics = sf.parseDiagnostics;
  if (!Array.isArray(diagnostics)) {
    throw new Error("route-guards: the installed typescript no longer exposes SourceFile.parseDiagnostics; update scripts/check-route-guards.mjs");
  }
  if (diagnostics.length > 0) {
    const first = diagnostics[0];
    const line = sf.getLineAndCharacterOfPosition(first.start ?? 0).line + 1;
    const msg = ts.flattenDiagnosticMessageText(first.messageText, " ");
    const more = diagnostics.length > 1 ? `; +${diagnostics.length - 1} more` : "";
    return [
      {
        key: `${rel}#${SYNTAX_ERROR_METHOD}`,
        file: rel,
        method: SYNTAX_ERROR_METHOD,
        guarded: false,
        reason: `syntax error, handlers cannot be analyzed (TS${first.code} at line ${line}: ${msg}${more})`,
      },
    ];
  }

  const ctx = collectImports(sf);
  return mutatingExports(sf).map(({ method, fn, problem }) => {
    const key = `${rel}#${method}`;
    if (problem) return { key, file: rel, method, guarded: false, reason: problem };
    const res = analyzeHandler(fn, ctx);
    return { key, file: rel, method, guarded: res.guarded, reason: res.reason };
  });
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Scan every route file under `<rootDir>/app`.
 *
 * @param {string} rootDir repo root (contains app/)
 * @param {{ allowlist?: Record<string,string> }} [opts] defaults to BASELINE_ALLOWLIST
 * @returns {{
 *   files: number,
 *   handlers: Array<{ key: string, file: string, method: string, status: "guarded"|"allowlisted"|"violation", reason?: string }>,
 *   guarded: object[], allowlisted: object[], violations: object[],
 *   stale: Array<{ key: string, why: string }>
 * }}
 */
export function scanRoutes(rootDir, { allowlist = BASELINE_ALLOWLIST } = {}) {
  const files = walkRouteFiles(rootDir);
  const handlers = [];
  for (const file of files) {
    for (const h of analyzeFile(rootDir, file)) {
      if (h.guarded) handlers.push({ ...h, status: "guarded" });
      else if (Object.prototype.hasOwnProperty.call(allowlist, h.key)) {
        handlers.push({ ...h, status: "allowlisted", reason: allowlist[h.key] });
      } else handlers.push({ ...h, status: "violation" });
    }
  }
  const byKey = new Map(handlers.map((h) => [h.key, h]));
  const stale = [];
  for (const key of Object.keys(allowlist)) {
    const h = byKey.get(key);
    if (!h) stale.push({ key, why: "handler no longer exists" });
    else if (h.status === "guarded") stale.push({ key, why: "handler is now guarded — remove the entry" });
  }
  return {
    files: files.length,
    handlers,
    guarded: handlers.filter((h) => h.status === "guarded"),
    allowlisted: handlers.filter((h) => h.status === "allowlisted"),
    violations: handlers.filter((h) => h.status === "violation"),
    stale,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function printTable(title, rows) {
  if (rows.length === 0) return;
  console.log(`\n${title}`);
  const width = Math.max(...rows.map((r) => r.key.length));
  for (const r of rows) console.log(`  ${r.key.padEnd(width)}  ${r.reason ?? ""}`);
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const here = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = positional[0] ? path.resolve(positional[0]) : path.resolve(here, "..");
  let result;
  try {
    result = scanRoutes(rootDir, flags.has("--no-allowlist") ? { allowlist: {} } : {});
  } catch (err) {
    console.error(`FAIL: ${err instanceof Error ? err.message : err}`);
    return 1;
  }
  if (result.files === 0) {
    console.error(`FAIL: no route files found under ${path.join(rootDir, "app")} (wrong root, or the app directory moved). Refusing to pass vacuously.`);
    return 1;
  }

  console.log(
    `Route guard scan: ${result.files} route files, ${result.handlers.length} mutating handlers ` +
      `(${result.guarded.length} guarded, ${result.allowlisted.length} allowlisted, ${result.violations.length} VIOLATIONS)`,
  );
  if (flags.has("--all")) printTable("GUARDED", result.guarded);
  printTable("ALLOWLISTED (reviewed exceptions)", result.allowlisted);
  for (const s of result.stale) console.warn(`WARNING stale allowlist entry ${s.key}: ${s.why}`);
  printTable("VIOLATIONS (mutating handler without a recognized guard)", result.violations);

  if (result.violations.length > 0) {
    console.log(
      "\nFAIL: guard the handler with requireRole/requireAuth as the first statement " +
        "(see app/api/sections/reorder/route.ts), or add a reviewed BASELINE_ALLOWLIST entry with a reason.",
    );
    return 1;
  }
  console.log("\nPASS");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}
