/**
 * Hand-written type declarations for link-destinations.js (same mechanism as flexible-render-rules.d.ts:
 * TypeScript pairs a `.d.ts` with the same-named `.js` in the same directory). The JS is also loaded as a
 * plain <script> by public/flexible-designer.html (window.LinkDestinations).
 */
import type { LinkCatalog, LinkItem } from "../lib/link-destinations";

export type PickerMode = "none" | "item" | "tel" | "mailto" | "media" | "custom";

export interface PickerState {
  mode: PickerMode;
  /** The value re-selecting this state writes back. Equals the stored value except for legacy literals ('#'). */
  canonical: string;
  item?: LinkItem;
  /** mode 'item': the <option value> to preselect (the STORED value when it matched via an alias). */
  optionValue?: string;
  /** mode tel / mailto / media / custom: text shown in the input. */
  text?: string;
  mediaType?: "document" | "image";
  /** Stored value was one of the old buggy literals 'custom' | 'tel' | 'mailto'. */
  legacy?: boolean;
  viaAlias?: boolean;
}

export interface PickerConfig {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  currentPage?: string | null;
}

export interface MediaSearchData {
  items: { group: "media"; label: string; value: string; hint: string; thumbnailUrl: string | null }[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function escapeHtml(s: unknown): string;
export function classify(value: unknown, catalog: LinkCatalog | { groups: LinkCatalog["groups"]; meta?: Partial<LinkCatalog["meta"]> }): PickerState;
export function selectValueFor(state: PickerState): string;
export function buildOptionsHtml(catalog: LinkCatalog, state: PickerState, opts?: { allowNone?: boolean }): string;
export function flatItems(catalog: LinkCatalog): LinkItem[];
export const FALLBACK_CATALOG: LinkCatalog;
export const LEGACY_SENTINELS: Record<string, 1>;
export const SENTINELS: { custom: string; tel: string; mailto: string; doc: string; img: string };
export function fetchCatalog(opts?: { currentPage?: string | null; force?: boolean }): Promise<LinkCatalog>;
export function prefetch(opts?: { currentPage?: string | null; force?: boolean }): Promise<void>;
export function searchMedia(params: { type: "document" | "image"; q?: string; page?: number; perPage?: number }): Promise<MediaSearchData>;
export function detectCurrentPage(): string | null;
export function renderPicker(cfg: PickerConfig): string;
export function refreshAll(): void;
export function onSelect(el: HTMLSelectElement): void;
export function onInput(el: HTMLInputElement): void;
export function onSearch(el: HTMLInputElement): void;
export function onMore(el: HTMLElement): void;
export function onPick(el: HTMLElement): void;
