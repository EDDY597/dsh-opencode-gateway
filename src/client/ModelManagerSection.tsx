/**
 * The model manager section: one card per route, each carrying a refresh
 * button (live listing interrogation) and checkbox rows — checked models are
 * the route's menu. Staged toggles commit as one revision-fenced settings
 * write per save; conflicts reload the snapshot and drop the staging, and a
 * landed write applies its own reply view instead of re-describing.
 *
 * @module dsh-opencode-gateway/client/ModelManagerSection
 */

import { useEffect, useState } from 'react'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { LlmDiscoveredModel, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import type { RouteModel } from '../config.ts'
import type { RouteKey, RowState } from './rows.ts'
import { assembleRows, effectiveModelsOf, resetOp, saveOp } from './rows.ts'
import type { ModelManagerOperations, SettingsWriteOutcome } from './operations.ts'
import type { en } from './locales.ts'

type Translator = (key: keyof typeof en, vars?: Record<string, string | number>) => string

/** Injected dependencies of the section (slot `inject`). */
export interface ModelManagerInjected {
  /** The Host operations the section invokes. */
  operations: ModelManagerOperations
  /** Section copy. */
  t: Translator
  /** Heading copy, resolved through `t` at inject time. */
  copy: { title: string; intro: string }
  /** The route cards this section renders. */
  routes: readonly RouteSpec[]
}

/** One route card's static facts. */
export interface RouteSpec {
  /** The Config section this card manages. */
  key: RouteKey
  /** Card title. */
  title: string
  /** The bundled shipped defaults (the inherit target and initial rows). */
  shipped: readonly RouteModel[]
}

/** Props delivered by the slot outlet; absent pieces mean not injected yet. */
export type ModelManagerSectionProps = Partial<InjectFace<ModelManagerInjected>>

interface PageState {
  phase: 'loading' | 'ready' | 'error'
  view?: SettingsNamespaceView
  error?: string
}

/** One route's interrogation of its own endpoint listing. */
type ProbeState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; models: readonly LlmDiscoveredModel[] }
  | { phase: 'error'; message: string }

/** The effective route provider id out of one described section value. */
function providerOf(view: SettingsNamespaceView | undefined, routeKey: RouteKey, fallback: string): string {
  const value = view?.value
  const section = value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)[routeKey]
    : undefined
  const provider = section !== null && typeof section === 'object' ? (section as { provider?: string }).provider : undefined
  return provider !== undefined && provider.length > 0 ? provider : fallback
}

/** One card's checkbox state, driven from the described view + its probe. */
function Card({ routeKey, spec, view, probe, checked, staged, busy, t, onToggle, onRefresh, onSave, onReset }: {
  routeKey: RouteKey
  spec: RouteSpec
  view?: SettingsNamespaceView
  probe: ProbeState
  checked: ReadonlySet<string>
  staged: boolean
  busy: boolean
  t: Translator
  onToggle: (id: string, next: boolean) => void
  onRefresh: () => void
  onSave: () => void
  onReset: () => void
}) {
  const provider = providerOf(view, routeKey, routeKey === 'gateway' ? 'opencode-gateway' : 'opencode-free')
  const effective = effectiveModelsOf(view?.value as Record<string, unknown> | undefined, routeKey, spec.shipped)
  const discovered = probe.phase === 'ready' ? probe.models : undefined
  const rows: readonly RowState[] = assembleRows({ effective, shipped: spec.shipped, discovered })
  const probeLabel = probe.phase === 'loading'
    ? t('refreshing')
    : probe.phase === 'error'
      ? t('discoverRefused', { message: probe.message })
      : undefined
  return (
    <div className="ocgw-card">
      <div className="ocgw-card-head">
        <span className="ocgw-card-title">{spec.title}</span>
        <span className="ocgw-card-provider">{t('providerLabel')}: {provider}</span>
        <span className="ocgw-spacer" />
        <button type="button" className="ocgw-button" disabled={busy || probe.phase === 'loading'} onClick={onRefresh}>
          {probe.phase === 'loading' ? t('refreshing') : t('refresh')}
        </button>
      </div>
      {probeLabel !== undefined && probe.phase === 'error' ? <div className="ocgw-error">{probeLabel}</div> : undefined}
      <div className="ocgw-rows">
        {rows.length === 0 ? <div className="ocgw-empty">{t('emptyListing')}</div> : rows.map(row => (
          <label key={row.entry.id} className={`ocgw-row${row.enabled ? '' : ' ocgw-row-disabled'}`}>
            <input
              type="checkbox"
              checked={checked.has(row.entry.id)}
              disabled={busy}
              onChange={event => onToggle(row.entry.id, event.target.checked)}
            />
            <span className="ocgw-row-name">{row.entry.name ?? row.entry.id}</span>
            {row.discovered ? <span className="ocgw-tag">{t('discoveredTag')}</span> : undefined}
            <span className="ocgw-spacer" />
            <span className="ocgw-row-id">{row.entry.id}</span>
            {row.entry.contextWindow !== undefined ? (
              <span className="ocgw-chip">{t('contextChip')} {Math.round(row.entry.contextWindow / 1024)}K</span>
            ) : undefined}
          </label>
        ))}
      </div>
      <div className="ocgw-foot">
        <span>{t('uncheckedCount', { count: checked.size })}</span>
        {staged ? <span className="ocgw-tag">{t('stagedHint')}</span> : undefined}
        <span className="ocgw-spacer" />
        <button type="button" className="ocgw-button" disabled={busy} onClick={onReset}>{t('resetDefaults')}</button>
        <button type="button" className="ocgw-button ocgw-button-primary" disabled={busy || !staged} onClick={onSave}>
          {busy ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  )
}

/** The section: describe once on mount, then explicit refreshes and saves. */
export function ModelManagerSection(props: ModelManagerSectionProps) {
  const { operations, t, copy, routes } = props
  const [page, setPage] = useState<PageState>({ phase: 'loading' })
  const [probes, setProbes] = useState<Record<string, ProbeState>>({})
  const [checked, setChecked] = useState<Record<string, ReadonlySet<string>>>({})
  const [staged, setStaged] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  /** Seed one route's checked set from the view's effective menu. */
  const seedFrom = (view: SettingsNamespaceView | undefined): Record<string, ReadonlySet<string>> => {
    if (routes === undefined) return {}
    const next: Record<string, ReadonlySet<string>> = {}
    for (const spec of routes) {
      const key = spec.key
      const effective = effectiveModelsOf(view?.value as Record<string, unknown> | undefined, key, spec.shipped)
      next[key] = new Set(effective.map(entry => entry.id))
    }
    return next
  }

  useEffect(() => {
    if (operations === undefined || routes === undefined || t === undefined) return
    let cancelled = false
    void (async () => {
      try {
        const view = await operations.describeSettings()
        if (cancelled) return
        setPage({ phase: 'ready', view })
        setChecked(seedFrom(view))
      } catch (error: any) {
        if (cancelled) return
        setPage({ phase: 'error', error: t('loadFailed', { message: error?.message ?? String(error) }) })
      }
    })()
    return () => { cancelled = true }
    // The initial load is the only automatic one; writes apply their own reply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations, routes])

  if (operations === undefined || t === undefined || copy === undefined || routes === undefined) return null

  const revision = page.view?.revision

  const refresh = (routeKey: RouteKey): void => {
    const spec = routes.find(candidate => candidate.key === routeKey)
    if (spec === undefined) return
    const provider = providerOf(page.view, routeKey, routeKey === 'gateway' ? 'opencode-gateway' : 'opencode-free')
    setProbes(current => ({ ...current, [routeKey]: { phase: 'loading' } }))
    void operations.discoverModels({ provider }).then((outcome) => {
      setProbes(current => ({
        ...current,
        [routeKey]: outcome.kind === 'found'
          ? { phase: 'ready', models: outcome.models }
          : { phase: 'error', message: outcome.message },
      }))
    })
  }

  const toggle = (routeKey: RouteKey, id: string, next: boolean): void => {
    setChecked(current => {
      const previous = current[routeKey] ?? new Set<string>()
      if (previous.has(id) === next) return current
      const updated = new Set(previous)
      if (next) updated.add(id)
      else updated.delete(id)
      return { ...current, [routeKey]: updated }
    })
    setStaged(current => ({ ...current, [routeKey]: true }))
  }

  const save = (): void => {
    const pending = routes.filter(spec => staged[spec.key] === true)
    if (pending.length === 0) return
    setBusy(true)
    const ops = pending.map((spec) => {
      const probe = probes[spec.key]
      return saveOp(spec.key, assembleRows({
        effective: effectiveModelsOf(page.view?.value as Record<string, unknown> | undefined, spec.key, spec.shipped),
        shipped: spec.shipped,
        discovered: probe?.phase === 'ready' ? probe.models : undefined,
      }), checked[spec.key] ?? new Set())
    })
    void operations.writeSettings(ops, revision).then((outcome: SettingsWriteOutcome) => {
      setBusy(false)
      if (outcome.kind === 'written') {
        setPage({ phase: 'ready', view: outcome.view })
        setChecked(seedFrom(outcome.view))
        setStaged(current => {
          const next = { ...current }
          for (const spec of pending) delete next[spec.key]
          return next
        })
        return
      }
      if (outcome.kind === 'conflict') {
        setStaged({})
        void operations.describeSettings().then((view) => {
          setPage({ phase: 'ready', view })
          setChecked(seedFrom(view))
        })
        return
      }
      setPage({ phase: 'error', error: t('writeRefused', { message: outcome.message }) })
    })
  }

  const reset = (routeKey: RouteKey): void => {
    setBusy(true)
    void operations.writeSettings([resetOp(routeKey)], revision).then((outcome) => {
      setBusy(false)
      if (outcome.kind === 'written') {
        setPage({ phase: 'ready', view: outcome.view })
        setChecked(seedFrom(outcome.view))
        setStaged(current => ({ ...current, [routeKey]: false }))
        return
      }
      if (outcome.kind === 'conflict') {
        setStaged({})
        void operations.describeSettings().then((view) => {
          setPage({ phase: 'ready', view })
          setChecked(seedFrom(view))
        })
        return
      }
      setPage({ phase: 'error', error: t('writeRefused', { message: outcome.message }) })
    })
  }

  return (
    <div className="ocgw-section">
      <div className="ocgw-card-title">{copy.title}</div>
      <div className="ocgw-intro">{copy.intro}</div>
      {page.phase === 'error' ? <div className="ocgw-error">{page.error}</div> : undefined}
      {page.phase === 'ready' ? routes.map(spec => (
        <Card
          key={spec.key}
          routeKey={spec.key}
          spec={spec}
          view={page.view}
          probe={probes[spec.key] ?? { phase: 'idle' }}
          checked={checked[spec.key] ?? new Set()}
          staged={staged[spec.key] === true}
          busy={busy}
          t={t}
          onToggle={(id, next) => toggle(spec.key, id, next)}
          onRefresh={() => refresh(spec.key)}
          onSave={save}
          onReset={() => reset(spec.key)}
        />
      )) : undefined}
    </div>
  )
}
