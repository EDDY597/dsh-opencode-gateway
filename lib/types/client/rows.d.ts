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
/** The one settings write that hands a route's menu back to the defaults. */
export declare function resetOp(routeKey: RouteKey): SettingsPathOpView;
/** The route's effective models out of one described namespace view. */
export declare function effectiveModelsOf(view: Record<string, unknown> | undefined, routeKey: RouteKey, shipped: readonly RouteModel[]): readonly RouteModel[];
