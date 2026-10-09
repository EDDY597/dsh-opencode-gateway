window.__ModuleLoader__.load({
	id: "dsh-opencode-gateway",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/rows.ts
		/**
		* Union one route's rows by id: effective entries first (menu order), then
		* shipped entries not in effect, then discovered entries not yet known —
		* every id the user could want to see stays visible, discovered-or-not.
		* @param input - the route's effective, shipped, and discovered facts.
		* @returns the checkbox rows in render order.
		*/
		function assembleRows(input) {
			const rows = [];
			const seen = /* @__PURE__ */ new Set();
			const effectiveIds = new Set(input.effective.map((entry) => entry.id));
			for (const entry of input.effective) {
				seen.add(entry.id);
				rows.push({
					entry,
					enabled: true,
					discovered: false
				});
			}
			for (const entry of input.shipped) {
				if (seen.has(entry.id) || effectiveIds.has(entry.id)) continue;
				seen.add(entry.id);
				rows.push({
					entry,
					enabled: false,
					discovered: false
				});
			}
			for (const model of input.discovered ?? []) {
				if (seen.has(model.id)) continue;
				seen.add(model.id);
				rows.push({
					entry: discoveredEntry(model),
					enabled: false,
					discovered: true
				});
			}
			return rows;
		}
		/** The saved entry one discovered row carries: listing facts, no invented metadata. */
		function discoveredEntry(model) {
			return {
				id: model.id,
				...model.name === void 0 ? {} : { name: model.name },
				...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
				...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens },
				...model.inputModalities === void 0 ? {} : { input: [...model.inputModalities] }
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
		function saveOp(routeKey, rows, checked) {
			const models = rows.filter((row) => checked.has(row.entry.id)).map((row) => row.entry);
			return {
				op: "set",
				path: [routeKey, "models"],
				value: models
			};
		}
		/** The one settings write that hands a route's menu back to the defaults. */
		function resetOp(routeKey) {
			return {
				op: "unset",
				path: [routeKey, "models"]
			};
		}
		/** The route's effective models out of one described namespace view. */
		function effectiveModelsOf(view, routeKey, shipped) {
			const section = view?.[routeKey];
			return (section !== null && typeof section === "object" ? section.models : void 0) ?? shipped;
		}
		//#endregion
		//#region src/client/ModelManagerSection.tsx
		/**
		* The model manager section: one card per route, each carrying a refresh
		* button (live listing interrogation) and checkbox rows — checked models are
		* the route's menu. Staged toggles commit as one revision-fenced settings
		* write per save; conflicts reload the snapshot and drop the staging, and a
		* landed write applies its own reply view instead of re-describing.
		*
		* @module dsh-opencode-gateway/client/ModelManagerSection
		*/
		/** The effective route provider id out of one described section value. */
		function providerOf(view, routeKey, fallback) {
			const value = view?.value;
			const section = value !== null && typeof value === "object" && !Array.isArray(value) ? value[routeKey] : void 0;
			const provider = section !== null && typeof section === "object" ? section.provider : void 0;
			return provider !== void 0 && provider.length > 0 ? provider : fallback;
		}
		/** One card's checkbox state, driven from the described view + its probe. */
		function Card({ routeKey, spec, view, probe, checked, staged, busy, t, onToggle, onRefresh, onSave, onReset }) {
			const provider = providerOf(view, routeKey, routeKey === "gateway" ? "opencode-gateway" : "opencode-free");
			const effective = effectiveModelsOf(view?.value, routeKey, spec.shipped);
			const discovered = probe.phase === "ready" ? probe.models : void 0;
			const rows = assembleRows({
				effective,
				shipped: spec.shipped,
				discovered
			});
			const probeLabel = probe.phase === "loading" ? t("refreshing") : probe.phase === "error" ? t("discoverRefused", { message: probe.message }) : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "ocgw-card",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ocgw-card-head",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "ocgw-card-title",
								children: spec.title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "ocgw-card-provider",
								children: [
									t("providerLabel"),
									": ",
									provider
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "ocgw-spacer" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ocgw-button",
								disabled: busy || probe.phase === "loading",
								onClick: onRefresh,
								children: probe.phase === "loading" ? t("refreshing") : t("refresh")
							})
						]
					}),
					probeLabel !== void 0 && probe.phase === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ocgw-error",
						children: probeLabel
					}) : void 0,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ocgw-rows",
						children: rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "ocgw-empty",
							children: t("emptyListing")
						}) : rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: `ocgw-row${row.enabled ? "" : " ocgw-row-disabled"}`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: checked.has(row.entry.id),
									disabled: busy,
									onChange: (event) => onToggle(row.entry.id, event.target.checked)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "ocgw-row-name",
									children: row.entry.name ?? row.entry.id
								}),
								row.discovered ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "ocgw-tag",
									children: t("discoveredTag")
								}) : void 0,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "ocgw-spacer" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "ocgw-row-id",
									children: row.entry.id
								}),
								row.entry.contextWindow !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "ocgw-chip",
									children: [
										t("contextChip"),
										" ",
										Math.round(row.entry.contextWindow / 1024),
										"K"
									]
								}) : void 0
							]
						}, row.entry.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "ocgw-foot",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("uncheckedCount", { count: checked.size }) }),
							staged ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "ocgw-tag",
								children: t("stagedHint")
							}) : void 0,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "ocgw-spacer" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ocgw-button",
								disabled: busy,
								onClick: onReset,
								children: t("resetDefaults")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ocgw-button ocgw-button-primary",
								disabled: busy || !staged,
								onClick: onSave,
								children: busy ? t("saving") : t("save")
							})
						]
					})
				]
			});
		}
		/** The section: describe once on mount, then explicit refreshes and saves. */
		function ModelManagerSection(props) {
			const { operations, t, copy, routes } = props;
			const [page, setPage] = (0, react.useState)({ phase: "loading" });
			const [probes, setProbes] = (0, react.useState)({});
			const [checked, setChecked] = (0, react.useState)({});
			const [staged, setStaged] = (0, react.useState)({});
			const [busy, setBusy] = (0, react.useState)(false);
			/** Seed one route's checked set from the view's effective menu. */
			const seedFrom = (view) => {
				if (routes === void 0) return {};
				const next = {};
				for (const spec of routes) {
					const key = spec.key;
					const effective = effectiveModelsOf(view?.value, key, spec.shipped);
					next[key] = new Set(effective.map((entry) => entry.id));
				}
				return next;
			};
			(0, react.useEffect)(() => {
				if (operations === void 0 || routes === void 0 || t === void 0) return;
				let cancelled = false;
				(async () => {
					try {
						const view = await operations.describeSettings();
						if (cancelled) return;
						setPage({
							phase: "ready",
							view
						});
						setChecked(seedFrom(view));
					} catch (error) {
						if (cancelled) return;
						setPage({
							phase: "error",
							error: t("loadFailed", { message: error?.message ?? String(error) })
						});
					}
				})();
				return () => {
					cancelled = true;
				};
			}, [operations, routes]);
			if (operations === void 0 || t === void 0 || copy === void 0 || routes === void 0) return null;
			const revision = page.view?.revision;
			const refresh = (routeKey) => {
				if (routes.find((candidate) => candidate.key === routeKey) === void 0) return;
				const provider = providerOf(page.view, routeKey, routeKey === "gateway" ? "opencode-gateway" : "opencode-free");
				setProbes((current) => ({
					...current,
					[routeKey]: { phase: "loading" }
				}));
				operations.discoverModels({ provider }).then((outcome) => {
					setProbes((current) => ({
						...current,
						[routeKey]: outcome.kind === "found" ? {
							phase: "ready",
							models: outcome.models
						} : {
							phase: "error",
							message: outcome.message
						}
					}));
				});
			};
			const toggle = (routeKey, id, next) => {
				setChecked((current) => {
					const previous = current[routeKey] ?? /* @__PURE__ */ new Set();
					if (previous.has(id) === next) return current;
					const updated = new Set(previous);
					if (next) updated.add(id);
					else updated.delete(id);
					return {
						...current,
						[routeKey]: updated
					};
				});
				setStaged((current) => ({
					...current,
					[routeKey]: true
				}));
			};
			const save = () => {
				const pending = routes.filter((spec) => staged[spec.key] === true);
				if (pending.length === 0) return;
				setBusy(true);
				const ops = pending.map((spec) => {
					const probe = probes[spec.key];
					return saveOp(spec.key, assembleRows({
						effective: effectiveModelsOf(page.view?.value, spec.key, spec.shipped),
						shipped: spec.shipped,
						discovered: probe?.phase === "ready" ? probe.models : void 0
					}), checked[spec.key] ?? /* @__PURE__ */ new Set());
				});
				operations.writeSettings(ops, revision).then((outcome) => {
					setBusy(false);
					if (outcome.kind === "written") {
						setPage({
							phase: "ready",
							view: outcome.view
						});
						setChecked(seedFrom(outcome.view));
						setStaged((current) => {
							const next = { ...current };
							for (const spec of pending) delete next[spec.key];
							return next;
						});
						return;
					}
					if (outcome.kind === "conflict") {
						setStaged({});
						operations.describeSettings().then((view) => {
							setPage({
								phase: "ready",
								view
							});
							setChecked(seedFrom(view));
						});
						return;
					}
					setPage({
						phase: "error",
						error: t("writeRefused", { message: outcome.message })
					});
				});
			};
			const reset = (routeKey) => {
				setBusy(true);
				operations.writeSettings([resetOp(routeKey)], revision).then((outcome) => {
					setBusy(false);
					if (outcome.kind === "written") {
						setPage({
							phase: "ready",
							view: outcome.view
						});
						setChecked(seedFrom(outcome.view));
						setStaged((current) => ({
							...current,
							[routeKey]: false
						}));
						return;
					}
					if (outcome.kind === "conflict") {
						setStaged({});
						operations.describeSettings().then((view) => {
							setPage({
								phase: "ready",
								view
							});
							setChecked(seedFrom(view));
						});
						return;
					}
					setPage({
						phase: "error",
						error: t("writeRefused", { message: outcome.message })
					});
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "ocgw-section",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ocgw-card-title",
						children: copy.title
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ocgw-intro",
						children: copy.intro
					}),
					page.phase === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "ocgw-error",
						children: page.error
					}) : void 0,
					page.phase === "ready" ? routes.map((spec) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Card, {
						routeKey: spec.key,
						spec,
						view: page.view,
						probe: probes[spec.key] ?? { phase: "idle" },
						checked: checked[spec.key] ?? /* @__PURE__ */ new Set(),
						staged: staged[spec.key] === true,
						busy,
						t,
						onToggle: (id, next) => toggle(spec.key, id, next),
						onRefresh: () => refresh(spec.key),
						onSave: save,
						onReset: () => reset(spec.key)
					}, spec.key)) : void 0
				]
			});
		}
		//#endregion
		//#region src/client/operations.ts
		/** The Loader entry id this plugin's settings form is keyed by. */
		const ENTRY_ID = "opencode-gateway";
		/** The model-discovery registration key; the plugin's own key space. */
		const DISCOVERY_NS = "opencode-gateway";
		/**
		* Bind the section's Host operations to the plugin's Remote surface.
		* @param ctx - the plugin's client context (declares `remote.settings`, `remote.llm`).
		* @returns the operations the section invokes.
		*/
		function createModelManagerOperations(ctx) {
			return {
				describeSettings: async () => {
					const response = await ctx.remote.settings.describe();
					if (!response.ok) return void 0;
					return response.value.namespaces.find((ns) => ns.ns === ENTRY_ID);
				},
				writeSettings: async (ops, expectedRevision) => {
					const response = await ctx.remote.settings.mutate(ENTRY_ID, ops, expectedRevision);
					if (response.ok) return {
						kind: "written",
						view: response.value
					};
					const { code, message } = response.error;
					return code === "settings/conflict" ? {
						kind: "conflict",
						message
					} : {
						kind: "refused",
						message
					};
				},
				discoverModels: async (request) => {
					const response = await ctx.remote.llm.discoverModels(DISCOVERY_NS, request);
					return response.ok ? {
						kind: "found",
						models: response.value
					} : {
						kind: "refused",
						message: response.error.message
					};
				}
			};
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Section copy, zh/en. Keys are flat; the type rides on `en` so a missing
		* translation is a compile error.
		*
		* @module dsh-opencode-gateway/client/locales
		*/
		const en = {
			nav: "OpenCode Gateway",
			title: "OpenCode Gateway",
			intro: "Refresh the live model listing and pick which models land in the model menu. A checked model is menu-visible (composer chip included); an unchecked one is only listed here.",
			cardGateway: "OpenCode Go (subscription via gateway)",
			cardFree: "OpenCode Free (local free tier)",
			refresh: "Refresh",
			refreshing: "Refreshing…",
			save: "Save checked",
			saving: "Saving…",
			saved: "Saved",
			resetDefaults: "Restore defaults",
			contextChip: "ctx",
			discoveredTag: "discovered",
			emptyListing: "No models answered. Refresh once the route is reachable.",
			discoverRefused: "Refresh failed: {message}",
			loadFailed: "Settings load failed: {message}",
			writeConflict: "Settings changed elsewhere; reloaded — apply your checks again.",
			writeRefused: "Save refused: {message}",
			uncheckedCount: "{count} checked",
			stagedHint: "Unsaved changes",
			providerLabel: "route"
		};
		const zh = {
			nav: "OpenCode 网关",
			title: "OpenCode 网关",
			intro: "刷新实时模型列表，并勾选哪些模型进入模型菜单。勾选的模型在菜单与输入框可见；未勾选的仅在此列出。",
			cardGateway: "OpenCode Go（订阅 · 经网关）",
			cardFree: "OpenCode Free（本地免费档）",
			refresh: "刷新",
			refreshing: "刷新中…",
			save: "保存勾选",
			saving: "保存中…",
			saved: "已保存",
			resetDefaults: "恢复内置默认",
			contextChip: "上下文",
			discoveredTag: "发现",
			emptyListing: "没有模型应答。路由可达后再点刷新。",
			discoverRefused: "刷新失败：{message}",
			loadFailed: "设置读取失败：{message}",
			writeConflict: "设置在别处被修改，已重新加载——请重新勾选。",
			writeRefused: "保存被拒绝：{message}",
			uncheckedCount: "已勾选 {count} 个",
			stagedHint: "有未保存的更改",
			providerLabel: "路由"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* The section stylesheet, injected as a `<style>` tag by the client's apply —
		* no CSS pipeline, matching the first-party plugin builds. All selectors are
		* prefixed `ocgw-` to stay out of the shell's way.
		*
		* @module dsh-opencode-gateway/client/styles
		*/
		const SECTION_CSS = `
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
.ocgw-row-disabled .ocgw-row-name, .ocgw-row-disabled .ocgw-row-id { opacity: .38; }
.ocgw-foot { display: flex; align-items: center; gap: 10px; font-size: 12px; opacity: .85; }
.ocgw-note { opacity: .6; font-size: 11.5px; }
.ocgw-error { color: #e5484d; font-size: 12px; }
.ocgw-empty { opacity: .6; font-size: 12px; padding: 8px 2px; }
`;
		//#endregion
		//#region src/registry.ts
		/**
		* Curated model registry for the two routes this plugin serves.
		*
		* Every OpenCode Go entry below is ported from AIMFllyYS/dsh-protocom-api
		* (MIT), whose windows, effort vocabularies, vision flags and refusal list
		* were verified against the live `zen/go` endpoint request by request — the
		* same endpoint this plugin's gateway route reaches through the local
		* gateway. Bare ids here join live listings by identity (the id after its
		* routing prefix), so a model listed under several spellings resolves to one
		* entry.
		*
		* @module dsh-opencode-gateway/registry
		*/
		/** Binary million: 1024^3-ish token context used by OpenCode Go listings. */
		const CONTEXT_1M = 1048576;
		/** 256K-token context. */
		const CONTEXT_256K = 262144;
		/** 200K-token context: the floor every model this plugin serves clears. */
		const CONTEXT_200K = 204800;
		const GO_FULL_REASONING = {
			efforts: [
				"none",
				"minimal",
				"low",
				"medium",
				"high",
				"xhigh",
				"max"
			],
			defaultEffort: "high"
		};
		/** GLM-5.1/5.2/5.3 on Go: thinking cannot be disabled; `minimal`, `none` and `off` all answer 400. */
		const GO_GLM_REASONING = {
			efforts: [
				"low",
				"medium",
				"high",
				"xhigh",
				"max"
			],
			defaultEffort: "high"
		};
		/** muses/grok on the Go responses surface: `none` and `max` answer 400. */
		const GO_RESPONSES_REASONING = {
			efforts: [
				"minimal",
				"low",
				"medium",
				"high",
				"xhigh"
			],
			defaultEffort: "medium"
		};
		/** The narrower Go vocabulary the MiMo v2.x routes accept: a disabling word and three depths. */
		const GO_TIGHT_REASONING = {
			efforts: [
				"none",
				"low",
				"medium",
				"high"
			],
			defaultEffort: "medium"
		};
		/** Qwen3.7 generation on Go: `max`, `minimum` and `off` answer 400. */
		const GO_QWEN37_REASONING = {
			efforts: [
				"none",
				"minimal",
				"low",
				"medium",
				"high",
				"xhigh"
			],
			defaultEffort: "medium"
		};
		const GO_REGISTRY = [
			{
				id: "deepseek-v4.1-flash",
				displayName: "DeepSeek V4.1 Flash",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: true
			},
			{
				id: "glm-5.3",
				displayName: "GLM-5.3",
				contextWindow: 1e6,
				reasoning: GO_GLM_REASONING,
				vision: false
			},
			{
				id: "kimi-k3",
				displayName: "Kimi K3",
				contextWindow: CONTEXT_1M,
				reasoning: GO_FULL_REASONING,
				vision: true
			},
			{
				id: "deepseek-v4-pro",
				displayName: "DeepSeek V4 Pro",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: false
			},
			{
				id: "qwen3.8-max",
				displayName: "Qwen3.8 Max",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: true
			},
			{
				id: "grok-4.6",
				displayName: "Grok 4.6",
				contextWindow: 5e5,
				reasoning: GO_RESPONSES_REASONING,
				vision: true
			},
			{
				id: "grok-4.7",
				displayName: "Grok 4.7",
				contextWindow: 5e5,
				reasoning: GO_RESPONSES_REASONING,
				vision: true
			},
			{
				id: "deepseek-v4-flash",
				displayName: "DeepSeek V4 Flash",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: false
			},
			{
				id: "deepseek-v4-flash-vision-exp",
				displayName: "DeepSeek V4 Flash Vision",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: true
			},
			{
				id: "deepseek-flash",
				displayName: "DeepSeek Flash",
				contextWindow: CONTEXT_200K,
				reasoning: GO_FULL_REASONING
			},
			{
				id: "glm-5.1",
				displayName: "GLM-5.1",
				contextWindow: 202752,
				reasoning: GO_GLM_REASONING
			},
			{
				id: "glm-5.2",
				displayName: "GLM-5.2",
				contextWindow: 1e6,
				reasoning: GO_GLM_REASONING
			},
			{
				id: "glm-5.3-flash",
				displayName: "GLM-5.3 Flash",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: true
			},
			{
				id: "gpt-5.6-luna",
				displayName: "GPT-5.6 Luna",
				contextWindow: 105e4,
				reasoning: {
					efforts: [
						"none",
						"low",
						"medium",
						"high",
						"xhigh",
						"max"
					],
					defaultEffort: "medium"
				},
				vision: true
			},
			{
				id: "hy3",
				displayName: "HY-3",
				contextWindow: 256e3,
				reasoning: GO_FULL_REASONING
			},
			{
				id: "hy4-preview",
				displayName: "HY-4 Preview",
				contextWindow: 1024e3,
				reasoning: GO_FULL_REASONING
			},
			{
				id: "kimi-k2.6",
				displayName: "Kimi K2.6",
				contextWindow: CONTEXT_256K,
				vision: true
			},
			{
				id: "kimi-k2.7-code",
				displayName: "Kimi K2.7 Code",
				contextWindow: CONTEXT_256K,
				reasoning: {
					efforts: [
						"off",
						"minimal",
						"low",
						"medium",
						"high",
						"xhigh",
						"max"
					],
					defaultEffort: "medium"
				},
				vision: true
			},
			{
				id: "longcat-2.0",
				displayName: "LongCat 2.0",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING
			},
			{
				id: "mimo-v2.5",
				displayName: "MiMo V2.5",
				contextWindow: 1e6,
				reasoning: GO_TIGHT_REASONING,
				vision: true
			},
			{
				id: "mimo-v2.5-pro",
				displayName: "MiMo V2.5 Pro",
				contextWindow: CONTEXT_1M,
				reasoning: {
					efforts: [
						"none",
						"low",
						"medium",
						"high"
					],
					defaultEffort: "medium"
				}
			},
			{
				id: "minimax-m2.5",
				displayName: "MiniMax M2.5",
				contextWindow: CONTEXT_200K,
				reasoning: {
					efforts: [
						"minimal",
						"low",
						"medium",
						"high",
						"xhigh",
						"max"
					],
					defaultEffort: "medium"
				}
			},
			{
				id: "minimax-m3",
				displayName: "MiniMax M3",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: true
			},
			{
				id: "muse-spark-1.2-contributor",
				displayName: "Muse Spark 1.2 Contributor",
				contextWindow: CONTEXT_1M,
				reasoning: GO_RESPONSES_REASONING,
				vision: true
			},
			{
				id: "muse-spark-1.3-contributor",
				displayName: "Muse Spark 1.3 Contributor",
				contextWindow: CONTEXT_1M,
				reasoning: GO_RESPONSES_REASONING,
				vision: true
			},
			{
				id: "omen-alpha",
				displayName: "Omen Alpha",
				contextWindow: 5e5,
				reasoning: {
					efforts: [
						"none",
						"minimal",
						"low",
						"medium",
						"high",
						"max"
					],
					defaultEffort: "medium"
				},
				vision: true
			},
			{
				id: "qwen3.6-plus",
				displayName: "Qwen3.6 Plus",
				contextWindow: 1e6,
				reasoning: {
					efforts: [
						"none",
						"minimum",
						"low",
						"medium",
						"high",
						"xhigh"
					],
					defaultEffort: "medium"
				},
				vision: true
			},
			{
				id: "qwen3.7-max",
				displayName: "Qwen3.7 Max",
				contextWindow: 1e6,
				reasoning: GO_QWEN37_REASONING
			},
			{
				id: "qwen3.7-plus",
				displayName: "Qwen3.7 Plus",
				contextWindow: 1e6,
				reasoning: GO_QWEN37_REASONING,
				vision: true
			},
			{
				id: "qwen3.8-flash",
				displayName: "Qwen3.8 Flash",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: true
			},
			{
				id: "mimo-v2.6-pro",
				displayName: "MiMo V2.6 Pro",
				contextWindow: CONTEXT_1M,
				reasoning: GO_TIGHT_REASONING,
				vision: true
			},
			{
				id: "mimo-v2.6-flash",
				displayName: "MiMo V2.6 Flash",
				contextWindow: CONTEXT_1M,
				reasoning: GO_TIGHT_REASONING,
				vision: true
			},
			{
				id: "longcat-2.5-preview-free",
				displayName: "LongCat 2.5 Preview",
				contextWindow: 1e6,
				reasoning: GO_FULL_REASONING,
				vision: true
			},
			{
				id: "space-bunny-free",
				displayName: "Space Bunny Free",
				contextWindow: CONTEXT_1M,
				reasoning: {
					efforts: [
						"low",
						"medium",
						"high",
						"xhigh",
						"max"
					],
					defaultEffort: "medium"
				},
				vision: true
			},
			{
				id: "gpt-6-luna",
				displayName: "GPT-6 Luna",
				contextWindow: 105e4,
				reasoning: {
					efforts: [
						"none",
						"low",
						"medium",
						"high",
						"xhigh",
						"max"
					],
					defaultEffort: "medium"
				},
				vision: true
			}
		];
		/** The bare model id behind a gateway listing id (`go/deepseek-x` → `deepseek-x`). */
		function bareModelId(listingId) {
			const slash = listingId.indexOf("/");
			return slash > 0 ? listingId.slice(slash + 1) : listingId;
		}
		/** Registry entry for a bare id, or undefined. */
		function lookupEntry(bareId) {
			return GO_REGISTRY.find((entry) => entry.id === bareId);
		}
		/**
		* Pi-ai reasoning efforts for one registry entry, or undefined when the entry
		* carries no measured vocabulary (the menu then offers no effort picker).
		* `off` maps to the entry's disabling spelling; entries whose disabling word
		* is `none` map off → 'none', entries that cannot disable omit the level.
		*/
		function reasoningEffortsFor(entry) {
			const vocab = entry.reasoning?.efforts;
			if (!vocab || vocab.length === 0) return void 0;
			const efforts = {};
			for (const level of [
				"off",
				"minimal",
				"low",
				"medium",
				"high",
				"xhigh",
				"max"
			]) {
				const wire = level === "off" ? vocab.includes("none") ? "none" : vocab.includes("off") ? "off" : void 0 : vocab.includes(level) ? level : void 0;
				if (wire !== void 0) efforts[level] = wire;
			}
			return efforts;
		}
		//#endregion
		//#region src/default-models.ts
		const effortsOf = (bareId) => {
			const entry = lookupEntry(bareId);
			return entry === void 0 ? void 0 : reasoningEffortsFor(entry);
		};
		const label = (group, id) => `${group}/${bareModelId(id)}`;
		/** Gateway route: the ZCode list, verbatim ids, registry-enriched metadata. */
		const GATEWAY_DEFAULT_MODELS = [
			{
				id: "go/deepseek-v4.1-flash",
				name: label("OpenCode Go", "go/deepseek-v4.1-flash"),
				contextWindow: 1e6,
				reasoningEfforts: effortsOf("deepseek-v4.1-flash"),
				input: ["text", "image"]
			},
			{
				id: "go/glm-5.3-flash",
				name: label("OpenCode Go", "go/glm-5.3-flash"),
				contextWindow: 1e6,
				reasoningEfforts: effortsOf("glm-5.3-flash"),
				input: ["text", "image"]
			},
			{
				id: "go/hy4-preview",
				name: label("OpenCode Go", "go/hy4-preview"),
				contextWindow: 1e6,
				reasoningEfforts: effortsOf("hy4-preview"),
				input: ["text"]
			},
			{
				id: "go/mimo-v2.6-flash",
				name: label("OpenCode Go", "go/mimo-v2.6-flash"),
				contextWindow: 1e6,
				reasoningEfforts: effortsOf("mimo-v2.6-flash"),
				input: ["text", "image"]
			},
			{
				id: "go/mimo-v2.6-pro",
				name: label("OpenCode Go", "go/mimo-v2.6-pro"),
				contextWindow: 1e6,
				reasoningEfforts: effortsOf("mimo-v2.6-pro"),
				input: ["text", "image"]
			},
			{
				id: "go/gpt-5.6-luna",
				name: label("OpenCode Go", "go/gpt-5.6-luna"),
				contextWindow: 105e4,
				reasoningEfforts: effortsOf("gpt-5.6-luna"),
				input: ["text", "image"]
			},
			{
				id: "go/kimi-k3",
				name: label("OpenCode Go", "go/kimi-k3"),
				contextWindow: 1048576,
				reasoningEfforts: effortsOf("kimi-k3"),
				input: ["text", "image"]
			},
			{
				id: "go/grok-4.7",
				name: label("OpenCode Go", "go/grok-4.7"),
				contextWindow: 5e5,
				reasoningEfforts: effortsOf("grok-4.7"),
				input: ["text", "image"]
			},
			{
				id: "free/big-pickle",
				name: label("OpenCode Free", "free/big-pickle")
			},
			{
				id: "free/space-bunny-free",
				name: label("OpenCode Free", "free/space-bunny-free"),
				contextWindow: 1048576
			},
			{
				id: "free/ling-3.1-flash-free",
				name: label("OpenCode Free", "free/ling-3.1-flash-free")
			},
			{
				id: "free/mimo-v2.6-flash-free",
				name: label("OpenCode Free", "free/mimo-v2.6-flash-free"),
				contextWindow: 1e6
			},
			{
				id: "free/longcat-2.5-preview-free",
				name: label("OpenCode Free", "free/longcat-2.5-preview-free"),
				contextWindow: 1048576
			},
			{
				id: "free/nemotron-3-ultra-free",
				name: label("OpenCode Free", "free/nemotron-3-ultra-free")
			},
			{
				id: "free/nemotron-3.5-lightning-free",
				name: label("OpenCode Free", "free/nemotron-3.5-lightning-free")
			}
		];
		/** Free route: the same seven free models under the proxy's raw wire ids. */
		const FREE_DEFAULT_MODELS = [
			{
				id: "opencode/big-pickle",
				name: label("OpenCode Free", "opencode/big-pickle")
			},
			{
				id: "opencode/space-bunny-free",
				name: label("OpenCode Free", "opencode/space-bunny-free"),
				contextWindow: 1048576
			},
			{
				id: "opencode/ling-3.1-flash-free",
				name: label("OpenCode Free", "opencode/ling-3.1-flash-free")
			},
			{
				id: "opencode/mimo-v2.6-flash-free",
				name: label("OpenCode Free", "opencode/mimo-v2.6-flash-free"),
				contextWindow: 1e6
			},
			{
				id: "opencode/longcat-2.5-preview-free",
				name: label("OpenCode Free", "opencode/longcat-2.5-preview-free"),
				contextWindow: 1048576
			},
			{
				id: "opencode/nemotron-3-ultra-free",
				name: label("OpenCode Free", "opencode/nemotron-3-ultra-free")
			},
			{
				id: "opencode/nemotron-3.5-lightning-free",
				name: label("OpenCode Free", "opencode/nemotron-3.5-lightning-free")
			}
		];
		//#endregion
		//#region src/client/index.ts
		/** The locale namespace this section owns. */
		const NS = "settings.opencode-gateway";
		/** Required services. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.settings",
			"remote.llm"
		];
		/** Wire the model manager into the settings page. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}));
			const t = (key, vars) => {
				let text = ctx.locale.bind(NS)(key);
				if (vars !== void 0) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
				return text;
			};
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset["plugin"] = "dsh-opencode-gateway";
				tag.textContent = SECTION_CSS;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			});
			ctx.slots.inject("settings.section", () => {
				const section = ctx.slots.register({
					name: "settings.section",
					id: "opencode-gateway",
					order: 20,
					label: () => t("nav"),
					inject: () => ({
						operations: createModelManagerOperations(ctx),
						t,
						copy: {
							title: t("title"),
							intro: t("intro")
						},
						routes: [{
							key: "gateway",
							title: t("cardGateway"),
							shipped: GATEWAY_DEFAULT_MODELS
						}, {
							key: "free",
							title: t("cardFree"),
							shipped: FREE_DEFAULT_MODELS
						}]
					})
				}, ModelManagerSection);
				return () => section();
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map