import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The model manager section: one card per route, each carrying a refresh
 * button (live listing interrogation) and checkbox rows — checked models are
 * the route's menu. Staged toggles commit as one revision-fenced settings
 * write per save; conflicts reload the snapshot and drop the staging, and a
 * landed write applies its own reply view instead of re-describing.
 *
 * @module dsh-opencode-gateway/client/ModelManagerSection
 */
import { useEffect, useState } from 'react';
import { assembleRows, effectiveModelsOf, resetOp, saveOp } from "./rows.js";
/** The effective route provider id out of one described section value. */
function providerOf(view, routeKey, fallback) {
    const value = view?.value;
    const section = value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value[routeKey]
        : undefined;
    const provider = section !== null && typeof section === 'object' ? section.provider : undefined;
    return provider !== undefined && provider.length > 0 ? provider : fallback;
}
/** One card's checkbox state, driven from the described view + its probe. */
function Card({ routeKey, spec, view, probe, checked, staged, busy, t, onToggle, onRefresh, onSave, onReset }) {
    const provider = providerOf(view, routeKey, routeKey === 'gateway' ? 'opencode-gateway' : 'opencode-free');
    const effective = effectiveModelsOf(view?.value, routeKey, spec.shipped);
    const discovered = probe.phase === 'ready' ? probe.models : undefined;
    const rows = assembleRows({ effective, shipped: spec.shipped, discovered });
    const probeLabel = probe.phase === 'loading'
        ? t('refreshing')
        : probe.phase === 'error'
            ? t('discoverRefused', { message: probe.message })
            : undefined;
    return (_jsxs("div", { className: "ocgw-card", children: [_jsxs("div", { className: "ocgw-card-head", children: [_jsx("span", { className: "ocgw-card-title", children: spec.title }), _jsxs("span", { className: "ocgw-card-provider", children: [t('providerLabel'), ": ", provider] }), _jsx("span", { className: "ocgw-spacer" }), _jsx("button", { type: "button", className: "ocgw-button", disabled: busy || probe.phase === 'loading', onClick: onRefresh, children: probe.phase === 'loading' ? t('refreshing') : t('refresh') })] }), probeLabel !== undefined && probe.phase === 'error' ? _jsx("div", { className: "ocgw-error", children: probeLabel }) : undefined, _jsx("div", { className: "ocgw-rows", children: rows.length === 0 ? _jsx("div", { className: "ocgw-empty", children: t('emptyListing') }) : rows.map(row => (_jsxs("label", { className: `ocgw-row${row.enabled ? '' : ' ocgw-row-disabled'}`, children: [_jsx("input", { type: "checkbox", checked: checked.has(row.entry.id), disabled: busy, onChange: event => onToggle(row.entry.id, event.target.checked) }), _jsx("span", { className: "ocgw-row-name", children: row.entry.name ?? row.entry.id }), row.discovered ? _jsx("span", { className: "ocgw-tag", children: t('discoveredTag') }) : undefined, row.inListing ? undefined : _jsx("span", { className: "ocgw-tag ocgw-tag-stale", children: t('notInListing') }), _jsx("span", { className: "ocgw-spacer" }), _jsx("span", { className: "ocgw-row-id", children: row.entry.id }), row.entry.contextWindow !== undefined ? (_jsxs("span", { className: "ocgw-chip", children: [t('contextChip'), " ", Math.round(row.entry.contextWindow / 1024), "K"] })) : undefined] }, row.entry.id))) }), _jsxs("div", { className: "ocgw-foot", children: [_jsx("span", { children: t('uncheckedCount', { count: checked.size }) }), staged ? _jsx("span", { className: "ocgw-tag", children: t('stagedHint') }) : undefined, _jsx("span", { className: "ocgw-spacer" }), _jsx("button", { type: "button", className: "ocgw-button", disabled: busy, onClick: onReset, children: t('resetDefaults') }), _jsx("button", { type: "button", className: "ocgw-button ocgw-button-primary", disabled: busy || !staged, onClick: onSave, children: busy ? t('saving') : t('save') })] })] }));
}
/** The section: describe once on mount, then explicit refreshes and saves. */
export function ModelManagerSection(props) {
    const { operations, t, copy, routes } = props;
    const [page, setPage] = useState({ phase: 'loading' });
    const [probes, setProbes] = useState({});
    const [checked, setChecked] = useState({});
    const [staged, setStaged] = useState({});
    const [busy, setBusy] = useState(false);
    /** Seed one route's checked set from the view's effective menu. */
    const seedFrom = (view) => {
        if (routes === undefined)
            return {};
        const next = {};
        for (const spec of routes) {
            const key = spec.key;
            const effective = effectiveModelsOf(view?.value, key, spec.shipped);
            next[key] = new Set(effective.map(entry => entry.id));
        }
        return next;
    };
    useEffect(() => {
        if (operations === undefined || routes === undefined || t === undefined)
            return;
        let cancelled = false;
        void (async () => {
            try {
                const view = await operations.describeSettings();
                if (cancelled)
                    return;
                setPage({ phase: 'ready', view });
                setChecked(seedFrom(view));
            }
            catch (error) {
                if (cancelled)
                    return;
                setPage({ phase: 'error', error: t('loadFailed', { message: error?.message ?? String(error) }) });
            }
        })();
        return () => { cancelled = true; };
        // The initial load is the only automatic one; writes apply their own reply.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operations, routes]);
    if (operations === undefined || t === undefined || copy === undefined || routes === undefined)
        return null;
    const revision = page.view?.revision;
    const refresh = (routeKey) => {
        const spec = routes.find(candidate => candidate.key === routeKey);
        if (spec === undefined)
            return;
        const provider = providerOf(page.view, routeKey, routeKey === 'gateway' ? 'opencode-gateway' : 'opencode-free');
        setProbes(current => ({ ...current, [routeKey]: { phase: 'loading' } }));
        void operations.discoverModels({ provider }).then((outcome) => {
            setProbes(current => ({
                ...current,
                [routeKey]: outcome.kind === 'found'
                    ? { phase: 'ready', models: outcome.models }
                    : { phase: 'error', message: outcome.message },
            }));
        });
    };
    const toggle = (routeKey, id, next) => {
        setChecked(current => {
            const previous = current[routeKey] ?? new Set();
            if (previous.has(id) === next)
                return current;
            const updated = new Set(previous);
            if (next)
                updated.add(id);
            else
                updated.delete(id);
            return { ...current, [routeKey]: updated };
        });
        setStaged(current => ({ ...current, [routeKey]: true }));
    };
    const save = () => {
        const pending = routes.filter(spec => staged[spec.key] === true);
        if (pending.length === 0)
            return;
        setBusy(true);
        const ops = pending.map((spec) => {
            const probe = probes[spec.key];
            return saveOp(spec.key, assembleRows({
                effective: effectiveModelsOf(page.view?.value, spec.key, spec.shipped),
                shipped: spec.shipped,
                discovered: probe?.phase === 'ready' ? probe.models : undefined,
            }), checked[spec.key] ?? new Set());
        });
        void operations.writeSettings(ops, revision).then((outcome) => {
            setBusy(false);
            if (outcome.kind === 'written') {
                setPage({ phase: 'ready', view: outcome.view });
                setChecked(seedFrom(outcome.view));
                setStaged(current => {
                    const next = { ...current };
                    for (const spec of pending)
                        delete next[spec.key];
                    return next;
                });
                return;
            }
            if (outcome.kind === 'conflict') {
                setStaged({});
                void operations.describeSettings().then((view) => {
                    setPage({ phase: 'ready', view });
                    setChecked(seedFrom(view));
                });
                return;
            }
            setPage({ phase: 'error', error: t('writeRefused', { message: outcome.message }) });
        });
    };
    const reset = (routeKey) => {
        setBusy(true);
        void operations.writeSettings([resetOp(routeKey)], revision).then((outcome) => {
            setBusy(false);
            if (outcome.kind === 'written') {
                setPage({ phase: 'ready', view: outcome.view });
                setChecked(seedFrom(outcome.view));
                setStaged(current => ({ ...current, [routeKey]: false }));
                return;
            }
            if (outcome.kind === 'conflict') {
                setStaged({});
                void operations.describeSettings().then((view) => {
                    setPage({ phase: 'ready', view });
                    setChecked(seedFrom(view));
                });
                return;
            }
            setPage({ phase: 'error', error: t('writeRefused', { message: outcome.message }) });
        });
    };
    return (_jsxs("div", { className: "ocgw-section", children: [_jsx("div", { className: "ocgw-card-title", children: copy.title }), _jsx("div", { className: "ocgw-intro", children: copy.intro }), page.phase === 'error' ? _jsx("div", { className: "ocgw-error", children: page.error }) : undefined, page.phase === 'ready' ? routes.map(spec => (_jsx(Card, { routeKey: spec.key, spec: spec, view: page.view, probe: probes[spec.key] ?? { phase: 'idle' }, checked: checked[spec.key] ?? new Set(), staged: staged[spec.key] === true, busy: busy, t: t, onToggle: (id, next) => toggle(spec.key, id, next), onRefresh: () => refresh(spec.key), onSave: save, onReset: () => reset(spec.key) }, spec.key))) : undefined] }));
}
