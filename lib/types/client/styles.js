/**
 * The section stylesheet, injected as a `<style>` tag by the client's apply —
 * no CSS pipeline, matching the first-party plugin builds. All selectors are
 * prefixed `ocgw-` to stay out of the shell's way.
 *
 * @module dsh-opencode-gateway/client/styles
 */
export const SECTION_CSS = `
.ocgw-section { display: flex; flex-direction: column; gap: 16px; max-width: 860px; }
.ocgw-intro { opacity: .72; font-size: 12.5px; line-height: 1.55; }
.ocgw-card { border: 1px solid color-mix(in srgb, currentColor 14%, transparent); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.ocgw-card-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ocgw-card-title { font-weight: 600; font-size: 13.5px; }
.ocgw-card-provider { opacity: .55; font-size: 11.5px; }
.ocgw-spacer { flex: 1; }
.ocgw-button { border: 1px solid color-mix(in srgb, currentColor 22%, transparent); background: transparent; color: inherit; border-radius: 7px; padding: 4px 12px; font-size: 12.5px; cursor: pointer; }
.ocgw-button:disabled { opacity: .45; cursor: default; }
.ocgw-button-primary { background: color-mix(in srgb, currentColor 12%, transparent); }
.ocgw-rows { display: flex; flex-direction: column; max-height: 320px; overflow: auto; border-top: 1px dashed color-mix(in srgb, currentColor 14%, transparent); }
.ocgw-row { display: flex; align-items: center; gap: 10px; padding: 6px 2px; border-bottom: 1px dashed color-mix(in srgb, currentColor 10%, transparent); font-size: 12.5px; }
.ocgw-row input[type="checkbox"] { width: 15px; height: 15px; accent-color: currentColor; flex: none; }
.ocgw-row-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ocgw-row-id { opacity: .5; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ocgw-chip { flex: none; opacity: .68; font-size: 10.5px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: 999px; padding: 1px 7px; }
.ocgw-tag { flex: none; opacity: .62; font-size: 10.5px; border-radius: 999px; padding: 1px 7px; background: color-mix(in srgb, currentColor 10%, transparent); }
.ocgw-tag-stale { opacity: .85; color: #b8860b; }
.ocgw-row-disabled .ocgw-row-name, .ocgw-row-disabled .ocgw-row-id { opacity: .38; }
.ocgw-foot { display: flex; align-items: center; gap: 10px; font-size: 12px; opacity: .85; }
.ocgw-note { opacity: .6; font-size: 11.5px; }
.ocgw-error { color: #e5484d; font-size: 12px; }
.ocgw-empty { opacity: .6; font-size: 12px; padding: 8px 2px; }
`;
