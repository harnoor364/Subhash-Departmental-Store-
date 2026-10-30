/* =====================================================================
   lib/validate.js — clean up and check everything that comes from a browser
   Rule: never trust input. Trim it, limit its length, check its format.
   ===================================================================== */

import { HttpError } from './http.js';

/** Text: trimmed, control characters removed, cut to maxLen. */
export function text(value, maxLen = 200) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

/** 10-digit Indian mobile number, or '' if invalid. Accepts +91 / 0 prefixes and spaces. */
export function phone(value) {
  const d = String(value ?? '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(d) ? d : '';
}

/** Same as phone() but throws a friendly error. */
export function requirePhone(value) {
  const p = phone(value);
  if (!p) throw new HttpError(400, 'Please enter a valid 10-digit mobile number.');
  return p;
}

/** One value from an allowed list, or the fallback. */
export function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

/** Slug-style id: lowercase letters, numbers, dashes (and 'combo:' prefix). */
export function itemId(value) {
  const s = String(value ?? '');
  return /^(combo:)?[a-z0-9][a-z0-9-]{0,79}$/.test(s) ? s : '';
}

/**
 * Cart items from the browser: { "<id>": qty }.
 * Returns a clean object with at most 100 lines and qty 1–50.
 */
export function cartItems(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [rawId, rawQty] of Object.entries(value).slice(0, 100)) {
    const id = itemId(rawId);
    const qty = Math.floor(Number(rawQty));
    if (id && qty >= 1) out[id] = Math.min(qty, 50);
  }
  return out;
}

/** Round money to 2 decimals. */
export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
