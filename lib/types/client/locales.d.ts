/**
 * Section copy, zh/en. Keys are flat; the type rides on `en` so a missing
 * translation is a compile error.
 *
 * @module dsh-opencode-gateway/client/locales
 */
export declare const en: {
    readonly nav: "OpenCode Gateway";
    readonly title: "OpenCode Gateway";
    readonly intro: "Refresh the live model listing and pick which models land in the model menu. A checked model is menu-visible (composer chip included); an unchecked one is only listed here. A checked model the endpoint no longer serves is tagged \"not listed\" — it is never removed on its own; the \"Remove stale\" button drops them after you confirm.";
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
    readonly notInListing: "not listed";
    readonly emptyListing: "No models answered. Refresh once the route is reachable.";
    readonly suspiciousEmpty: "The endpoint answered with no models at all — that usually means a gateway fault, not that every model is gone. Nothing was removed.";
    readonly pruneStale: "Remove {count} stale";
    readonly pruneHint: "Drops the {count} checked entries the last refresh no longer answered, and saves.";
    readonly pruneNone: "Nothing stale to remove.";
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
