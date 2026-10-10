/**
 * Pure row/state assembly for the model manager section — no React, no
 * services, so the enable-set math is unit-testable on its own.
 *
 * @module dsh-opencode-gateway/client/rows
 */

import type { LlmDiscoveredModel, SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type { RouteModel } from '../config.ts'

/** One checkbox row of one route card. */
export interface RowState {
  /** Metadata saved when this row is checked. */
  entry: RouteModel
  /** In the route's effective menu. */
  enabled: boolean
  /** Came from the live listing rather than the shipped/effective menu. */
  discovered: boolean
  /**
   * Whether this id answered in the latest refresh. `true` while no refresh
   * has answered; a checked row that flips to `false` has gone missing from
   * the endpoint (officially removed, or filtered by the route's prefixes).
   * The menu never removes such a model on its own — unchecking + saving is
   * the explicit removal path.
   */
  inListing: boolean
}

/** The facts one route card renders from. */
export interface RouteRowsInput {
  /** The route's effective menu: the stored `models` list, else the shipped defaults. */
  effective: readonly RouteModel[]
  /** The bundled shipped defaults (the inherit target). */
  shipped: readonly RouteModel[]
  /** The latest live listing for this route, when a refresh has answered. */
  discovered: readonly LlmDiscoveredModel[] | undefined
}

/** The route keys the page manages. */
export type RouteKey = 'gateway' | 'free'

/**
 * Union one route's rows by id: effective entries first (menu order), then
 * shipped entries not in effect, then discovered entries not yet known —
 * every id the user could want to see stays visible, discovered-or-not.
 * @param input - the route's effective, shipped, and discovered facts.
 * @returns the checkbox rows in render order.
 */
export function assembleRows(input: RouteRowsInput): RowState[] {
  const rows: RowState[] = []
  const seen = new Set<string>()
  const effectiveIds = new Set(input.effective.map(entry => entry.id))
  const listedIds = new Set((input.discovered ?? []).map(model => model.id))
  for (const entry of input.effective) {
    seen.add(entry.id)
    rows.push({ entry, enabled: true, discovered: false, inListing: listedIds.size === 0 || listedIds.has(entry.id) })
  }
  for (const entry of input.shipped) {
    if (seen.has(entry.id) || effectiveIds.has(entry.id)) continue
    seen.add(entry.id)
    rows.push({ entry, enabled: false, discovered: false, inListing: listedIds.size === 0 || listedIds.has(entry.id) })
  }
  for (const model of input.discovered ?? []) {
    if (seen.has(model.id)) continue
    seen.add(model.id)
    rows.push({
      entry: discoveredEntry(model),
      enabled: false,
      discovered: true,
      inListing: true,
    })
  }
  return rows
}

/** The saved entry one discovered row carries: listing facts, no invented metadata. */
export function discoveredEntry(model: LlmDiscoveredModel): RouteModel {
  return {
    id: model.id,
    ...(model.name === undefined ? {} : { name: model.name }),
    ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
    ...(model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }),
    ...(model.inputModalities === undefined ? {} : { input: [...model.inputModalities] as RouteModel['input'] }),
  }
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
export function saveOp(routeKey: RouteKey, rows: readonly RowState[], checked: ReadonlySet<string>): SettingsPathOpView {
  const models: RouteModel[] = rows
    .filter(row => checked.has(row.entry.id))
    .map(row => row.entry)
  return { op: 'set', path: [routeKey, 'models'], value: models }
}

/** The one settings write that hands a route's menu back to the defaults. */
export function resetOp(routeKey: RouteKey): SettingsPathOpView {
  return { op: 'unset', path: [routeKey, 'models'] }
}

/** The route's effective models out of one described namespace view. */
export function effectiveModelsOf(view: Record<string, unknown> | undefined, routeKey: RouteKey, shipped: readonly RouteModel[]): readonly RouteModel[] {
  const section = view?.[routeKey]
  const models = section !== null && typeof section === 'object' ? (section as { models?: RouteModel[] }).models : undefined
  return models ?? shipped
}
