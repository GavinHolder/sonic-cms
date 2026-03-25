#!/usr/bin/env node
/**
 * auto-version.mjs
 *
 * Reads commits since the last auto-version commit, determines the
 * semver bump from conventional commit prefixes, and writes the
 * updated version + changelog to public/cms-version.json.
 *
 * Bump rules:
 *   feat!: / BREAKING CHANGE  -> major (x.0.0)
 *   feat:                      -> minor (x.y.0)
 *   fix:                       -> patch (x.y.z)
 *   anything else              -> no bump (exits 0)
 *
 * NOTE: execSync inputs are all hardcoded — no user input, no injection risk.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const VERSION_FILE = "public/cms-version.json";

// -- Read current version --------------------------------------------------

const current = JSON.parse(readFileSync(VERSION_FILE, "utf8"));
const [major, minor, patch] = current.version.split(".").map(Number);

// -- Get commits since last auto-version commit ----------------------------

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

let range = "";
try {
  const lastAutoCommit = run(
    'git log --oneline --grep="chore: auto-bump version" -1 --format=%H'
  );
  if (lastAutoCommit) range = `${lastAutoCommit}..HEAD`;
} catch {
  // no prior auto-bump commit — scan last 30
}

const logCmd = range
  ? `git log ${range} --format=%s`
  : "git log HEAD~30..HEAD --format=%s";

const allCommits = run(logCmd).split("\n").filter(Boolean);

// Exclude housekeeping commits
const commits = allCommits.filter(
  (m) =>
    !m.includes("auto-bump version") &&
    !m.includes("[skip ci]") &&
    !/^chore(\(.+\))?:\s*(bump|release|version)/.test(m)
);

if (commits.length === 0) {
  console.log("No relevant commits -- skipping version bump.");
  process.exit(0);
}

// -- Classify commits ------------------------------------------------------

const isBreaking = (m) =>
  /^(feat|fix)!(\(.+\))?:/.test(m) || m.includes("BREAKING CHANGE");

const isFeat = (m) => /^feat(\(.+\))?:/.test(m) && !isBreaking(m);
const isFix  = (m) => /^fix(\(.+\))?:/.test(m)  && !isBreaking(m);

const hasBreaking = commits.some(isBreaking);
const hasFeat     = commits.some(isFeat);
const hasFix      = commits.some(isFix);

let newVersion;
if (hasBreaking)     newVersion = `${major + 1}.0.0`;
else if (hasFeat)    newVersion = `${major}.${minor + 1}.0`;
else if (hasFix)     newVersion = `${major}.${minor}.${patch + 1}`;
else {
  console.log("No feat/fix commits -- skipping version bump.");
  process.exit(0);
}

// -- Build changelog -------------------------------------------------------

function stripPrefix(m) {
  return m
    .replace(/^(feat|fix|refactor|chore|perf|ci|docs|test)!?(\(.+\))?:\s*/, "")
    .replace(/\s*\[skip ci\]\s*/gi, "")
    .trim();
}

const features = commits.filter(isFeat).map(stripPrefix);
const bugfixes = commits.filter(isFix).map(stripPrefix);
const breaking = commits.filter(isBreaking).map((m) => {
  // Parse optional [affects:plugin-slug] or [affects:plugin-a,plugin-b] tag
  const affectsMatch = m.match(/\[affects:([^\]]+)\]/);
  const affects = affectsMatch ? affectsMatch[1].split(",").map((s) => s.trim()) : ["core"];
  const severity = m.startsWith("feat!:") ? "high" : "medium";
  return {
    message: stripPrefix(m.replace(/\[affects:[^\]]+\]/, "").trim()),
    affects,
    severity,
    migration: "",
  };
});

// -- Write updated file ----------------------------------------------------

const updated = {
  version: newVersion,
  date: new Date().toISOString().split("T")[0],
  changelog: { features, bugfixes, breaking },
};

writeFileSync(VERSION_FILE, JSON.stringify(updated, null, 2) + "\n");
console.log(`Bumped ${current.version} -> ${newVersion}`);
console.log(
  `  Features: ${features.length}  Fixes: ${bugfixes.length}  Breaking: ${breaking.length}`
);

// -- Write bugfix channel manifest when bump is patch-only -----------------
// bugfix.json tracks the latest version that contains ONLY fix: commits
// (no new features, no breaking changes). Safe for clients on the bugfix channel.

if (hasFix && !hasFeat && !hasBreaking) {
  mkdirSync("public/versions", { recursive: true });
  writeFileSync(
    "public/versions/bugfix.json",
    JSON.stringify(updated, null, 2) + "\n"
  );
  console.log(`Written public/versions/bugfix.json (bugfix channel -> ${newVersion})`);
}
