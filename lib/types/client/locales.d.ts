/**
 * Section copy, zh/en. Keys are flat; the type rides on `en` so a missing
 * translation is a compile error.
 *
 * @module dsh-opencode-gateway/client/locales
 */
export declare const en: {
    readonly nav: "OpenCode Gateway";
    readonly title: "OpenCode Gateway";
    readonly intro: "Refresh the live model listing and pick which models land in the model menu. A checked model is menu-visible (composer chip included); an unchecked one is only listed here.";
    readonly cardGateway: "OpenCode Go (subscription via gateway)";
    readonly cardFree: "OpenCode Free (local free tier)";
    readonly refresh: "Refresh";
    readonly refreshing: "Refreshing…";
    readonly save: "Save checked";
    readonly saving: "Saving…";
    readonly saved: "Saved";
    readonly resetDefaults: "Restore defaults";
    readonly contextChip: "ctx";
    readonly discoveredTag: "discovered";
    readonly emptyListing: "No models answered. Refresh once the route is reachable.";
    readonly discoverRefused: "Refresh failed: {message}";
    readonly loadFailed: "Settings load failed: {message}";
    readonly writeConflict: "Settings changed elsewhere; reloaded — apply your checks again.";
    readonly writeRefused: "Save refused: {message}";
    readonly uncheckedCount: "{count} checked";
    readonly stagedHint: "Unsaved changes";
    readonly providerLabel: "route";
};
export declare const zh: Record<keyof typeof en, string>;
export type ModelManagerKey = keyof typeof en;
