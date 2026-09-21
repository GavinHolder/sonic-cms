"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** Already {{cms.*}}/{{cms.media.*}}-substituted by the caller — this component handles the
   * {{tpl.*}} layer and the sandboxed-iframe wrapper. */
  html: string;
  css: string;
  /** Admin-authored "Template Options" (Designer → block properties → Template Options).
   * Two conventions, both opt-in on the template author's side:
   *  - `{{tpl.<key>}}` / `{{tpl.<key>|Default text}}` tokens anywhere in the template's
   *    HTML or inside JS string literals in its own <script> — textual substitution over
   *    the raw source, so it also reaches JS that hasn't run yet (see applyTplTokens).
   *  - `--tpl-<key>` CSS custom properties declared by the template (typically on :root)
   *    — any key present here is emitted as a `:root{--tpl-key:value}` override <style>
   *    block placed AFTER the template's own <style>, so it wins on equal specificity.
   *    Keys are NOT present here unless the admin explicitly set a value; omitted keys
   *    leave the template's own declared default in effect. */
  templateOptions?: Record<string, string>;
  /** Dynamic Content Height Mode (FLEXIBLE section contentMode "dynamic") — called with the
   * template's own live rendered content height (px) whenever it reports one. See the
   * postMessage contract documented above the message listener below. Omitted entirely for
   * Single/Multi sections (FlexibleSectionRenderer only passes this for a "dynamic" section),
   * so this component's behavior for those modes is completely unchanged. */
  onContentHeight?: (px: number) => void;
}

/** Cheap FNV-1a hash — used only to detect "did this template's own content
 * change" for TemplateBlock's iframe remount key (see iframeKey's own
 * comment). string.length alone isn't enough: a same-length edit (e.g.
 * "opacity: 0" -> "opacity: 1", or any single-character CSS value swap —
 * both real, ordinary template edits, not edge cases) would leave the key
 * unchanged and silently reproduce the exact stale-iframe bug this key
 * exists to prevent. Not cryptographic — collision resistance for "did an
 * admin's template edit change the bytes" is all that's needed here. */
function fnv1aHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Substitutes `{{tpl.<key>}}` / `{{tpl.<key>|Default text}}` tokens with the matching
 * entry from the admin-authored `templateOptions` map (Designer "Template Options"
 * panel), falling back to the token's own inline default, then to an empty string.
 * Runs on the raw HTML/CSS *source* text so a token sitting
 * inside a <script> tag's JS string literal is substituted before that script ever
 * executes in the sandboxed iframe, not after.
 *
 * ASSUMPTIONS:
 * 1. Keys are template-author-chosen identifiers matching [a-zA-Z0-9_]+ (no dots/braces).
 * 2. An inline default (after `|`) may not itself contain `}}`.
 * 3. options[key] === "" (admin cleared the field) is treated as "unset" so the
 *    template's own inline default (or "") applies — mirrors the CSS-var override
 *    behavior below, where an absent/empty key means "use the template's own default".
 */
function applyTplTokens(input: string, options: Record<string, string>): string {
  if (!input) return input;
  return input.replace(/\{\{tpl\.([a-zA-Z0-9_]+)(?:\|([^}]*))?\}\}/g, (_, key: string, fallback?: string) => {
    const val = options[key];
    if (val !== undefined && val !== "") return val;
    return fallback ?? "";
  });
}

/**
 * Builds a `:root{--tpl-key:value;...}` override <style> block from any `--tpl-*` keys
 * present in `templateOptions`. Only explicitly-set keys are emitted — a key the admin
 * never touched (or cleared) is simply omitted, leaving the template's own `--tpl-key:
 * default` declaration (in its own <style>) in effect. This override block must be
 * placed AFTER the template's own <style> in the srcDoc so it wins on equal :root
 * specificity (last-declared rule wins for identical selectors/specificity).
 */
function buildTplVarsStyle(options: Record<string, string>): string {
  const entries = Object.entries(options).filter(([k, v]) => k.startsWith("--tpl-") && v !== undefined && v !== "");
  if (entries.length === 0) return "";
  const decls = entries
    // Strip any accidental "</style" breakout attempt; admin-only content, but cheap to guard.
    .map(([k, v]) => `${k}:${String(v).replace(/<\/style/gi, "")}`)
    .join(";");
  return `<style>:root{${decls}}</style>`;
}

/**
 * TemplateBlock — sandboxed-iframe renderer for the FLEXIBLE section "template" block
 * type. Split out of FlexibleSectionRenderer's inline switch because it needs its own
 * hooks (message listener, iframe ref), and that switch's cases can't call hooks
 * conditionally.
 */
export default function TemplateBlock({ html, css, templateOptions, onContentHeight }: Props) {
  // Ref to THIS instance's own iframe — a page can hold more than one TemplateBlock (a
  // section can have >1 block), and the message listener below must only react to a
  // height report from its own iframe, never one bubbling up from an unrelated iframe
  // elsewhere on the page. Compared against event.source, not the DOM node, since a
  // sandboxed iframe's contentWindow is exactly what postMessage sets as event.source —
  // no DOM/document read is needed (and none is possible without allow-same-origin).
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Dynamic Content Height Mode: receive live height reports from the sandboxed
  // iframe ─────────────────────────────────────────────────────────────────────
  // sandbox="allow-scripts" WITHOUT allow-same-origin (see the srcDoc comment below) means
  // the parent can never read this iframe's contentDocument/contentWindow directly — the
  // frame has its own opaque origin. postMessage is the one channel a sandboxed iframe can
  // still use to talk to its parent even without allow-same-origin, so it's the only viable
  // way for a template's own script to report how tall its rendered content actually is
  // (needed so a FLEXIBLE section in "dynamic" contentMode can size itself to match).
  //
  // MESSAGE CONTRACT — a template author's own <script> should send, whenever its content's
  // rendered height changes (e.g. after switching a tab that shows more/fewer cards):
  //   window.parent.postMessage(
  //     { source: 'cms-template', type: 'content-height', height: <number, px> },
  //     '*'
  //   )
  // targetOrigin '*' is deliberate, not a shortcut: the iframe itself has an opaque origin
  // (there is no real origin to target), and the parent's own origin varies per deployment.
  // This is a same-direction, non-sensitive signal (a pixel count) — not a channel for
  // secrets — so '*' is the correct choice here, not a weakening. Do not "fix" this by
  // adding allow-same-origin instead; that would defeat the whole sandbox.
  useEffect(() => {
    if (!onContentHeight) return;
    const onMessage = (event: MessageEvent) => {
      // Defensive validation — this listener will also receive noise from other iframes/
      // extensions on the page (unrelated postMessage traffic), so every field is checked
      // before use and nothing here is allowed to throw on malformed input.
      const data = event.data as unknown;
      if (!data || typeof data !== "object") return;
      const msg = data as { source?: unknown; type?: unknown; height?: unknown };
      if (msg.source !== "cms-template" || msg.type !== "content-height") return;
      if (typeof msg.height !== "number" || !Number.isFinite(msg.height) || msg.height <= 0) return;
      // Only accept a report from THIS instance's own iframe (see iframeRef comment above) —
      // never from some other TemplateBlock/iframe elsewhere on the page.
      if (event.source !== iframeRef.current?.contentWindow) return;
      onContentHeight(msg.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onContentHeight]);

  const tplOptions = templateOptions || {};
  const finalHtml = applyTplTokens(html, tplOptions);
  const finalCss = applyTplTokens(css, tplOptions);
  const tplVarsStyle = buildTplVarsStyle(tplOptions);

  // sandbox="allow-scripts" WITHOUT allow-same-origin is deliberate — see
  // FlexibleSectionRenderer.tsx's "template" case for the full rationale: the frame
  // gets a unique opaque origin, so an uploaded template's script can run its own
  // visuals/interactivity but can never read the CMS admin's cookies/localStorage/DOM.
  // tplVarsStyle goes AFTER finalHtml, not in <head> — a single-file .html import (the
  // normal case) puts the ENTIRE uploaded document, including its own <head><style>, into
  // finalHtml, which is then embedded inside this wrapper's <body>. A <style> placed in
  // THIS <head> is therefore encountered (and cascades) BEFORE the template's own nested
  // <style>, so on equal :root specificity the template's own default was silently
  // winning — the override never took visual effect despite being correctly computed and
  // injected. Confirmed by tracing the actual srcdoc HTML produced end-to-end, not just
  // reading the code. Appending it after finalHtml makes it genuinely the last <style>
  // encountered, which is what the comment on buildTplVarsStyle above has always assumed.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">${
    finalCss ? `<style>${finalCss}</style>` : ""
  }</head><body style="margin:0">${finalHtml}${tplVarsStyle}</body></html>`;

  // Keyed on the template's own content, not just a static block id: mutating an
  // already-loaded iframe's srcdoc attribute in place does not reliably re-navigate it
  // in every browser (observed empirically — the attribute updates, the visible
  // document doesn't). Changing `key` forces React to mount a fresh iframe, guaranteeing
  // a clean load of the final content instead of racing an in-place update against an
  // already-parsed document. An admin editing a template's own content (the normal
  // case: fixing a card's layout/CSS) must not hit a stale iframe. Hashed (not
  // raw html/css) so a same-length edit — e.g. "opacity: 0" -> "opacity: 1", an
  // ordinary CSS tweak, not an edge case — still changes the key; string.length alone
  // would miss it and silently reproduce this exact bug.
  const iframeKey = `${JSON.stringify(tplOptions)}:${fnv1aHash(html + css)}`;

  return (
    <iframe
      ref={iframeRef}
      key={iframeKey}
      title="Section template"
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      style={{ display: "block", width: "100%", height: "100%", border: 0 }}
    />
  );
}
