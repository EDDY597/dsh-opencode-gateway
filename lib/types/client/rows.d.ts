/**
 * Pure row/state assembly for the model manager section — no React, no
 * services, so the enable-set math is unit-testable on its own.
 *
 * @module dsh-opencode-gateway/client/rows
 */
import type { LlmDiscoveredModel, SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client';
import type { RouteModel } from '../config.ts';
/** One checkbox row of one route card. */
export interface RowState {
    /** Metadata saved when this row is checked. */
    entry: RouteModel;
    /** In the route's effective menu. */
    enabled: boolean;
    /** Came from the live listing rather than the shipped/effective menu. */
    discovered: boolean;
    /**
     * Whether this id answered in the latest refresh. `true` while no refresh
     * has answered; a checked row that flips to `false` has gone missing from
     * the endpoint (officially removed, or filtered by the route's prefixes).
     * The menu never removes such a model on its own — unchecking + saving is
     * the explicit removal path.
     */
    inListing: boolean;
}
/** The facts one route card renders from. */
export interface RouteRowsInput {
    /** The route's effective menu: the stored `models` list, else the shipped defaults. */
    effective: readonly RouteModel[];
    /** The bundled shipped defaults (the inherit target). */
    shipped: readonly RouteModel[];
    /** The latest live listing for this route, when a refresh has answered. */
    discovered: readonly LlmDiscoveredModel[] | undefined;
}
/** The route keys the page manages. */
export type RouteKey = 'gateway' | 'free';
/**
 * Union one route's rows by id: effective entries first (menu order), then
 * shipped entries not in effect, then discovered entries not yet known —
 * every id the user could want to see stays visible, discovered-or-not.
 * @param input - the route's effective, shipped, and discovered facts.
 * @returns the checkbox rows in render order.
 */
export declare function assembleRows(input: RouteRowsInput): RowState[];
/** The saved entry one discovered row carries: listing facts, no invented metadata. */
export declare function discoveredEntry(model: LlmDiscoveredModel): RouteModel;
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
export declare function saveOp(routeKey: RouteKey, rows: readonly RowState[], checked: ReadonlySet<string>): SettingsPathOpView;
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
export declare function listingIsAuthoritative(discovered: readonly LlmDiscoveredModel[] | undefined): boolean;
/**
 * The checked ids a refresh no longer answers — the entries a one-click clean
 * would drop. Empty whenever {@link listingIsAuthoritative} says no verdict is
 * available, so a failed refresh can never nominate the whole menu.
 * @param rows - the route's assembled rows.
 * @param checked - the ids the user currently has checked.
 * @param discovered - the latest live listing, or undefined.
 * @returns the checked ids missing from a trustworthy listing.
 */
export declare function staleCheckedIds(rows: readonly RowState[], checked: ReadonlySet<string>, discovered: readonly LlmDiscoveredModel[] | undefined): string[];
/** The one settings write that hands a route's menu back to the defaults. */
export declare function resetOp(routeKey: RouteKey): SettingsPathOpView;
/** The route's effective models out of one described namespace view. */
export declare function effectiveModelsOf(view: Record<string, unknown> | undefined, routeKey: RouteKey, shipped: readonly RouteModel[]): readonly RouteModel[];
