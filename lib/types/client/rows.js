/**
 * Pure row/state assembly for the model manager section — no React, no
 * services, so the enable-set math is unit-testable on its own.
 *
 * @module dsh-opencode-gateway/client/rows
 */
/**
 * Union one route's rows by id: effective entries first (menu order), then
 * shipped entries not in effect, then discovered entries not yet known —
 * every id the user could want to see stays visible, discovered-or-not.
 * @param input - the route's effective, shipped, and discovered facts.
 * @returns the checkbox rows in render order.
 */
export function assembleRows(input) {
    const rows = [];
    const seen = new Set();
    const effectiveIds = new Set(input.effective.map(entry => entry.id));
    const listedIds = new Set((input.discovered ?? []).map(model => model.id));
    for (const entry of input.effective) {
        seen.add(entry.id);
        rows.push({ entry, enabled: true, discovered: false, inListing: listedIds.size === 0 || listedIds.has(entry.id) });
    }
    for (const entry of input.shipped) {
        if (seen.has(entry.id) || effectiveIds.has(entry.id))
            continue;
        seen.add(entry.id);
        rows.push({ entry, enabled: false, discovered: false, inListing: listedIds.size === 0 || listedIds.has(entry.id) });
    }
    for (const model of input.discovered ?? []) {
        if (seen.has(model.id))
            continue;
        seen.add(model.id);
        rows.push({
            entry: discoveredEntry(model),
            enabled: false,
            discovered: true,
            inListing: true,
        });
    }
    return rows;
}
/** The saved entry one discovered row carries: listing facts, no invented metadata. */
export function discoveredEntry(model) {
    return {
        id: model.id,
        ...(model.name === undefined ? {} : { name: model.name }),
        ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
        ...(model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }),
        ...(model.inputModalities === undefined ? {} : { input: [...model.inputModalities] }),
    };
}
/**
 * The one settings write that commits a route's checked set: the whole
 * `models` list rides a single `set` op so it can never half-land, in ROW
 * order (so the menu order does not depend on the check sequence), and an
 * empty checked set stays an EXPLICIT empty list (the user took the menu
 * over), not an unset.
 * @param routeKey - the Config section this route occupies.
 * @param rows - the route's assembled rows (metadata source and order).
 * @param checked - the ids the user checked.
 * @returns the path op committing this route's menu.
 */
export function saveOp(routeKey, rows, checked) {
    const models = rows
        .filter(row => checked.has(row.entry.id))
        .map(row => row.entry);
    return { op: 'set', path: [routeKey, 'models'], value: models };
}
/**
 * Whether a refresh result may be trusted to judge staleness at all.
 *
 * An endpoint that answers with an empty list is indistinguishable from one
 * that is merely broken — `fetchGatewayListing` returns `[]` on every failure
 * path (unreachable, non-200, unreadable, oversized, unparseable). Treating
 * "no rows answered" as "every model is gone" would let one gateway fault
 * strip the whole menu, so an empty listing yields no verdict.
 * @param discovered - the latest live listing, or undefined before any refresh.
 * @returns true only when a non-empty listing actually answered.
 */
export function listingIsAuthoritative(discovered) {
    return discovered !== undefined && discovered.length > 0;
}
/**
 * The checked ids a refresh no longer answers — the entries a one-click clean
 * would drop. Empty whenever {@link listingIsAuthoritative} says no verdict is
 * available, so a failed refresh can never nominate the whole menu.
 * @param rows - the route's assembled rows.
 * @param checked - the ids the user currently has checked.
 * @param discovered - the latest live listing, or undefined.
 * @returns the checked ids missing from a trustworthy listing.
 */
export function staleCheckedIds(rows, checked, discovered) {
    if (!listingIsAuthoritative(discovered))
        return [];
    return rows.filter(row => checked.has(row.entry.id) && !row.inListing).map(row => row.entry.id);
}
/** The one settings write that hands a route's menu back to the defaults. */
export function resetOp(routeKey) {
    return { op: 'unset', path: [routeKey, 'models'] };
}
/** The route's effective models out of one described namespace view. */
export function effectiveModelsOf(view, routeKey, shipped) {
    const section = view?.[routeKey];
    const models = section !== null && typeof section === 'object' ? section.models : undefined;
    return models ?? shipped;
}
