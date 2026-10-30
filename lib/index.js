import { i as lazyApi, r as createProvider } from "./models-CIzW8VSS.js";
import { fileURLToPath } from "node:url";
import path, { join, resolve } from "node:path";
import { LlmError, RetryPolicySchema, assertUsableApiKey, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import z from "@deepseek-ai/schemastery";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
import crypto from "node:crypto";
import fs, { accessSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import http, { createServer } from "node:http";
import os, { homedir } from "node:os";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { credentialRef, isCredentialRefName } from "@deepseek-ai/dsh-credentials";
//#region src/config.ts
/**
* Plugin configuration: the two routes this plugin serves.
*
* `gateway` points at the local opencode-api-plugin gateway (an OpenAI
* Chat Completions endpoint that itself fronts OpenCode Go, OpenCode Zen and
* any custom upstreams its config declares); `free` configures the inlined
* opencode2api local proxy that drives the machine's own `opencode serve`
* backend for the Zen free tier. Configuration comes from the composition
* layer (the profile's `cordis.patch.yml`) — this plugin installs no settings
* section, and cordis restarts the plugin when composition config changes.
*
* @module dsh-opencode-gateway/config
*/
/**
* Read one config section through either shape it arrives in: a live
* `Volatile` ref (the loader hands volatile fields as refs, so a settings
* write reaches the running plugin) or a plain object (composition tests,
* and the pre-1.7 loader shape).
* @param section - the config field as handed to `apply`.
* @returns the section's current value, or undefined when unset.
*/
function readSection(section) {
	if (section === void 0) return void 0;
	const ref = section;
	return typeof ref?.get === "function" ? ref.get() : section;
}
const DEFAULT_GATEWAY = {
	provider: "opencode-gateway",
	displayName: "OpenCode Go",
	baseURL: "http://127.0.0.1:8787/v1",
	apiKeyEnv: "OPENCODE_GATEWAY_KEY",
	hiddenModels: ["free/"],
	discoverModels: false,
	defaultContextWindow: 262144,
	defaultMaxTokens: 32768,
	streamIdleTimeoutMs: 3e5,
	retryPolicy: {
		mode: "normal",
		maxRetries: 2
	}
};
const DEFAULT_FREE = {
	provider: "opencode-free",
	displayName: "OpenCode Free",
	mode: "service",
	serviceUrl: "http://127.0.0.1:18090",
	serviceApiKeyEnv: "OPENCODE2API_SERVER_KEY",
	manageService: false,
	serviceExePath: "",
	serviceConfigPath: "",
	serverUrl: "http://127.0.0.1:10001",
	proxyPort: 10102,
	opencodePath: "opencode",
	manageBackend: true,
	zenApiKeyEnv: "OPENCODE_ZEN_API_KEY",
	disableTools: true,
	internalAllowedTools: [
		"webfetch",
		"bash",
		"websearch"
	],
	promptMode: "standard",
	omitSystemPrompt: false,
	requestTimeoutMs: 3e5,
	autoCleanupConversations: true,
	useIsolatedHome: false,
	discoverModels: false,
	defaultContextWindow: 262144,
	defaultMaxTokens: 32768,
	streamIdleTimeoutMs: 3e5,
	retryPolicy: {
		mode: "normal",
		maxRetries: 2
	}
};
const optionalList = (item) => z.union([z.array(item), z.const(void 0)]);
const modelEntry = z.object({
	id: z.string().required(),
	name: z.string(),
	contextWindow: z.number(),
	maxTokens: z.number(),
	reasoningEfforts: z.any(),
	input: optionalList(z.string())
});
const gatewaySectionSchema = z.object({
	provider: z.string().default(DEFAULT_GATEWAY.provider),
	displayName: z.string().default(DEFAULT_GATEWAY.displayName),
	baseURL: z.string().default(DEFAULT_GATEWAY.baseURL),
	apiKeyEnv: z.string().default(DEFAULT_GATEWAY.apiKeyEnv),
	hiddenModels: z.array(z.string()).default([...DEFAULT_GATEWAY.hiddenModels]),
	discoverModels: z.boolean().default(DEFAULT_GATEWAY.discoverModels),
	models: optionalList(modelEntry),
	defaultContextWindow: z.number().default(DEFAULT_GATEWAY.defaultContextWindow),
	defaultMaxTokens: z.number().default(DEFAULT_GATEWAY.defaultMaxTokens),
	streamIdleTimeoutMs: z.number().default(DEFAULT_GATEWAY.streamIdleTimeoutMs),
	retryPolicy: RetryPolicySchema
}).default({});
const freeSectionSchema = z.object({
	provider: z.string().default(DEFAULT_FREE.provider),
	displayName: z.string().default(DEFAULT_FREE.displayName),
	mode: z.union([z.const("service"), z.const("embedded")]).default(DEFAULT_FREE.mode),
	serviceUrl: z.string().default(DEFAULT_FREE.serviceUrl),
	serviceApiKeyEnv: z.string().default(DEFAULT_FREE.serviceApiKeyEnv),
	manageService: z.boolean().default(DEFAULT_FREE.manageService),
	serviceExePath: z.string().default(DEFAULT_FREE.serviceExePath),
	serviceConfigPath: z.string().default(DEFAULT_FREE.serviceConfigPath),
	serverUrl: z.string().default(DEFAULT_FREE.serverUrl),
	proxyPort: z.number().default(DEFAULT_FREE.proxyPort),
	opencodePath: z.string().default(DEFAULT_FREE.opencodePath),
	manageBackend: z.boolean().default(DEFAULT_FREE.manageBackend),
	serverPassword: z.string(),
	zenApiKeyEnv: z.string().default(DEFAULT_FREE.zenApiKeyEnv),
	disableTools: z.boolean().default(DEFAULT_FREE.disableTools),
	internalAllowedTools: z.array(z.string()).default([...DEFAULT_FREE.internalAllowedTools]),
	promptMode: z.string().default(DEFAULT_FREE.promptMode),
	omitSystemPrompt: z.boolean().default(DEFAULT_FREE.omitSystemPrompt),
	requestTimeoutMs: z.number().default(DEFAULT_FREE.requestTimeoutMs),
	autoCleanupConversations: z.boolean().default(DEFAULT_FREE.autoCleanupConversations),
	useIsolatedHome: z.boolean().default(DEFAULT_FREE.useIsolatedHome),
	models: optionalList(modelEntry),
	discoverModels: z.boolean().default(DEFAULT_FREE.discoverModels),
	defaultContextWindow: z.number().default(DEFAULT_FREE.defaultContextWindow),
	defaultMaxTokens: z.number().default(DEFAULT_FREE.defaultMaxTokens),
	streamIdleTimeoutMs: z.number().default(DEFAULT_FREE.streamIdleTimeoutMs),
	retryPolicy: RetryPolicySchema
}).default({});
/** Runtime schema for {@link Config}; the volatile sections are the settings form. */
const Config = z.object({
	gateway: gatewaySectionSchema.volatile(),
	free: freeSectionSchema.volatile()
});
function positiveInteger(value, label, max) {
	if (!Number.isInteger(value) || value <= 0 || max !== void 0 && value > max) throw new Error(`opencode-gateway: ${label} must be a positive integer${max !== void 0 ? ` no greater than ${max}` : ""}`);
	return value;
}
function resolveRouteModels(raw, label) {
	const models = [...raw ?? []];
	const seen = /* @__PURE__ */ new Set();
	for (const entry of models) {
		if (typeof entry?.id !== "string" || entry.id.length === 0) throw new Error(`opencode-gateway: ${label} has a model with a missing or empty id`);
		if (seen.has(entry.id)) throw new Error(`opencode-gateway: ${label} lists model "${entry.id}" more than once`);
		seen.add(entry.id);
		if (entry.contextWindow !== void 0) positiveInteger(entry.contextWindow, `${label} model "${entry.id}" contextWindow`);
		if (entry.maxTokens !== void 0) positiveInteger(entry.maxTokens, `${label} model "${entry.id}" maxTokens`);
		const efforts = entry.reasoningEfforts;
		if (efforts !== void 0 && efforts !== false) {
			if (typeof efforts !== "object") throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts must be false or a level dict`);
			if (Object.keys(efforts).filter((level) => level !== "off").length === 0) throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts offers no level beyond "off"`);
			for (const [level, wire] of Object.entries(efforts)) {
				if (level !== "off" && wire === null) throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts.${level} needs the wire value dispatch should send; only "off" may leave it empty`);
				if (typeof wire === "string" && wire.length === 0) throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts.${level} must not be an empty string`);
			}
		}
		if (entry.input !== void 0) {
			if (entry.input.length === 0) throw new Error(`opencode-gateway: ${label} model "${entry.id}" input must name at least one modality`);
			for (const modality of entry.input) if (modality !== "text" && modality !== "image") throw new Error(`opencode-gateway: ${label} model "${entry.id}" input modality must be "text" or "image"`);
		}
	}
	return models;
}
function resolveConfig(source) {
	const gatewayRaw = source.gateway ?? {};
	const freeRaw = source.free ?? {};
	const gatewayProvider = gatewayRaw.provider ?? DEFAULT_GATEWAY.provider;
	const freeProvider = freeRaw.provider ?? DEFAULT_FREE.provider;
	if (gatewayProvider.length === 0) throw new Error("opencode-gateway: gateway.provider must be non-empty");
	if (freeProvider.length === 0) throw new Error("opencode-gateway: free.provider must be non-empty");
	if (gatewayProvider === freeProvider) throw new Error(`opencode-gateway: both routes resolve to provider "${gatewayProvider}"`);
	const gatewayBaseURL = gatewayRaw.baseURL ?? DEFAULT_GATEWAY.baseURL;
	if (gatewayBaseURL.length === 0) throw new Error("opencode-gateway: gateway.baseURL must be non-empty");
	const freeServerUrl = freeRaw.serverUrl ?? DEFAULT_FREE.serverUrl;
	if (freeServerUrl.length === 0) throw new Error("opencode-gateway: free.serverUrl must be non-empty");
	const apiKeyEnv = gatewayRaw.apiKeyEnv ?? DEFAULT_GATEWAY.apiKeyEnv;
	if (apiKeyEnv.length === 0) throw new Error("opencode-gateway: gateway.apiKeyEnv must be non-empty");
	const promptMode = freeRaw.promptMode ?? DEFAULT_FREE.promptMode;
	if (promptMode !== "standard" && promptMode !== "plugin-inject") throw new Error("opencode-gateway: free.promptMode must be \"standard\" or \"plugin-inject\"");
	const hiddenModels = [...gatewayRaw.hiddenModels ?? DEFAULT_GATEWAY.hiddenModels];
	if (hiddenModels.some((prefix) => prefix.length === 0)) throw new Error("opencode-gateway: gateway.hiddenModels entries must be non-empty");
	const serverPassword = freeRaw.serverPassword;
	return {
		gateway: {
			provider: gatewayProvider,
			displayName: gatewayRaw.displayName ?? gatewayProvider,
			baseURL: gatewayBaseURL.replace(/\/+$/, ""),
			apiKeyEnv,
			hiddenModels,
			discoverModels: gatewayRaw.discoverModels ?? DEFAULT_GATEWAY.discoverModels,
			models: gatewayRaw.models === void 0 ? void 0 : resolveRouteModels(gatewayRaw.models, "gateway.models"),
			defaultContextWindow: positiveInteger(gatewayRaw.defaultContextWindow ?? DEFAULT_GATEWAY.defaultContextWindow, "gateway.defaultContextWindow"),
			defaultMaxTokens: positiveInteger(gatewayRaw.defaultMaxTokens ?? DEFAULT_GATEWAY.defaultMaxTokens, "gateway.defaultMaxTokens"),
			streamIdleTimeoutMs: positiveInteger(gatewayRaw.streamIdleTimeoutMs ?? DEFAULT_GATEWAY.streamIdleTimeoutMs, "gateway.streamIdleTimeoutMs", MAX_TIMER_DELAY_MS),
			retryPolicy: resolveRetryPolicy(gatewayRaw.retryPolicy ?? DEFAULT_GATEWAY.retryPolicy, "opencode-gateway: gateway.retryPolicy")
		},
		free: {
			provider: freeProvider,
			displayName: freeRaw.displayName ?? freeProvider,
			mode: freeRaw.mode ?? DEFAULT_FREE.mode,
			serviceUrl: (freeRaw.serviceUrl ?? DEFAULT_FREE.serviceUrl).replace(/\/+$/, ""),
			serviceApiKeyEnv: freeRaw.serviceApiKeyEnv ?? DEFAULT_FREE.serviceApiKeyEnv,
			manageService: freeRaw.manageService ?? DEFAULT_FREE.manageService,
			serviceExePath: freeRaw.serviceExePath ?? DEFAULT_FREE.serviceExePath,
			serviceConfigPath: freeRaw.serviceConfigPath ?? DEFAULT_FREE.serviceConfigPath,
			serverUrl: freeServerUrl.replace(/\/+$/, ""),
			proxyPort: positiveInteger(freeRaw.proxyPort ?? DEFAULT_FREE.proxyPort, "free.proxyPort", 65535),
			opencodePath: freeRaw.opencodePath ?? DEFAULT_FREE.opencodePath,
			manageBackend: freeRaw.manageBackend ?? DEFAULT_FREE.manageBackend,
			...serverPassword !== void 0 && serverPassword.length > 0 ? { serverPassword } : {},
			zenApiKeyEnv: freeRaw.zenApiKeyEnv ?? DEFAULT_FREE.zenApiKeyEnv,
			disableTools: freeRaw.disableTools ?? DEFAULT_FREE.disableTools,
			internalAllowedTools: [...freeRaw.internalAllowedTools ?? DEFAULT_FREE.internalAllowedTools],
			promptMode,
			omitSystemPrompt: freeRaw.omitSystemPrompt ?? DEFAULT_FREE.omitSystemPrompt,
			requestTimeoutMs: positiveInteger(freeRaw.requestTimeoutMs ?? DEFAULT_FREE.requestTimeoutMs, "free.requestTimeoutMs"),
			autoCleanupConversations: freeRaw.autoCleanupConversations ?? DEFAULT_FREE.autoCleanupConversations,
			useIsolatedHome: freeRaw.useIsolatedHome ?? DEFAULT_FREE.useIsolatedHome,
			models: freeRaw.models === void 0 ? void 0 : resolveRouteModels(freeRaw.models, "free.models"),
			discoverModels: freeRaw.discoverModels ?? DEFAULT_FREE.discoverModels,
			defaultContextWindow: positiveInteger(freeRaw.defaultContextWindow ?? DEFAULT_FREE.defaultContextWindow, "free.defaultContextWindow"),
			defaultMaxTokens: positiveInteger(freeRaw.defaultMaxTokens ?? DEFAULT_FREE.defaultMaxTokens, "free.defaultMaxTokens"),
			streamIdleTimeoutMs: positiveInteger(freeRaw.streamIdleTimeoutMs ?? DEFAULT_FREE.streamIdleTimeoutMs, "free.streamIdleTimeoutMs", MAX_TIMER_DELAY_MS),
			retryPolicy: resolveRetryPolicy(freeRaw.retryPolicy ?? DEFAULT_FREE.retryPolicy, "opencode-gateway: free.retryPolicy")
		}
	};
}
/** Default settings used by an absent section and by composition examples. */
const DEFAULT_CONFIG = {
	gateway: {
		...DEFAULT_GATEWAY,
		hiddenModels: [...DEFAULT_GATEWAY.hiddenModels]
	},
	free: {
		...DEFAULT_FREE,
		internalAllowedTools: [...DEFAULT_FREE.internalAllowedTools],
		mode: DEFAULT_FREE.mode
	}
};
//#endregion
//#region src/local/backend.ts
/**
* OpenCode backend lifecycle management (ported from opencode2api src/proxy.js, MIT).
*
* The embedded local upstream spawns `opencode serve` on demand, waits for it to become
* healthy, and shuts it down with the gateway. On Windows the backend runs with the real
* user home (opencode storage paths) inside an empty workspace directory; on Unix-like
* systems an optional fake-home jail provides isolation.
*/
const OPENCODE_BASENAME = "opencode";
const STARTUP_WAIT_INTERVAL_MS = 2e3;
const STARTING_WAIT_INTERVAL_MS = 1e3;
const backendState = /* @__PURE__ */ new Map();
function getBackendState(stateKey) {
	let state = backendState.get(stateKey);
	if (!state) {
		state = {
			isStarting: false,
			process: null,
			jailRoot: null
		};
		backendState.set(stateKey, state);
	}
	return state;
}
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
function buildBackendAuthHeaders(password = "") {
	if (!password) return void 0;
	return { Authorization: `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}` };
}
/**
* `/global/health` is OpenCode's real health endpoint. `/health` is not an API route: it
* falls through to the web UI handler, which may proxy to app.opencode.ai and answer 200
* even when the API is not usable.
*/
function checkHealth(serverUrl, password = "") {
	return new Promise((resolve, reject) => {
		const headers = buildBackendAuthHeaders(password);
		const options = headers ? { headers } : {};
		const req = http.get(`${serverUrl}/global/health`, options, (res) => {
			if (res.statusCode !== 200) {
				res.resume();
				reject(/* @__PURE__ */ new Error(`Status ${res.statusCode}`));
				return;
			}
			let body = "";
			res.setEncoding("utf8");
			res.on("data", (chunk) => {
				body += chunk;
			});
			res.on("end", () => {
				try {
					if (JSON.parse(body)?.healthy === true) resolve(true);
					else reject(/* @__PURE__ */ new Error("Backend reported unhealthy"));
				} catch {
					reject(/* @__PURE__ */ new Error("Unexpected health response"));
				}
			});
		});
		req.on("error", (e) => reject(e));
		req.setTimeout(2e3, () => {
			req.destroy();
			reject(/* @__PURE__ */ new Error("Timeout"));
		});
	});
}
function splitPathEnv() {
	return (process.env.PATH || "").split(path.delimiter).filter(Boolean);
}
function pushDir(list, dir) {
	if (!dir) return;
	if (!list.includes(dir)) list.push(dir);
}
function pushExistingDir(list, dir) {
	if (!dir) return;
	if (!fs.existsSync(dir)) return;
	if (!list.includes(dir)) list.push(dir);
}
function addVersionedDirs(list, baseDir, subpath) {
	if (!baseDir || !fs.existsSync(baseDir)) return;
	let entries = [];
	try {
		entries = fs.readdirSync(baseDir, { withFileTypes: true });
	} catch {
		return;
	}
	entries.forEach((entry) => {
		if (!entry.isDirectory()) return;
		pushExistingDir(list, path.join(baseDir, entry.name, subpath || ""));
	});
}
function prefixToBin(prefix) {
	if (!prefix) return null;
	return process.platform === "win32" ? prefix : path.join(prefix, "bin");
}
function getOpencodeCandidateNames() {
	if (process.platform === "win32") return [
		`${OPENCODE_BASENAME}.cmd`,
		`${OPENCODE_BASENAME}.exe`,
		`${OPENCODE_BASENAME}.bat`,
		OPENCODE_BASENAME
	];
	return [OPENCODE_BASENAME];
}
function findExecutableInDirs(dirs, names) {
	for (const dir of dirs) for (const name of names) {
		const full = path.join(dir, name);
		if (fs.existsSync(full)) return full;
	}
	return null;
}
function resolveOpencodePath(requestedPath) {
	const input = (requestedPath || "").trim();
	const names = getOpencodeCandidateNames();
	if (input) {
		if (path.isAbsolute(input) || input.includes("/") || input.includes("\\")) {
			if (fs.existsSync(input)) return {
				path: input,
				source: "config"
			};
			const resolved = path.resolve(process.cwd(), input);
			if (fs.existsSync(resolved)) return {
				path: resolved,
				source: "config"
			};
		}
	}
	const fromPath = findExecutableInDirs(splitPathEnv(), names);
	if (fromPath) return {
		path: fromPath,
		source: "PATH"
	};
	const extraDirs = [];
	if (process.env.OPENCODE_HOME) pushDir(extraDirs, path.join(process.env.OPENCODE_HOME, "bin"));
	if (process.env.OPENCODE_DIR) pushDir(extraDirs, path.join(process.env.OPENCODE_DIR, "bin"));
	pushDir(extraDirs, prefixToBin(process.env.npm_config_prefix || process.env.NPM_CONFIG_PREFIX));
	pushDir(extraDirs, process.env.PNPM_HOME);
	if (process.env.YARN_GLOBAL_FOLDER) pushDir(extraDirs, path.join(process.env.YARN_GLOBAL_FOLDER, "bin"));
	if (process.env.VOLTA_HOME) pushDir(extraDirs, path.join(process.env.VOLTA_HOME, "bin"));
	pushDir(extraDirs, process.env.NVM_BIN);
	pushDir(extraDirs, path.dirname(process.execPath));
	const home = os.homedir();
	if (home) {
		pushDir(extraDirs, path.join(home, ".opencode", "bin"));
		pushDir(extraDirs, path.join(home, ".local", "bin"));
		pushDir(extraDirs, path.join(home, ".npm-global", "bin"));
		pushDir(extraDirs, path.join(home, ".npm", "bin"));
		pushDir(extraDirs, path.join(home, ".pnpm-global", "bin"));
		pushDir(extraDirs, path.join(home, ".local", "share", "pnpm"));
		pushDir(extraDirs, path.join(home, ".asdf", "shims"));
	}
	if (process.platform === "win32") {
		pushDir(extraDirs, process.env.APPDATA ? path.join(process.env.APPDATA, "npm") : null);
		pushDir(extraDirs, process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "pnpm") : null);
		pushDir(extraDirs, process.env.NVM_HOME);
		pushDir(extraDirs, process.env.NVM_SYMLINK);
		pushDir(extraDirs, process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "nodejs") : null);
		pushDir(extraDirs, process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "nodejs") : null);
	} else {
		pushDir(extraDirs, "/usr/local/bin");
		pushDir(extraDirs, "/usr/bin");
		pushDir(extraDirs, "/bin");
		pushDir(extraDirs, "/opt/homebrew/bin");
		pushDir(extraDirs, "/snap/bin");
	}
	const nvmDir = process.env.NVM_DIR || (home ? path.join(home, ".nvm") : null);
	if (nvmDir) addVersionedDirs(extraDirs, path.join(nvmDir, "versions", "node"), "bin");
	const asdfDir = process.env.ASDF_DATA_DIR || (home ? path.join(home, ".asdf") : null);
	if (asdfDir) addVersionedDirs(extraDirs, path.join(asdfDir, "installs", "nodejs"), "");
	if (home) addVersionedDirs(extraDirs, path.join(home, ".fnm", "node-versions", "v1"), path.join("installation", "bin"));
	const fromExtras = findExecutableInDirs(extraDirs, names);
	if (fromExtras) return {
		path: fromExtras,
		source: "known-locations"
	};
	return {
		path: null,
		source: "not-found"
	};
}
/** Kills a spawned process tree. Windows needs taskkill: the child is behind a .cmd shell. */
function killProcessTree(childProcess) {
	if (!childProcess || childProcess.pid === void 0) return;
	try {
		if (process.platform === "win32") spawnSync("taskkill", [
			"/F",
			"/T",
			"/PID",
			String(childProcess.pid)
		], { stdio: "ignore" });
		else childProcess.kill("SIGTERM");
	} catch {
		try {
			childProcess.kill();
		} catch {}
	}
}
/**
* Merges the tool-lock plugin into OPENCODE_CONFIG_CONTENT for the spawned backend,
* keeping any config the operator already passes that way.
*/
function buildBackendConfigContent(existing, toolLockPluginPath) {
	let base = {};
	if (existing) try {
		const parsed = JSON.parse(existing);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) base = parsed;
	} catch (e) {
		console.warn("[Local] Ignoring invalid OPENCODE_CONFIG_CONTENT:", e.message);
	}
	const plugins = Array.isArray(base.plugin) ? [...base.plugin] : [];
	if (!plugins.includes(toolLockPluginPath)) plugins.push(toolLockPluginPath);
	return JSON.stringify({
		...base,
		plugin: plugins
	});
}
function ensureBackend(config) {
	return ensureBackendInternal(config, getBackendState(config.serverUrl));
}
async function ensureBackendInternal(config, state) {
	const { serverUrl, opencodePath, useIsolatedHome, zenApiKey, serverPassword, manageBackend, promptMode, toolLockPluginPath } = config;
	if (state.isStarting) {
		for (let i = 0; i < 120; i++) {
			await sleep(STARTING_WAIT_INTERVAL_MS);
			try {
				await checkHealth(serverUrl, serverPassword);
				return;
			} catch {}
		}
		throw new Error("Backend startup timeout");
	}
	try {
		await checkHealth(serverUrl, serverPassword);
	} catch (err) {
		if (!manageBackend) {
			for (let i = 0; i < 60; i++) {
				await sleep(STARTUP_WAIT_INTERVAL_MS);
				try {
					await checkHealth(serverUrl, serverPassword);
					return;
				} catch {}
			}
			throw err;
		}
		state.isStarting = true;
		console.log(`[Local] OpenCode backend not found at ${serverUrl}. Starting...`);
		if (state.process) killProcessTree(state.process);
		if (state.jailRoot && fs.existsSync(state.jailRoot)) try {
			fs.rmSync(state.jailRoot, {
				recursive: true,
				force: true
			});
		} catch {}
		const backendEnv = { OPENCODE_CONFIG_CONTENT: buildBackendConfigContent(process.env.OPENCODE_CONFIG_CONTENT, toolLockPluginPath) };
		if (serverPassword) backendEnv.OPENCODE_SERVER_PASSWORD = serverPassword;
		if (zenApiKey) backendEnv.OPENCODE_API_KEY = zenApiKey;
		const isWindows = process.platform === "win32";
		const salt = Math.random().toString(36).substring(7);
		const jailRoot = path.join(os.tmpdir(), "opencode-proxy-jail", salt);
		state.jailRoot = jailRoot;
		const workspace = path.join(jailRoot, "empty-workspace");
		let envVars;
		let cwd;
		fs.mkdirSync(workspace, { recursive: true });
		cwd = workspace;
		if (isWindows) {
			envVars = {
				...process.env,
				...backendEnv,
				OPENCODE_PROJECT_DIR: workspace
			};
			console.log("[Local] Running on Windows, using standard user home directory");
		} else if (useIsolatedHome) {
			const fakeHome = path.join(jailRoot, "fake-home");
			const opencodeDir = path.join(fakeHome, ".local", "share", "opencode");
			const storageDir = path.join(opencodeDir, "storage");
			const messageDir = path.join(storageDir, "message");
			const sessionDir = path.join(storageDir, "session");
			for (const dir of [
				fakeHome,
				opencodeDir,
				storageDir,
				messageDir,
				sessionDir
			]) if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
			envVars = {
				...process.env,
				HOME: fakeHome,
				USERPROFILE: fakeHome,
				...backendEnv,
				OPENCODE_PROJECT_DIR: workspace
			};
			if (promptMode === "plugin-inject") {
				const configDir = path.join(fakeHome, ".config", "opencode");
				const pluginDir = path.join(configDir, "plugin", "opencode2api-empty");
				fs.mkdirSync(pluginDir, { recursive: true });
				fs.writeFileSync(path.join(pluginDir, "index.js"), "export const Opencode2apiEmptyPlugin = async () => ({})\nexport default Opencode2apiEmptyPlugin\n", "utf8");
				fs.writeFileSync(path.join(configDir, "opencode.json"), JSON.stringify({
					plugin: [path.join(pluginDir, "index.js")],
					instructions: [],
					theme: "system"
				}, null, 2), "utf8");
				console.log("[Local] Using plugin-inject prompt mode");
			}
			console.log("[Local] Using isolated home for OpenCode");
		} else {
			envVars = {
				...process.env,
				...backendEnv,
				OPENCODE_PROJECT_DIR: workspace
			};
			console.log("[Local] Using real HOME for OpenCode (isolation disabled)");
		}
		const [, , portStr] = serverUrl.split(":");
		const port = portStr ? portStr.split("/")[0] : "10001";
		const resolved = resolveOpencodePath(opencodePath);
		const opencodeBin = resolved.path || opencodePath || "opencode";
		if (resolved.path) console.log(`[Local] Using OpenCode binary: ${opencodeBin} (source: ${resolved.source})`);
		else console.warn(`[Local] Unable to resolve OpenCode binary for '${opencodePath}'. Using as-is.`);
		const useShell = process.platform === "win32" || !resolved.path || opencodeBin.endsWith(".cmd") || opencodeBin.endsWith(".bat");
		state.process = spawn(opencodeBin, [
			"serve",
			"--port",
			port,
			"--hostname",
			"127.0.0.1"
		], {
			stdio: "inherit",
			cwd,
			env: envVars,
			shell: useShell
		});
		if (typeof state.process.unref === "function") state.process.unref();
		state.process.on("error", (err) => {
			console.error(`[Local] Failed to spawn OpenCode: ${err.message}`);
			if (err.code === "ENOENT") console.error(`[Local] Command '${opencodePath}' not found. Please ensure OpenCode is installed and in your PATH.`);
		});
		let started = false;
		for (let i = 0; i < 60; i++) {
			await sleep(STARTUP_WAIT_INTERVAL_MS);
			try {
				await checkHealth(serverUrl, serverPassword);
				console.log("[Local] OpenCode backend ready.");
				started = true;
				break;
			} catch {}
		}
		state.isStarting = false;
		if (!started) {
			console.warn("[Local] Backend start timed out.");
			throw new Error("Backend start timeout");
		}
	}
}
/** Kills the managed backend for a server URL (used on shutdown). */
function killBackendFor(serverUrl) {
	const state = backendState.get(serverUrl);
	if (!state) return;
	if (state.process) killProcessTree(state.process);
	if (state.jailRoot && process.platform !== "win32") try {
		fs.rmSync(state.jailRoot, {
			recursive: true,
			force: true
		});
	} catch {}
}
//#endregion
//#region src/local/backend-client.ts
function authHeaders(password = "") {
	return buildBackendAuthHeaders(password) ?? {};
}
async function requestJson(baseUrl, password, method, urlPath, body, signal) {
	const response = await fetch(`${baseUrl}${urlPath}`, {
		method,
		headers: {
			"content-type": "application/json",
			...authHeaders(password)
		},
		body: body === void 0 ? void 0 : JSON.stringify(body),
		signal
	});
	const text = await response.text();
	let parsed;
	try {
		parsed = text ? JSON.parse(text) : void 0;
	} catch {
		parsed = text;
	}
	if (!response.ok) {
		const message = typeof parsed === "object" && parsed ? parsed.message ?? JSON.stringify(parsed) : String(text || response.statusText);
		return {
			error: {
				message: `${response.status}: ${message}`,
				statusCode: response.status,
				data: parsed
			},
			statusCode: response.status
		};
	}
	return { data: parsed };
}
/** Parses an SSE stream of `data: {json}` frames into async-generated event objects. */
async function* parseEventSse(body, signal) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	try {
		while (!signal.aborted) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let index = buffer.indexOf("\n");
			while (index !== -1) {
				const line = buffer.slice(0, index).replace(/\r$/, "");
				buffer = buffer.slice(index + 1);
				index = buffer.indexOf("\n");
				if (!line.startsWith("data:")) continue;
				const data = line.slice(5).replace(/^ /, "");
				if (!data || data === "[DONE]") continue;
				try {
					yield JSON.parse(data);
				} catch {
					continue;
				}
			}
		}
	} finally {
		try {
			reader.releaseLock();
		} catch {}
	}
}
function createLocalClient(baseUrl, password = "") {
	const call = (method, urlPath, body, signal) => requestJson(baseUrl, password, method, urlPath, body, signal);
	return {
		baseUrl,
		async configProviders() {
			return call("GET", "/config/providers");
		},
		async configGet() {
			return call("GET", "/config");
		},
		async configUpdate(body) {
			return call("PATCH", "/config", body);
		},
		async sessionCreate(body) {
			return call("POST", "/session", body);
		},
		async sessionDelete(id) {
			return call("DELETE", `/session/${encodeURIComponent(id)}`);
		},
		async sessionMessages(id, signal) {
			return call("GET", `/session/${encodeURIComponent(id)}/message`, void 0, signal);
		},
		async sessionPrompt(sessionId, body, signal) {
			return call("POST", `/session/${encodeURIComponent(sessionId)}/message`, body, signal);
		},
		async toolIds() {
			return call("GET", "/experimental/tool/ids");
		},
		async *eventStream(signal) {
			const response = await fetch(`${baseUrl}/event`, {
				method: "GET",
				headers: {
					accept: "text/event-stream",
					...authHeaders(password)
				},
				signal
			});
			if (!response.ok || !response.body) throw new Error(`Event stream failed: HTTP ${response.status}`);
			yield* parseEventSse(response.body, signal);
		}
	};
}
const TOOL_RISK_LEVELS = {
	LOW: "low",
	MEDIUM: "medium",
	HIGH: "high",
	CRITICAL: "critical"
};
const TOOL_SIDE_EFFECTS = {
	NONE: "none",
	READ: "read",
	WRITE: "write",
	DELETE: "delete",
	EXTERNAL_NOTIFICATION: "external_notification",
	PAYMENT: "payment"
};
const TOOL_POLICY_DECISIONS = {
	ALLOW: "allow",
	DENY: "deny",
	REQUIRE_CONFIRMATION: "require_confirmation"
};
const VALIDATION_STATUSES = {
	VALID: "valid",
	REPAIRABLE: "repairable",
	REJECTED: "rejected"
};
function normalizeRiskLevel(value, fallback = TOOL_RISK_LEVELS.LOW) {
	if (!value || typeof value !== "string") return fallback;
	const normalized = value.trim().toLowerCase();
	return Object.values(TOOL_RISK_LEVELS).includes(normalized) ? normalized : fallback;
}
function normalizeSideEffect(value, fallback = TOOL_SIDE_EFFECTS.NONE) {
	if (!value || typeof value !== "string") return fallback;
	const normalized = value.trim().toLowerCase();
	return Object.values(TOOL_SIDE_EFFECTS).includes(normalized) ? normalized : fallback;
}
function createValidationError(code, message, path = []) {
	return {
		code,
		message,
		path
	};
}
function normalizeDescription(value) {
	return typeof value === "string" ? value.trim() : "";
}
function normalizeParameters(parameters) {
	if (parameters && typeof parameters === "object" && !Array.isArray(parameters)) return parameters;
	return {
		type: "object",
		properties: {}
	};
}
/**
* Normalizes the two function-tool shapes the proxy receives.
* Chat Completions nests the definition:  { type:'function', function:{ name, parameters } }
* The Responses API keeps it flat:        { type:'function', name, parameters }
*/
function normalizeToolDefinition(tool) {
	if (!tool || tool.type !== "function") return null;
	const definition = tool.function && typeof tool.function === "object" ? tool.function : tool;
	const name = String(definition.name || "").trim();
	if (!name) return null;
	return {
		name,
		description: definition.description,
		parameters: definition.parameters,
		enabled: definition.enabled,
		x_proxy_side_effect: definition.x_proxy_side_effect ?? tool.x_proxy_side_effect,
		x_proxy_risk_level: definition.x_proxy_risk_level ?? tool.x_proxy_risk_level,
		x_proxy_requires_confirmation: definition.x_proxy_requires_confirmation ?? tool.x_proxy_requires_confirmation
	};
}
function inferSideEffect(definition = {}) {
	const declared = definition.x_proxy_side_effect;
	if (declared) return normalizeSideEffect(declared, TOOL_SIDE_EFFECTS.NONE);
	const name = String(definition.name || "").toLowerCase();
	if (/^(get|list|search|find|read|fetch|lookup)/.test(name)) return TOOL_SIDE_EFFECTS.READ;
	if (/^(create|update|set|post|write|send)/.test(name)) return TOOL_SIDE_EFFECTS.WRITE;
	if (/^(delete|remove|destroy)/.test(name)) return TOOL_SIDE_EFFECTS.DELETE;
	return TOOL_SIDE_EFFECTS.NONE;
}
function inferRiskLevel(definition = {}, sideEffect = TOOL_SIDE_EFFECTS.NONE) {
	const declared = definition.x_proxy_risk_level;
	if (declared) return normalizeRiskLevel(declared, TOOL_RISK_LEVELS.LOW);
	if (sideEffect === TOOL_SIDE_EFFECTS.DELETE || sideEffect === TOOL_SIDE_EFFECTS.PAYMENT) return TOOL_RISK_LEVELS.CRITICAL;
	if (sideEffect === TOOL_SIDE_EFFECTS.WRITE || sideEffect === TOOL_SIDE_EFFECTS.EXTERNAL_NOTIFICATION) return TOOL_RISK_LEVELS.MEDIUM;
	return TOOL_RISK_LEVELS.LOW;
}
function inferRequiresConfirmation(definition = {}, sideEffect = TOOL_SIDE_EFFECTS.NONE, riskLevel = TOOL_RISK_LEVELS.LOW) {
	if (typeof definition.x_proxy_requires_confirmation === "boolean") return definition.x_proxy_requires_confirmation;
	return sideEffect === TOOL_SIDE_EFFECTS.WRITE || riskLevel === TOOL_RISK_LEVELS.HIGH || riskLevel === TOOL_RISK_LEVELS.CRITICAL;
}
function buildExternalToolRegistry(tools, options = {}) {
	if (!Array.isArray(tools) || tools.length === 0) return [];
	const prefix = options.prefix || "external__";
	const registry = [];
	const seenNamespaced = /* @__PURE__ */ new Set();
	tools.forEach((tool, index) => {
		const definition = normalizeToolDefinition(tool);
		if (!definition) return;
		const originalName = definition.name;
		let namespacedName = `${prefix}${originalName}`;
		let counter = 2;
		while (seenNamespaced.has(namespacedName)) {
			namespacedName = `${prefix}${originalName}_${counter}`;
			counter += 1;
		}
		seenNamespaced.add(namespacedName);
		const sideEffect = inferSideEffect(definition);
		const riskLevel = inferRiskLevel(definition, sideEffect);
		registry.push({
			id: `external_tool_${index + 1}`,
			originalName,
			namespacedName,
			description: normalizeDescription(definition.description),
			parameters: normalizeParameters(definition.parameters),
			sideEffect,
			riskLevel,
			requiresConfirmation: inferRequiresConfirmation(definition, sideEffect, riskLevel),
			enabled: definition.enabled !== false,
			sourceTool: tool
		});
	});
	return registry;
}
function normalizeToolNameForMatch(name) {
	return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function findExternalToolByName(registry, name) {
	if (!name || !Array.isArray(registry)) return null;
	const exact = registry.find((tool) => tool.namespacedName === name || tool.originalName === name);
	if (exact) return exact;
	const normalized = normalizeToolNameForMatch(name);
	if (!normalized) return null;
	const matches = registry.filter((tool) => normalizeToolNameForMatch(tool.namespacedName) === normalized || normalizeToolNameForMatch(tool.originalName) === normalized);
	return matches.length === 1 ? matches[0] : null;
}
function normalizeExternalToolChoice(toolChoice, registry) {
	if (!toolChoice || !Array.isArray(registry) || registry.length === 0) return {
		mode: "auto",
		requiredTool: null
	};
	if (toolChoice === "auto" || toolChoice === "none") return {
		mode: toolChoice,
		requiredTool: null
	};
	if (toolChoice === "required") return {
		mode: "required",
		requiredTool: null
	};
	const requestedName = toolChoice?.function?.name || toolChoice?.name;
	if (toolChoice?.type === "function" && requestedName) return {
		mode: "required",
		requiredTool: findExternalToolByName(registry, requestedName)?.namespacedName || `external__${requestedName}`
	};
	return {
		mode: "auto",
		requiredTool: null
	};
}
function buildExternalToolsPrompt(registry, toolChoice = null) {
	if (!Array.isArray(registry) || registry.length === 0) return "";
	const normalizedChoice = normalizeExternalToolChoice(toolChoice, registry);
	const choiceInstructions = [];
	if (normalizedChoice.mode === "required") {
		if (normalizedChoice.requiredTool) choiceInstructions.push(`Tool use is REQUIRED for this turn. You MUST call ${normalizedChoice.requiredTool} before giving any final answer.`);
		else choiceInstructions.push("Tool use is REQUIRED for this turn. You MUST call an external tool before giving any final answer.");
	} else if (normalizedChoice.mode === "none") choiceInstructions.push("Tool use is disabled for this turn. Do not emit <function_calls>.");
	return [
		"External tools are virtualized by this proxy. They are not OpenCode tools.",
		"When you need an external tool, your entire assistant reply MUST be ONLY one or more <function_calls>...</function_calls> blocks.",
		"Do NOT output <think>, explanations, markdown, prose, or any text before or after <function_calls> blocks when making a tool call.",
		"Each block must contain JSON with this exact shape:",
		"{\"name\":\"external__tool_name\",\"arguments\":{}}",
		"Arguments must be a valid JSON object that matches the declared schema.",
		"Use only the namespaced names listed below. Do not use original client tool names inside function calls.",
		"If tool results are later provided as TOOL_RESULT messages, use those results to continue normally.",
		...choiceInstructions,
		`Available external tools: ${JSON.stringify(registry.map((tool) => ({
			name: tool.namespacedName,
			client_name: tool.originalName,
			description: tool.description,
			parameters: tool.parameters,
			risk_level: tool.riskLevel,
			side_effect: tool.sideEffect,
			requires_confirmation: tool.requiresConfirmation
		})))}`
	].join("\n");
}
/**
* Short imperative restatement of the markup contract, appended as the final prompt
* part. Position matters more than wording: with the contract only in the system
* prompt, deepseek-v4-flash-free emitted parseable markup in 4/8 runs; with this
* reminder as the last thing before generation it was 8/8.
*/
function buildExternalToolsReminder(registry, toolChoice = null) {
	if (!Array.isArray(registry) || registry.length === 0) return "";
	const normalizedChoice = normalizeExternalToolChoice(toolChoice, registry);
	if (normalizedChoice.mode === "none") return "";
	return [
		"REMINDER: External tools are called by emitting markup, not through any native tool API.",
		`To call one, your entire reply must be ONLY <function_calls>{"name":"${normalizedChoice.requiredTool || registry[0].namespacedName}","arguments":{...}}</function_calls>`,
		"with no prose, no markdown and no <think> block. Otherwise answer normally.",
		`Available names: ${registry.map((tool) => tool.namespacedName).join(", ")}`
	].join("\n");
}
function buildToolExposure(registry, toolChoice = null) {
	const normalizedChoice = normalizeExternalToolChoice(toolChoice, registry);
	const exposedTools = Array.isArray(registry) ? registry.filter((tool) => tool.enabled !== false) : [];
	return {
		tools: exposedTools,
		toolChoice: normalizedChoice,
		prompt: buildExternalToolsPrompt(exposedTools, toolChoice),
		reminder: buildExternalToolsReminder(exposedTools, toolChoice)
	};
}
function toSet(values) {
	if (!Array.isArray(values)) return /* @__PURE__ */ new Set();
	return new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()));
}
function createPolicyContext(config = {}) {
	return {
		mode: config.EXTERNAL_TOOL_POLICY_MODE || "enforce",
		defaultRiskLevel: config.EXTERNAL_TOOL_DEFAULT_RISK_LEVEL || TOOL_RISK_LEVELS.LOW,
		allowlist: toSet(config.EXTERNAL_TOOL_ALLOWLIST || []),
		denylist: toSet(config.EXTERNAL_TOOL_DENYLIST || []),
		confirmationRequired: toSet(config.EXTERNAL_TOOL_REQUIRE_CONFIRMATION_FOR || [])
	};
}
function evaluateToolPolicy(tool, args, context = {}) {
	if (!tool) return {
		status: TOOL_POLICY_DECISIONS.DENY,
		code: "unknown_tool",
		reason: "Tool is not registered for this request."
	};
	const policy = createPolicyContext(context.config);
	const toolNames = [tool.originalName, tool.namespacedName].filter(Boolean);
	const inAllowlist = toolNames.some((name) => policy.allowlist.has(name));
	const inDenylist = toolNames.some((name) => policy.denylist.has(name));
	const requiresConfirmation = tool.requiresConfirmation || toolNames.some((name) => policy.confirmationRequired.has(name));
	if (inAllowlist) return {
		status: TOOL_POLICY_DECISIONS.ALLOW,
		effectiveRisk: tool.riskLevel || policy.defaultRiskLevel
	};
	if (inDenylist) return {
		status: TOOL_POLICY_DECISIONS.DENY,
		code: "tool_denied_by_policy",
		reason: `Tool ${tool.originalName} is denied by policy.`
	};
	if (!inAllowlist && (tool.sideEffect === TOOL_SIDE_EFFECTS.DELETE || tool.riskLevel === TOOL_RISK_LEVELS.CRITICAL)) return {
		status: TOOL_POLICY_DECISIONS.REQUIRE_CONFIRMATION,
		reason: `Tool ${tool.originalName} is high risk and requires confirmation.`,
		confirmationPayload: {
			toolName: tool.originalName,
			namespacedName: tool.namespacedName,
			argumentsPreview: args,
			risk: tool.riskLevel
		}
	};
	if (requiresConfirmation && policy.mode !== "report-only") return {
		status: TOOL_POLICY_DECISIONS.REQUIRE_CONFIRMATION,
		reason: `Tool ${tool.originalName} requires confirmation before execution.`,
		confirmationPayload: {
			toolName: tool.originalName,
			namespacedName: tool.namespacedName,
			argumentsPreview: args,
			risk: tool.riskLevel
		}
	};
	return {
		status: TOOL_POLICY_DECISIONS.ALLOW,
		effectiveRisk: tool.riskLevel || policy.defaultRiskLevel
	};
}
function safeParseJsonObject(raw) {
	if (raw === void 0 || raw === null || raw === "") return {
		ok: true,
		value: {}
	};
	if (typeof raw === "object") return Array.isArray(raw) ? {
		ok: false,
		error: "arguments must be a JSON object"
	} : {
		ok: true,
		value: raw
	};
	if (typeof raw !== "string") return {
		ok: false,
		error: "arguments must be a JSON string or object"
	};
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {
			ok: false,
			error: "arguments must decode to a JSON object"
		};
		return {
			ok: true,
			value: parsed
		};
	} catch (error) {
		return {
			ok: false,
			error: error.message
		};
	}
}
function validateAgainstSchema(args, schema = {}) {
	const errors = [];
	const normalizedSchema = schema && typeof schema === "object" ? schema : {};
	const properties = normalizedSchema.properties && typeof normalizedSchema.properties === "object" ? normalizedSchema.properties : {};
	(Array.isArray(normalizedSchema.required) ? normalizedSchema.required : []).forEach((key) => {
		if (!(key in args) || args[key] === void 0 || args[key] === null || args[key] === "") errors.push(createValidationError("missing_required_field", `Missing required field: ${key}`, [key]));
	});
	Object.entries(properties).forEach(([key, definition]) => {
		if (!(key in args) || args[key] === void 0 || args[key] === null) return;
		const value = args[key];
		const expectedType = definition?.type;
		if (expectedType === "string" && typeof value !== "string") errors.push(createValidationError("invalid_type", `Field ${key} must be a string`, [key]));
		if (expectedType === "number" && typeof value !== "number") errors.push(createValidationError("invalid_type", `Field ${key} must be a number`, [key]));
		if (expectedType === "integer" && !Number.isInteger(value)) errors.push(createValidationError("invalid_type", `Field ${key} must be an integer`, [key]));
		if (expectedType === "boolean" && typeof value !== "boolean") errors.push(createValidationError("invalid_type", `Field ${key} must be a boolean`, [key]));
		if (expectedType === "object" && (!value || typeof value !== "object" || Array.isArray(value))) errors.push(createValidationError("invalid_type", `Field ${key} must be an object`, [key]));
		if (Array.isArray(definition?.enum) && !definition.enum.includes(value)) errors.push(createValidationError("invalid_enum", `Field ${key} must be one of: ${definition.enum.join(", ")}`, [key]));
	});
	return errors;
}
function validateToolCall(parsedCall, registry) {
	const tool = findExternalToolByName(registry, parsedCall?.function?.name);
	if (!tool) return {
		status: VALIDATION_STATUSES.REJECTED,
		errors: [createValidationError("unknown_tool", `Unknown external tool: ${parsedCall?.function?.name || "unknown"}`)],
		tool: null
	};
	const parsedArgs = safeParseJsonObject(parsedCall?.function?.arguments);
	if (!parsedArgs.ok) return {
		status: VALIDATION_STATUSES.REPAIRABLE,
		errors: [createValidationError("invalid_arguments_json", `Invalid JSON arguments for ${tool.originalName}: ${parsedArgs.error}`)],
		tool
	};
	const schemaErrors = validateAgainstSchema(parsedArgs.value, tool.parameters);
	if (schemaErrors.length > 0) return {
		status: VALIDATION_STATUSES.REJECTED,
		errors: schemaErrors,
		tool
	};
	return {
		status: VALIDATION_STATUSES.VALID,
		normalizedArguments: parsedArgs.value,
		tool
	};
}
function validateToolCalls(parsedCalls, registry) {
	if (!Array.isArray(parsedCalls) || parsedCalls.length === 0) return {
		validCalls: [],
		invalidCalls: []
	};
	const validCalls = [];
	const invalidCalls = [];
	parsedCalls.forEach((call) => {
		const validation = validateToolCall(call, registry);
		if (validation.status === VALIDATION_STATUSES.VALID) {
			validCalls.push({
				...call,
				validatedArguments: validation.normalizedArguments,
				function: {
					...call.function,
					arguments: JSON.stringify(validation.normalizedArguments)
				},
				tool: validation.tool,
				validation
			});
			return;
		}
		invalidCalls.push({
			call,
			validation
		});
	});
	return {
		validCalls,
		invalidCalls
	};
}
//#endregion
//#region src/local/parser.ts
/**
* Tool-call markup parsing (ported from opencode2api src/tool-runtime/parser.js, MIT).
*
* The proxy asks models to emit tool calls as `<function_calls>{json}</function_calls>`.
* Models served by OpenCode's free tier frequently ignore that contract and fall back to
* whatever markup their own training used. Everything is normalized to the canonical
* `<function_calls>` form at the parser boundary; downstream code is unchanged.
*
* Recognized foreign formats: DSML (DeepSeek), <tool_call> JSON wrappers, registry-named
* tags with attributes/body/JSON, XML parameter children, <function=name> dialect, and
* registry-gated bare JSON spanning the whole message body.
*/
const MARK = "[\\uFF5C|]*(?:DSML)?[\\uFF5C|]*";
const CANONICAL_OPEN = "<function_calls>";
const CANONICAL_CLOSE = "</function_calls>";
const RE = {
	canonicalBlock: /<function_calls>([\s\S]*?)<\/function_calls>/g,
	canonicalStrayTag: /<\/?function_calls>/g,
	dsmlContainer: new RegExp(`<${MARK}tool_calls\\s*>([\\s\\S]*?)</${MARK}tool_calls\\s*>`, "g"),
	invokeBlock: new RegExp(`<${MARK}invoke\\s+name\\s*=\\s*["']([^"']+)["']\\s*>([\\s\\S]*?)</${MARK}invoke\\s*>`, "g"),
	invokeParam: new RegExp(`<${MARK}parameter\\s+name\\s*=\\s*["']([^"']+)["']([^>]*)>([\\s\\S]*?)</${MARK}parameter\\s*>`, "g"),
	jsonWrapper: /<tool_call\s*>([\s\S]*?)<\/tool_call\s*>/g,
	codeFence: /^\s*```(?:[a-zA-Z0-9_-]*)\s*\n([\s\S]*?)\n?\s*```\s*$/,
	leadingNewline: /^\r?\n/,
	trailingNewline: /\r?\n[ \t]*$/
};
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function registryNames(registry) {
	if (!Array.isArray(registry)) return [];
	const names = /* @__PURE__ */ new Set();
	registry.forEach((tool) => {
		if (tool?.namespacedName) names.add(tool.namespacedName);
		if (tool?.originalName) names.add(tool.originalName);
	});
	return [...names].sort((a, b) => b.length - a.length);
}
function registrySchemas(registry) {
	const schemas = /* @__PURE__ */ new Map();
	if (!Array.isArray(registry)) return schemas;
	registry.forEach((tool) => {
		if (!tool?.parameters) return;
		if (tool.namespacedName) schemas.set(tool.namespacedName, tool.parameters);
		if (tool.originalName) schemas.set(tool.originalName, tool.parameters);
	});
	return schemas;
}
function trimParamValue(raw) {
	return String(raw ?? "").replace(RE.leadingNewline, "").replace(RE.trailingNewline, "");
}
function coerceParamValue(value, attrs) {
	if (/string\s*=\s*["']true["']/i.test(attrs || "")) return value;
	const trimmed = value.trim();
	if (!trimmed) return value;
	if (!/^(-?\d|true$|false$|null$|\{|\[|")/.test(trimmed)) return value;
	try {
		return JSON.parse(trimmed);
	} catch {
		return value;
	}
}
function rawCallFromJson(node) {
	if (!node || typeof node !== "object") return null;
	const name = node?.function?.name || node?.name || node?.tool_name || node?.tool;
	if (!name || typeof name !== "string") return null;
	let args = node?.function?.arguments ?? node?.arguments ?? node?.parameters ?? node?.args ?? {};
	if (typeof args === "string") {
		const trimmed = args.trim();
		if (!trimmed) args = {};
		else try {
			args = JSON.parse(trimmed);
		} catch {
			return {
				id: node?.id,
				name,
				arguments: trimmed
			};
		}
	}
	return {
		id: node?.id,
		name,
		arguments: args
	};
}
function rawCallsFromJsonPayload(parsed) {
	return (Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tool_calls) ? parsed.tool_calls : Array.isArray(parsed?.invokes) ? parsed.invokes : [parsed]).map(rawCallFromJson).filter(Boolean);
}
function rawCallsFromJsonText(text) {
	const trimmed = String(text ?? "").trim();
	if (!trimmed) return [];
	try {
		return rawCallsFromJsonPayload(JSON.parse(trimmed));
	} catch {
		const found = findFirstJsonValue(trimmed);
		if (!found) return [];
		try {
			return rawCallsFromJsonPayload(JSON.parse(found.json));
		} catch {
			return [];
		}
	}
}
function findJsonEnd(text, start) {
	const opener = text[start];
	if (opener !== "{" && opener !== "[") return -1;
	const closer = opener === "{" ? "}" : "]";
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < text.length; i += 1) {
		const ch = text[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === "\"") inString = false;
			continue;
		}
		if (ch === "\"") inString = true;
		else if (ch === opener) depth += 1;
		else if (ch === closer) {
			depth -= 1;
			if (depth === 0) return i + 1;
		}
	}
	return -1;
}
function findFirstJsonValue(text) {
	for (let i = 0; i < text.length; i += 1) {
		if (text[i] !== "{" && text[i] !== "[") continue;
		const end = findJsonEnd(text, i);
		if (end === -1) continue;
		const json = text.slice(i, end);
		try {
			JSON.parse(json);
			return {
				json,
				start: i,
				end
			};
		} catch {}
	}
	return null;
}
function extractCanonical(text) {
	const calls = [];
	const spans = [];
	for (const match of text.matchAll(RE.canonicalBlock)) {
		spans.push([match.index, match.index + match[0].length]);
		calls.push(...rawCallsFromJsonText(match[1]));
	}
	return {
		calls,
		spans
	};
}
function extractInvokeBlocks(segment) {
	const calls = [];
	for (const invoke of segment.matchAll(RE.invokeBlock)) {
		const args = {};
		for (const param of invoke[2].matchAll(RE.invokeParam)) args[param[1]] = coerceParamValue(trimParamValue(param[3]), param[2]);
		calls.push({
			name: invoke[1],
			arguments: args
		});
	}
	return calls;
}
function extractDsml(text) {
	const calls = [];
	const spans = [];
	let remainder = text;
	for (const container of text.matchAll(RE.dsmlContainer)) {
		spans.push([container.index, container.index + container[0].length]);
		const inner = extractInvokeBlocks(container[1]);
		calls.push(...inner.length ? inner : rawCallsFromJsonText(container[1]));
		remainder = remainder.replace(container[0], " ".repeat(container[0].length));
	}
	for (const invoke of remainder.matchAll(RE.invokeBlock)) {
		spans.push([invoke.index, invoke.index + invoke[0].length]);
		calls.push(...extractInvokeBlocks(invoke[0]));
	}
	return {
		calls,
		spans
	};
}
function extractJsonWrapper(text) {
	const calls = [];
	const spans = [];
	for (const match of text.matchAll(RE.jsonWrapper)) {
		spans.push([match.index, match.index + match[0].length]);
		calls.push(...rawCallsFromJsonText(match[1]));
	}
	return {
		calls,
		spans
	};
}
function argsFromAttrs(attrs) {
	const marker = attrs.match(/(?:arguments|parameters|args|input)\s*=\s*/i);
	if (!marker || marker.index === void 0) return null;
	const start = marker.index + marker[0].length;
	const opener = attrs[start];
	if (opener === "\"" || opener === "'") {
		let i = start + 1;
		let out = "";
		while (i < attrs.length && attrs[i] !== opener) {
			if (attrs[i] === "\\" && i + 1 < attrs.length) {
				out += attrs[i + 1];
				i += 2;
				continue;
			}
			out += attrs[i];
			i += 1;
		}
		return out;
	}
	if (opener === "{" || opener === "[") {
		const end = findJsonEnd(attrs, start);
		if (end !== -1) return attrs.slice(start, end);
	}
	return null;
}
function coerceSchemaValue(value, schema) {
	const type = Array.isArray(schema?.type) ? schema.type[0] : schema?.type;
	if (type === "string") return value;
	const trimmed = value.trim();
	if (!trimmed) return value;
	if (type === "number" || type === "integer") {
		const num = Number(trimmed);
		return Number.isFinite(num) ? num : value;
	}
	if (type === "boolean") {
		if (/^true$/i.test(trimmed)) return true;
		if (/^false$/i.test(trimmed)) return false;
		return value;
	}
	if (type === "object" || type === "array") try {
		return JSON.parse(trimmed);
	} catch {
		return value;
	}
	return coerceParamValue(value, "");
}
function argsFromXmlChildren(body, parameters) {
	const properties = parameters && typeof parameters === "object" ? parameters.properties : null;
	if (!properties || typeof properties !== "object") return null;
	const allowed = Object.keys(properties);
	if (!allowed.length) return null;
	const args = {};
	let matched = 0;
	for (const key of allowed) {
		const re = new RegExp(`<${escapeRegExp(key)}\\s*>([\\s\\S]*?)</${escapeRegExp(key)}\\s*>`, "i");
		const found = body.match(re);
		if (!found) continue;
		matched += 1;
		args[key] = coerceSchemaValue(trimParamValue(found[1]), properties[key]);
	}
	return matched > 0 ? args : null;
}
function findTagEnd(text, from) {
	let i = from;
	while (i < text.length) {
		const ch = text[i];
		if (ch === "\"" || ch === "'") {
			const quote = ch;
			i += 1;
			while (i < text.length && text[i] !== quote) {
				if (text[i] === "\\") i += 1;
				i += 1;
			}
			i += 1;
			continue;
		}
		if (ch === "{" || ch === "[") {
			const end = findJsonEnd(text, i);
			if (end !== -1) {
				i = end;
				continue;
			}
		}
		if (ch === ">") return i;
		i += 1;
	}
	return -1;
}
function extractTagNamed(text, names, schemas) {
	const calls = [];
	const spans = [];
	if (!names.length) return {
		calls,
		spans
	};
	const opener = new RegExp(`<(${names.map(escapeRegExp).join("|")})(?=[\\s/>"'])`, "g");
	for (const match of text.matchAll(opener)) {
		const name = match[1];
		const attrsStart = match.index + match[0].length;
		const tagEnd = findTagEnd(text, attrsStart);
		if (tagEnd === -1) continue;
		const attrs = text.slice(attrsStart, tagEnd);
		const openEnd = tagEnd + 1;
		const attrArgs = argsFromAttrs(attrs);
		if (attrArgs !== null) {
			const parsed = rawCallsFromJsonText(attrArgs);
			if (parsed.length) calls.push(...parsed.map((call) => ({
				...call,
				name: call.name || name
			})));
			else try {
				calls.push({
					name,
					arguments: JSON.parse(attrArgs)
				});
			} catch {
				calls.push({
					name,
					arguments: {}
				});
			}
			spans.push([match.index, openEnd]);
			continue;
		}
		if (attrs.trim().endsWith("/")) {
			calls.push({
				name,
				arguments: {}
			});
			spans.push([match.index, openEnd]);
			continue;
		}
		const closeTag = `</${name}>`;
		const closeIdx = text.indexOf(closeTag, openEnd);
		const body = closeIdx === -1 ? text.slice(openEnd) : text.slice(openEnd, closeIdx);
		const json = findFirstJsonValue(body);
		const consumedEnd = closeIdx === -1 ? json ? openEnd + json.end : openEnd : closeIdx + closeTag.length;
		if (json) {
			const named = rawCallsFromJsonText(json.json).filter((call) => call.name);
			if (named.length) calls.push(...named);
			else try {
				calls.push({
					name,
					arguments: JSON.parse(json.json)
				});
			} catch {
				calls.push({
					name,
					arguments: {}
				});
			}
		} else {
			const xmlArgs = argsFromXmlChildren(body, schemas.get(name));
			calls.push({
				name,
				arguments: xmlArgs || {}
			});
		}
		spans.push([match.index, consumedEnd]);
	}
	return {
		calls,
		spans
	};
}
function extractBareJson(text, names) {
	if (!names.length) return {
		calls: [],
		spans: []
	};
	const trimmed = text.trim();
	if (!trimmed || trimmed[0] !== "{" && trimmed[0] !== "[" && !trimmed.startsWith("```")) return {
		calls: [],
		spans: []
	};
	const fenced = trimmed.match(RE.codeFence);
	const body = (fenced ? fenced[1] : trimmed).trim();
	if (!body || body[0] !== "{" && body[0] !== "[") return {
		calls: [],
		spans: []
	};
	const calls = rawCallsFromJsonText(body).filter((call) => names.includes(call.name));
	if (!calls.length) return {
		calls: [],
		spans: []
	};
	return {
		calls,
		spans: [[0, text.length]]
	};
}
function extractFunctionEquals(text) {
	const calls = [];
	const spans = [];
	for (const match of text.matchAll(/<function\s*=\s*([^\s/>]+)\s*>/gi)) {
		const name = match[1].trim();
		if (!name) continue;
		const openEnd = match.index + match[0].length;
		const closeIdx = text.indexOf("</function>", openEnd);
		const end = closeIdx === -1 ? text.length : closeIdx + 11;
		const body = closeIdx === -1 ? text.slice(openEnd) : text.slice(openEnd, closeIdx);
		const args = {};
		for (const param of body.matchAll(/<parameter\s*=\s*([^\s/>]+)\s*>([\s\S]*?)<\/parameter\s*>/gi)) args[param[1].trim()] = trimParamValue(param[2]);
		calls.push({
			name,
			arguments: args
		});
		spans.push([match.index, end]);
	}
	return {
		calls,
		spans
	};
}
function collectAll(text, registry) {
	const source = typeof text === "string" ? text : "";
	if (!source) return {
		calls: [],
		spans: []
	};
	const names = registryNames(registry);
	const schemas = registrySchemas(registry);
	const results = [
		extractCanonical(source),
		extractDsml(source),
		extractJsonWrapper(source),
		extractFunctionEquals(source),
		extractTagNamed(source, names, schemas),
		extractBareJson(source, names)
	];
	const seen = /* @__PURE__ */ new Set();
	const calls = [];
	results.forEach((result) => {
		result.calls.forEach((call) => {
			const key = `${call.name}::${JSON.stringify(call.arguments)}`;
			if (seen.has(key)) return;
			seen.add(key);
			calls.push(call);
		});
	});
	return {
		calls,
		spans: results.flatMap((result) => result.spans)
	};
}
function stripFunctionCallMarkup(text, trim = true, options = {}) {
	if (!text) return text;
	const { spans } = collectAll(text, options.registry ?? []);
	let cleaned = text;
	if (spans.length) cleaned = [...spans].sort((a, b) => a[0] - b[0]).reduce((acc, span) => {
		const last = acc[acc.length - 1];
		if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
		else acc.push([...span]);
		return acc;
	}, []).reduceRight((acc, [start, end]) => acc.slice(0, start) + acc.slice(end), cleaned);
	cleaned = cleaned.replace(RE.canonicalStrayTag, "");
	return trim ? cleaned.trim() : cleaned;
}
function parseExternalToolCallsFromText(registry, ...chunks) {
	if (!Array.isArray(registry) || registry.length === 0) return [];
	const rawCalls = [];
	chunks.forEach((chunk) => {
		if (!chunk || typeof chunk !== "string") return;
		rawCalls.push(...collectAll(chunk, registry).calls);
	});
	const counts = /* @__PURE__ */ new Map();
	return rawCalls.flatMap((rawCall) => {
		const tool = findExternalToolByName(registry, rawCall.name);
		if (!tool) return [];
		const nextCount = (counts.get(tool.namespacedName) || 0) + 1;
		counts.set(tool.namespacedName, nextCount);
		return [{
			id: rawCall.id || `call_${tool.namespacedName.replace(/[^a-zA-Z0-9_]/g, "_")}_${nextCount}`,
			type: "function",
			function: {
				name: tool.originalName,
				arguments: typeof rawCall.arguments === "string" ? rawCall.arguments : JSON.stringify(rawCall.arguments ?? {})
			}
		}];
	});
}
function markerOpeners(registry) {
	const openers = [
		"<function_calls",
		"<function=",
		"<tool_call",
		"<tool_calls",
		"<invoke",
		"<parameter",
		"<｜",
		"<|"
	];
	registryNames(registry).forEach((name) => openers.push(`<${name.toLowerCase()}`));
	return openers;
}
function couldBeMarker(candidate, openers) {
	const lower = candidate.toLowerCase();
	return openers.some((opener) => opener.startsWith(lower) || lower.startsWith(opener));
}
const INLINE_BLOCKS = [
	{
		open: new RegExp(`^<${MARK}tool_calls\\s*>`, "i"),
		close: new RegExp(`</${MARK}tool_calls\\s*>`, "i")
	},
	{
		open: new RegExp(`^<${MARK}invoke\\s`, "i"),
		close: new RegExp(`</${MARK}invoke\\s*>`, "i")
	},
	{
		open: /^<tool_call\s*>/i,
		close: /<\/tool_call\s*>/i
	},
	{
		open: new RegExp(`^${escapeRegExp(CANONICAL_OPEN)}`, "i"),
		close: new RegExp(escapeRegExp(CANONICAL_CLOSE), "i")
	}
];
const KNOWN_CLOSE_TAG = new RegExp(`^</${MARK}(?:function_calls|function|tool_calls|tool_call|invoke|parameter)\\s*>`, "i");
const PARTIAL_CLOSE_TAG = /^<\/[a-z0-9_\uFF5C|]*$/i;
function matchInlineBlock(buffer) {
	for (const block of INLINE_BLOCKS) {
		if (!block.open.test(buffer)) continue;
		const close = buffer.match(block.close);
		if (!close || close.index === void 0) return { pending: true };
		return { end: close.index + close[0].length };
	}
	return null;
}
function createToolCallFilter(options) {
	const { disableTools, forceStrip = false, registry = null } = options;
	if (!disableTools && !forceStrip) {
		const passthrough = (chunk) => chunk;
		passthrough.flush = () => "";
		return passthrough;
	}
	const openers = markerOpeners(registry ?? []);
	let buffer = "";
	let emittedVisible = false;
	let held = false;
	const filter = (chunk) => {
		if (!chunk) return "";
		buffer += chunk;
		let output = "";
		while (buffer.length) {
			if (held) return output;
			const inline = matchInlineBlock(buffer);
			if (inline?.pending) return output;
			if (inline?.end !== void 0) {
				buffer = buffer.slice(inline.end);
				continue;
			}
			const orphanClose = buffer.match(KNOWN_CLOSE_TAG);
			if (orphanClose) {
				buffer = buffer.slice(orphanClose[0].length);
				continue;
			}
			if (PARTIAL_CLOSE_TAG.test(buffer)) return output;
			if (!emittedVisible && !output.trim() && /^\s*[{[]/.test(buffer)) {
				held = true;
				return output;
			}
			const markerIdx = buffer.indexOf("<");
			if (markerIdx === -1) {
				output += buffer;
				buffer = "";
				break;
			}
			if (markerIdx > 0) {
				output += buffer.slice(0, markerIdx);
				buffer = buffer.slice(markerIdx);
				continue;
			}
			if (!couldBeMarker(buffer, openers)) {
				output += buffer[0];
				buffer = buffer.slice(1);
				continue;
			}
			if (!/^<[^\s/>]+[^>]*>/.test(buffer)) return output;
			held = true;
			return output;
		}
		if (output.trim()) emittedVisible = true;
		return output;
	};
	filter.flush = () => {
		const remaining = buffer;
		buffer = "";
		held = false;
		if (!remaining) return "";
		const stripped = stripFunctionCallMarkup(remaining, false, { registry });
		return KNOWN_CLOSE_TAG.test(stripped.trim()) ? "" : stripped;
	};
	return filter;
}
function createExternalToolCallStreamParser(registry) {
	if (!Array.isArray(registry) || registry.length === 0) {
		const noop = () => [];
		noop.flush = () => [];
		return noop;
	}
	const openers = markerOpeners(registry);
	let buffer = "";
	let sequence = 0;
	const withUniqueIds = (calls) => calls.map((call) => {
		sequence += 1;
		return {
			...call,
			id: `${call.id}_${sequence}`
		};
	});
	const parser = (chunk) => {
		if (!chunk) return [];
		buffer += chunk;
		const calls = [];
		while (buffer.length) {
			const markerIdx = buffer.search(/<[^\s]/);
			if (markerIdx === -1) break;
			const candidate = buffer.slice(markerIdx);
			const inline = matchInlineBlock(candidate);
			if (inline?.pending) break;
			if (inline?.end !== void 0) {
				const block = candidate.slice(0, inline.end);
				calls.push(...withUniqueIds(parseExternalToolCallsFromText(registry, block)));
				buffer = candidate.slice(inline.end);
				continue;
			}
			if (couldBeMarker(candidate, openers)) break;
			buffer = candidate.slice(1);
		}
		return calls;
	};
	parser.flush = () => {
		const remaining = buffer;
		buffer = "";
		if (!remaining.trim()) return [];
		return withUniqueIds(parseExternalToolCallsFromText(registry, remaining));
	};
	return parser;
}
//#endregion
//#region src/local/local-proxy.ts
/**
* Embedded OpenCode-to-OpenAI proxy (ported from TiaraBasori/opencode2api v2, MIT).
*
* Exposes OpenAI Chat Completions + Responses semantics over a managed local
* `opencode serve` backend, as an in-process gateway upstream — no HTTP hop,
* no separate process, no external dependencies.
*/
const SSE_HEADERS = {
	"content-type": "text/event-stream; charset=utf-8",
	"cache-control": "no-cache, no-transform",
	connection: "keep-alive"
};
const CORS = {
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "GET, POST, OPTIONS",
	"access-control-allow-headers": "*"
};
const JSON_HEADERS$1 = { "content-type": "application/json; charset=utf-8" };
const DEFAULT_REQUEST_TIMEOUT_MS = 3e5;
const DEFAULT_POLL_INTERVAL_MS = 500;
const RETRY_BACKOFF_BASE_MS = 800;
const RETRY_MAX_ATTEMPTS = 3;
const DEFAULT_EVENT_FIRST_DELTA_TIMEOUT_MS = Number(process.env.OPENCODE2API_EVENT_FIRST_DELTA_TIMEOUT_MS) || 3e4;
const DEFAULT_EVENT_IDLE_TIMEOUT_MS = Number(process.env.OPENCODE2API_EVENT_IDLE_TIMEOUT_MS) || 8e3;
function normalizeLocalProxyConfig(raw) {
	const normalizeBool = (value, fallback = void 0) => {
		if (typeof value === "boolean") return value;
		if (typeof value === "number") return value === 1;
		if (typeof value === "string") {
			const v = value.trim().toLowerCase();
			if ([
				"1",
				"true",
				"yes",
				"y",
				"on"
			].includes(v)) return true;
			if ([
				"0",
				"false",
				"no",
				"n",
				"off"
			].includes(v)) return false;
		}
		return fallback;
	};
	const promptMode = raw.promptMode ?? raw.PROMPT_MODE ?? process.env.OPENCODE_PROXY_PROMPT_MODE ?? "standard";
	return {
		id: raw.id ?? "local",
		serverUrl: (raw.baseURL ?? raw.serverUrl ?? "http://127.0.0.1:10001").replace(/\/+$/, ""),
		serverPassword: raw.serverPassword ?? process.env.OPENCODE_SERVER_PASSWORD ?? "",
		opencodePath: raw.opencodePath ?? "opencode",
		manageBackend: normalizeBool(raw.manageBackend, true),
		useIsolatedHome: normalizeBool(raw.useIsolatedHome) ?? normalizeBool(process.env.OPENCODE_USE_ISOLATED_HOME) ?? false,
		requestTimeoutMs: Number(raw.requestTimeoutMs ?? process.env.OPENCODE_PROXY_REQUEST_TIMEOUT_MS) || DEFAULT_REQUEST_TIMEOUT_MS,
		disableTools: normalizeBool(raw.disableTools, true),
		internalWebFetchEnabled: normalizeBool(raw.internalWebFetchEnabled, false),
		internalAllowedTools: Array.isArray(raw.internalAllowedTools) ? raw.internalAllowedTools.map((entry) => String(entry).trim()).filter(Boolean) : typeof raw.internalAllowedTools === "string" ? raw.internalAllowedTools.split(",").map((entry) => entry.trim()).filter(Boolean) : [],
		promptMode,
		omitSystemPrompt: normalizeBool(raw.omitSystemPrompt) ?? normalizeBool(process.env.OPENCODE_PROXY_OMIT_SYSTEM_PROMPT) ?? promptMode === "plugin-inject",
		zenApiKey: raw.zenApiKey ?? process.env.OPENCODE_ZEN_API_KEY ?? "",
		autoCleanupConversations: normalizeBool(raw.autoCleanupConversations, false),
		cleanupIntervalMs: Number(raw.cleanupIntervalMs ?? process.env.OPENCODE_PROXY_CLEANUP_INTERVAL_MS) || 432e5,
		cleanupMaxAgeMs: Number(raw.cleanupMaxAgeMs ?? process.env.OPENCODE_PROXY_CLEANUP_MAX_AGE_MS) || 864e5,
		eventIdleTimeoutMs: Number(raw.eventIdleTimeoutMs) || void 0,
		eventFirstDeltaTimeoutMs: Number(raw.eventFirstDeltaTimeoutMs) || void 0,
		debug: String(raw.debug ?? "").toLowerCase() === "true" || raw.debug === "1" || String(process.env.OPENCODE_PROXY_DEBUG || "").toLowerCase() === "true" || process.env.OPENCODE_PROXY_DEBUG === "1",
		toolLockPluginPath: raw.toolLockPluginPath ?? ""
	};
}
function isTransientUpstreamError(error) {
	if (!error) return false;
	const message = [error.message, error.data?.message].filter((part) => typeof part === "string").join(" ");
	if (!message) return false;
	if ([
		/insufficient balance/i,
		/credits?error/i,
		/rate.?limit/i,
		/too many requests/i,
		/worker request limit/i,
		/overloaded/i,
		/temporarily unavailable/i,
		/internal server error/i,
		/bad gateway/i,
		/service unavailable/i,
		/stream error/i
	].some((re) => re.test(message))) return true;
	const statusMatch = message.match(/\b(\d{3}):/);
	const status = statusMatch ? Number(statusMatch[1]) : error.statusCode || error.data?.status || null;
	if (typeof status === "number") {
		if (status === 401 || status === 402 || status === 429) return true;
		if (status >= 500) return true;
	}
	return false;
}
function transformUpstreamError(error) {
	let statusCode = 500;
	let message = error.message || "Internal server error";
	let type = "internal_error";
	let code = error.code || error.constructor?.name;
	if (error.message && error.message.includes("Request timeout")) {
		statusCode = 504;
		type = "timeout";
		code = "timeout";
		message = "Request timeout";
	} else if (error.message && error.message.includes("ENOENT")) {
		statusCode = 500;
		type = "internal_error";
		code = "file_access_error";
		message = "OpenCode backend file access error. This may be a Windows compatibility issue. Please try restarting the service.";
	} else if (error.statusCode) {
		statusCode = error.statusCode;
		const upstreamType = error.code || error.type || "";
		const upstreamMessage = error.message || "";
		if (upstreamType === "CreditsError" || upstreamType === "InsufficientBalanceError" || upstreamMessage.toLowerCase().includes("insufficient balance") || upstreamMessage.toLowerCase().includes("insufficient credits") || upstreamMessage.toLowerCase().includes("billing") || upstreamMessage.toLowerCase().includes("quota exceeded") || upstreamMessage.toLowerCase().includes("credit limit")) {
			statusCode = 402;
			type = "insufficient_quota";
			code = "insufficient_quota";
			message = upstreamMessage || "Insufficient balance or quota exceeded";
		} else if (upstreamType === "RateLimitError" || upstreamType === "TooManyRequestsError" || statusCode === 429 || upstreamMessage.toLowerCase().includes("rate limit") || upstreamMessage.toLowerCase().includes("too many requests")) {
			statusCode = 429;
			type = "rate_limit_exceeded";
			code = "rate_limit_exceeded";
			message = upstreamMessage || "Rate limit exceeded";
		} else if (upstreamType === "AuthenticationError" || upstreamType === "InvalidAPIKeyError" || statusCode === 401 || upstreamMessage.toLowerCase().includes("invalid api key") || upstreamMessage.toLowerCase().includes("unauthorized") || upstreamMessage.toLowerCase().includes("authentication")) {
			statusCode = 401;
			type = "invalid_api_key";
			code = "invalid_api_key";
			message = upstreamMessage || "Invalid API key";
		} else if (upstreamType === "PermissionError" || statusCode === 403 || upstreamMessage.toLowerCase().includes("permission denied") || upstreamMessage.toLowerCase().includes("access denied")) {
			statusCode = 403;
			type = "permission_denied";
			code = "permission_denied";
			message = upstreamMessage || "Permission denied";
		} else if (upstreamType === "NotFoundError" || statusCode === 404 || upstreamMessage.toLowerCase().includes("model not found") || upstreamMessage.toLowerCase().includes("does not exist")) {
			statusCode = 404;
			type = "model_not_found";
			code = "model_not_found";
			message = upstreamMessage || "Model not found";
		} else if (statusCode === 400 || upstreamType === "BadRequestError") {
			statusCode = 400;
			type = "invalid_request_error";
			code = "invalid_request_error";
			message = upstreamMessage || "Invalid request";
		} else if (statusCode >= 500) {
			statusCode = 502;
			type = "server_error";
			code = "server_error";
			message = upstreamMessage || "Upstream provider error";
		} else {
			type = upstreamType.toLowerCase().replace(/error$/, "_error") || "upstream_error";
			code = upstreamType;
			message = upstreamMessage;
		}
	}
	return {
		statusCode,
		error: {
			message,
			type,
			...code && { code },
			...error.availableModels && { available_models: error.availableModels }
		}
	};
}
function errorResponse(transformed) {
	return new Response(JSON.stringify(transformed.error), {
		status: transformed.statusCode,
		headers: {
			...JSON_HEADERS$1,
			...CORS
		}
	});
}
function createMutex() {
	const queue = [];
	let isProcessing = false;
	function processQueue() {
		if (isProcessing || queue.length === 0) return;
		isProcessing = true;
		const { task, timeout, resolve, reject } = queue.shift();
		let settled = false;
		const timeoutMs = timeout || 12e4;
		const timeoutId = setTimeout(() => {
			if (settled) return;
			settled = true;
			reject(/* @__PURE__ */ new Error(`Request timeout after ${timeoutMs}ms`));
		}, timeoutMs);
		Promise.resolve().then(task).then((result) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutId);
			resolve(result);
		}).catch((err) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutId);
			reject(err);
		}).finally(() => {
			isProcessing = false;
			if (queue.length > 0) queueMicrotask(processQueue);
		});
	}
	return function lock(task, timeout = 12e4) {
		return new Promise((resolve, reject) => {
			queue.push({
				task,
				timeout,
				resolve,
				reject
			});
			processQueue();
		});
	};
}
async function getImageDataUri(url) {
	if (url.startsWith("data:")) return url;
	if (!url.startsWith("http://") && !url.startsWith("https://")) throw new Error(`Invalid URL scheme: ${url}`);
	const response = await fetch(url, { signal: AbortSignal.timeout(1e4) });
	if (!response.ok) throw new Error(`Failed to fetch image: HTTP ${response.status}`);
	return `data:${response.headers.get("content-type") || "image/jpeg"};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
}
function createLocalProxy(config) {
	const { serverUrl, serverPassword, requestTimeoutMs: REQUEST_TIMEOUT_MS, debug: DEBUG, disableTools: DISABLE_TOOLS, internalWebFetchEnabled: INTERNAL_WEB_FETCH_ENABLED, internalAllowedTools: INTERNAL_ALLOWED_TOOLS, promptMode: PROMPT_MODE, omitSystemPrompt: OMIT_SYSTEM_PROMPT, autoCleanupConversations: AUTO_CLEANUP_CONVERSATIONS, cleanupIntervalMs: CLEANUP_INTERVAL_MS, cleanupMaxAgeMs: CLEANUP_MAX_AGE_MS, eventIdleTimeoutMs: EVENT_IDLE_TIMEOUT_MS = DEFAULT_EVENT_IDLE_TIMEOUT_MS, eventFirstDeltaTimeoutMs: EVENT_FIRST_DELTA_TIMEOUT_MS = DEFAULT_EVENT_FIRST_DELTA_TIMEOUT_MS } = config;
	const client = createLocalClient(serverUrl, serverPassword);
	const lock = createMutex();
	const logDebug = (...args) => {
		if (DEBUG) console.log("[Local][Debug]", ...args);
	};
	const getProvidersList = async () => {
		const providersRaw = (await client.configProviders()).data?.providers || [];
		return Array.isArray(providersRaw) ? providersRaw : Object.entries(providersRaw).map(([id, info]) => ({
			...info,
			id
		}));
	};
	const buildModelsList = (providersList) => {
		const models = [];
		providersList.forEach((p) => {
			if (p.models) Object.entries(p.models).forEach(([mId, mData]) => {
				models.push({
					id: `${p.id}/${mId}`,
					name: typeof mData === "object" ? mData.name || mData.label || mId : mId,
					object: "model",
					created: mData && mData.release_date ? Math.floor(new Date(mData.release_date).getTime() / 1e3) : 1704067200,
					owned_by: p.id
				});
			});
		});
		return models;
	};
	const normalizeModelID = (modelID) => modelID.replace(/^gpt(\d)/i, "gpt-$1").replace(/^o(\d)/i, "o$1");
	const resolveRequestedModel = async (requestedModel) => {
		const providersList = await getProvidersList();
		const models = buildModelsList(providersList);
		const fallbackModel = models[0]?.id || "opencode/kimi-k2.5-free";
		let [providerID, modelID] = (requestedModel || fallbackModel).split("/");
		if (!modelID) {
			modelID = providerID;
			providerID = "opencode";
		}
		const originalModelID = modelID;
		const normalizedModelID = normalizeModelID(modelID);
		const candidateModelIDs = [...new Set([modelID, normalizedModelID].filter(Boolean))];
		const exact = models.find((m) => candidateModelIDs.some((candidate) => m.id === `${providerID}/${candidate}`));
		if (exact) {
			const [, resolvedModelID] = exact.id.split("/");
			return {
				providerID,
				modelID: resolvedModelID,
				models,
				resolved: exact.id,
				...resolvedModelID !== originalModelID && { aliasFrom: `${providerID}/${originalModelID}` }
			};
		}
		const suffixMatch = models.filter((m) => m.owned_by === providerID).find((m) => candidateModelIDs.some((candidate) => m.id.endsWith(`/${candidate}-free`) || m.id.endsWith(`/${candidate}`)));
		if (suffixMatch) {
			const [, resolvedModelID] = suffixMatch.id.split("/");
			return {
				providerID,
				modelID: resolvedModelID,
				models,
				resolved: suffixMatch.id,
				aliasFrom: `${providerID}/${originalModelID}`
			};
		}
		const error = /* @__PURE__ */ new Error(`Model not found: ${providerID}/${modelID}`);
		error.statusCode = 400;
		error.code = "model_not_found";
		error.availableModels = models.map((m) => m.id);
		throw error;
	};
	const responseState = /* @__PURE__ */ new Map();
	const RESPONSE_STATE_TTL_MS = 18e5;
	const RESPONSE_STATE_SWEEP_INTERVAL_MS = 6e4;
	const getResponseState = (responseId) => {
		const state = responseState.get(responseId);
		if (!state) return null;
		if (state.expiresAt <= Date.now()) {
			responseState.delete(responseId);
			return null;
		}
		return state;
	};
	const storeResponseState = (responseId, sessionId, model) => {
		if (!responseId || !sessionId) return;
		responseState.set(responseId, {
			sessionId,
			model,
			expiresAt: Date.now() + RESPONSE_STATE_TTL_MS
		});
	};
	const sweepResponseState = async () => {
		const now = Date.now();
		const expired = [];
		for (const [id, state] of responseState.entries()) if (state.expiresAt <= now) {
			expired.push(state);
			responseState.delete(id);
		}
		if (!expired.length) return;
		const liveSessionIds = new Set([...responseState.values()].map((s) => s.sessionId));
		for (const state of expired) {
			if (liveSessionIds.has(state.sessionId)) continue;
			try {
				await client.sessionDelete(state.sessionId);
			} catch (e) {
				logDebug("Failed to delete expired response session", {
					sessionId: state.sessionId,
					error: e.message
				});
			}
		}
	};
	const responseStateSweepTimer = setInterval(() => {
		sweepResponseState().catch(() => {});
	}, RESPONSE_STATE_SWEEP_INTERVAL_MS);
	if (typeof responseStateSweepTimer.unref === "function") responseStateSweepTimer.unref();
	const TOOL_MODE = {
		DISABLED: "disabled",
		EXTERNAL_BRIDGE: "external-bridge",
		INTERNAL_ALLOWLIST: "internal-allowlist"
	};
	const TOOL_GUARD_MESSAGE = "Tools are disabled. Do not call tools or function calls. Answer directly from the conversation and general knowledge. If external or real-time data is required, say so and ask the user to enable tools.";
	const EXTERNAL_TOOL_GUARD_MESSAGE = "OpenCode internal tools remain disabled. If an external tool contract is present, use only that contract and never call or mention OpenCode internal tools.";
	const EXTERNAL_TOOL_BRIDGE_ALLOW_MESSAGE = "Client tools are still virtualized: call them only through the external <function_calls> contract. The built-in tools listed above are the only OpenCode internal tools you may call directly.";
	const normalizeConfiguredToolNames = (entries = []) => [...new Set(entries.map((entry) => String(entry || "").trim()).filter(Boolean))];
	const getEffectiveInternalAllowedTools = () => {
		const configuredTools = normalizeConfiguredToolNames(INTERNAL_ALLOWED_TOOLS);
		if (configuredTools.length > 0) return configuredTools;
		if (INTERNAL_WEB_FETCH_ENABLED) return ["web_fetch"];
		return [];
	};
	const SERVER_INTERNAL_ALLOWED_TOOL_NAMES = getEffectiveInternalAllowedTools();
	const buildInternalAllowlistPrompt = (allowedToolNames = []) => {
		if (allowedToolNames.length > 0) return `OpenCode internal tool access is limited for this turn. You may use only these built-in tools when truly required: ${allowedToolNames.join(", ")}. Do not mention or attempt any other internal tools. If the required internal tools are unavailable, answer directly and say live tool access is unavailable.`;
		return "OpenCode internal tools are unavailable for this turn. Answer directly without attempting tool usage.";
	};
	const buildSystemPrompt = (systemMsg, reasoningEffort = null, toolMode = TOOL_MODE.DISABLED, internalAllowedTools = []) => {
		const parts = [];
		if (!OMIT_SYSTEM_PROMPT && systemMsg && systemMsg.trim()) parts.push(systemMsg.trim());
		if (reasoningEffort && reasoningEffort !== "none") parts.push(`[Reasoning Effort: ${reasoningEffort}]`);
		const allowedInternal = normalizeConfiguredToolNames(internalAllowedTools);
		if (allowedInternal.length > 0) {
			parts.push(buildInternalAllowlistPrompt(allowedInternal));
			if (toolMode === TOOL_MODE.EXTERNAL_BRIDGE) parts.push(EXTERNAL_TOOL_BRIDGE_ALLOW_MESSAGE);
		} else if (DISABLE_TOOLS && PROMPT_MODE !== "plugin-inject") parts.push(toolMode === TOOL_MODE.EXTERNAL_BRIDGE ? EXTERNAL_TOOL_GUARD_MESSAGE : TOOL_GUARD_MESSAGE);
		return parts.join("\n\n").trim() || void 0;
	};
	const normalizeReasoningEffort = (value, fallback = null) => {
		if (!value || typeof value !== "string") return fallback;
		return {
			none: "none",
			minimal: "none",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "high"
		}[value.toLowerCase()] || fallback;
	};
	const stripFunctionCalls = (text, trim = true) => {
		if (!DISABLE_TOOLS || !text) return text;
		return stripFunctionCallMarkup(text, trim);
	};
	const normalizeTextContent = (content) => {
		if (typeof content === "string") return content;
		if (Array.isArray(content)) return content.map((part) => {
			if (typeof part === "string") return part;
			if (part && typeof part.text === "string") return part.text;
			if (part?.type === "input_text" || part?.type === "output_text" || part?.type === "text") return part?.text || "";
			return "";
		}).join("");
		if (content && typeof content.text === "string") return content.text;
		if (content === null || content === void 0) return "";
		if (typeof content === "number" || typeof content === "boolean") return String(content);
		return "";
	};
	const normalizeToolArguments = (args) => {
		if (typeof args === "string") return args;
		if (args === void 0) return "{}";
		try {
			return JSON.stringify(args);
		} catch {
			return "{}";
		}
	};
	const createExternalToolContext = (tools, toolChoice) => {
		const registry = buildExternalToolRegistry(tools);
		const exposure = buildToolExposure(registry, toolChoice);
		return {
			registry,
			exposure,
			toolChoice: exposure.toolChoice,
			prompt: exposure.prompt,
			reminder: exposure.reminder
		};
	};
	const resolveToolMode = (tools = [], effectiveInternalAllowlist = []) => {
		if (Array.isArray(tools) && tools.length > 0) return TOOL_MODE.EXTERNAL_BRIDGE;
		if (effectiveInternalAllowlist.length > 0) return TOOL_MODE.INTERNAL_ALLOWLIST;
		return TOOL_MODE.DISABLED;
	};
	const createRequestToolContext = (tools, toolChoice, requestOpencodeConfig) => {
		let effectiveInternalAllowlist = SERVER_INTERNAL_ALLOWED_TOOL_NAMES;
		let requestInternalAllowlist = null;
		if (requestOpencodeConfig && typeof requestOpencodeConfig === "object") {
			if (Array.isArray(requestOpencodeConfig.internal_allowed_tools)) requestInternalAllowlist = requestOpencodeConfig.internal_allowed_tools.map((name) => String(name || "").trim()).filter(Boolean);
		}
		if (requestInternalAllowlist !== null) effectiveInternalAllowlist = SERVER_INTERNAL_ALLOWED_TOOL_NAMES.filter((name) => requestInternalAllowlist.includes(name));
		const deniedRequestedTools = requestInternalAllowlist ? requestInternalAllowlist.filter((name) => !SERVER_INTERNAL_ALLOWED_TOOL_NAMES.includes(name)) : [];
		const mode = resolveToolMode(tools, effectiveInternalAllowlist);
		return {
			mode,
			external: mode === TOOL_MODE.EXTERNAL_BRIDGE ? createExternalToolContext(tools, toolChoice) : {
				registry: [],
				exposure: {
					tools: [],
					toolChoice: {
						mode: "auto",
						requiredTool: null
					},
					prompt: "",
					reminder: ""
				},
				toolChoice: {
					mode: "auto",
					requiredTool: null
				},
				prompt: "",
				reminder: ""
			},
			internal: {
				allowedToolNames: effectiveInternalAllowlist,
				requestedAllowlist: requestInternalAllowlist,
				deniedRequestedTools,
				resolutionPath: requestInternalAllowlist ? "request-intersection" : "server-default",
				resultingMode: mode
			}
		};
	};
	const finalizeValidatedToolCalls = (parsedToolCalls, registry) => {
		const { validCalls, invalidCalls } = validateToolCalls(parsedToolCalls, registry);
		invalidCalls.forEach(({ call, validation }) => {
			logDebug("Rejected external tool call", {
				tool: call?.function?.name,
				errors: validation?.errors?.map((error) => error.message)
			});
		});
		const allowedCalls = [];
		validCalls.forEach((toolCall) => {
			const policyDecision = evaluateToolPolicy(toolCall.tool, toolCall.validatedArguments, { config: {} });
			if (policyDecision.status === "allow") {
				allowedCalls.push(toolCall);
				return;
			}
			logDebug("Blocked external tool call", {
				tool: toolCall.function.name,
				status: policyDecision.status,
				reason: policyDecision.reason
			});
		});
		return {
			validCalls: allowedCalls,
			invalidCalls
		};
	};
	const toPublicToolCalls = (toolCalls) => {
		if (!Array.isArray(toolCalls) || toolCalls.length === 0) return [];
		return toolCalls.map((toolCall) => ({
			id: toolCall.id,
			type: "function",
			function: {
				name: toolCall.function.name,
				arguments: toolCall.function.arguments
			}
		}));
	};
	const TOOL_IDS_CACHE_MS = 3e5;
	let cachedToolIds = null;
	let cachedToolIdsAt = 0;
	let cachedDisabledToolOverrides = null;
	let cachedDisabledToolOverridesAt = 0;
	const internalToolMetrics = {
		externalBridgeRequests: 0,
		internalAllowlistRequests: 0,
		disabledRequests: 0,
		discoveryFailures: 0,
		fallbackToDisabled: 0
	};
	const trackToolMode = (toolMode) => {
		if (toolMode === TOOL_MODE.EXTERNAL_BRIDGE) internalToolMetrics.externalBridgeRequests += 1;
		else if (toolMode === TOOL_MODE.INTERNAL_ALLOWLIST) internalToolMetrics.internalAllowlistRequests += 1;
		else internalToolMetrics.disabledRequests += 1;
	};
	const getBackendToolIds = async () => {
		if (cachedToolIds && Date.now() - cachedToolIdsAt < TOOL_IDS_CACHE_MS) return cachedToolIds;
		try {
			const idsRes = await client.toolIds();
			const ids = Array.isArray(idsRes?.data) ? idsRes.data : Array.isArray(idsRes) ? idsRes : [];
			cachedToolIds = ids;
			cachedToolIdsAt = Date.now();
			return ids;
		} catch (e) {
			internalToolMetrics.discoveryFailures += 1;
			logDebug("Backend tool ids failed", { error: e.message });
			return null;
		}
	};
	const buildDisabledToolOverrides = (ids = []) => {
		const overrides = {};
		ids.forEach((id) => {
			overrides[id] = false;
		});
		return overrides;
	};
	const normalizeBackendToolIds = (ids = []) => ids.filter((id) => typeof id === "string" && id.trim());
	const normalizeToolName = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9./]/g, "");
	const matchesAllowedToolName = (toolId, allowedToolName) => {
		const id = normalizeToolName(toolId);
		const name = normalizeToolName(allowedToolName);
		if (!id || !name) return false;
		return id === name || id.endsWith(`.${name}`) || id.endsWith(`/${name}`);
	};
	const resolveInternalAllowedToolIds = (ids = [], allowedToolNames = []) => {
		const normalizedIds = normalizeBackendToolIds(ids);
		const normalizedAllowedNames = normalizeConfiguredToolNames(allowedToolNames);
		const matchedToolIds = /* @__PURE__ */ new Set();
		const unmatchedAllowedNames = [];
		normalizedAllowedNames.forEach((allowedToolName) => {
			const matches = normalizedIds.filter((toolId) => matchesAllowedToolName(toolId, allowedToolName));
			if (matches.length === 0) {
				unmatchedAllowedNames.push(allowedToolName);
				return;
			}
			matches.forEach((match) => matchedToolIds.add(match));
		});
		return {
			normalizedIds,
			normalizedAllowedNames,
			matchedToolIds: [...matchedToolIds],
			unmatchedAllowedNames
		};
	};
	const getDisabledToolOverrides = async () => {
		if (!DISABLE_TOOLS) return null;
		if (cachedDisabledToolOverrides && Date.now() - cachedDisabledToolOverridesAt < TOOL_IDS_CACHE_MS) return cachedDisabledToolOverrides;
		const ids = await getBackendToolIds();
		if (!Array.isArray(ids)) return null;
		const overrides = buildDisabledToolOverrides(ids);
		cachedDisabledToolOverrides = overrides;
		cachedDisabledToolOverridesAt = Date.now();
		return overrides;
	};
	const TOOL_LOCK_CHECK_MS = 6e4;
	let toolLockState = {
		loaded: false,
		checkedAt: 0,
		warned: false
	};
	const isToolLockLoaded = async () => {
		if (toolLockState.checkedAt && Date.now() - toolLockState.checkedAt < TOOL_LOCK_CHECK_MS) return toolLockState.loaded;
		let plugins;
		try {
			const res = await client.configGet();
			plugins = Array.isArray(res?.data?.plugin) ? res.data.plugin : [];
		} catch {
			return toolLockState.loaded;
		}
		const loaded = plugins.some((spec) => typeof spec === "string" && spec.replace(/\\/g, "/").endsWith("/opencode2api-tool-lock.js"));
		if (!loaded && !toolLockState.warned) {
			console.warn(`[Local] Backend at ${serverUrl} does not load the opencode2api tool-lock plugin; falling back to per-request tool overrides. OpenCode Zen free models reject those requests.`);
			toolLockState.warned = true;
		}
		toolLockState = {
			...toolLockState,
			loaded,
			checkedAt: Date.now()
		};
		return loaded;
	};
	const buildToolPolicy = (_toolMode, internalContext = {}) => {
		const names = normalizeConfiguredToolNames(internalContext.allowedToolNames || SERVER_INTERNAL_ALLOWED_TOOL_NAMES).map(normalizeToolName).filter(Boolean);
		if (names.length) return [...new Set(names)].join(",");
		return DISABLE_TOOLS ? "none" : "*";
	};
	const sessionTitleForPolicy = (policy) => `opencode2api [tools:${policy}]`;
	const getToolOverridesForMode = async (_toolMode, internalContext = {}) => {
		const allowedNames = normalizeConfiguredToolNames(internalContext.allowedToolNames || SERVER_INTERNAL_ALLOWED_TOOL_NAMES);
		if (allowedNames.length === 0) return getDisabledToolOverrides();
		const ids = await getBackendToolIds();
		if (!Array.isArray(ids) || ids.length === 0) return null;
		const { normalizedIds, matchedToolIds } = resolveInternalAllowedToolIds(ids, allowedNames);
		if (matchedToolIds.length === 0) {
			internalToolMetrics.fallbackToDisabled += 1;
			return buildDisabledToolOverrides(normalizedIds);
		}
		const overrides = {};
		normalizedIds.forEach((id) => {
			overrides[id] = matchedToolIds.includes(id);
		});
		return overrides;
	};
	const resolveToolControl = async (toolMode, internalContext = {}) => {
		const policy = buildToolPolicy(toolMode, internalContext);
		if (await isToolLockLoaded()) {
			logDebug("Tool policy via plugin", {
				toolMode,
				policy
			});
			return {
				title: sessionTitleForPolicy(policy),
				toolOverrides: null
			};
		}
		return {
			title: void 0,
			toolOverrides: await getToolOverridesForMode(toolMode, internalContext)
		};
	};
	const createSession = async (toolControl) => {
		const sessionId = (await client.sessionCreate(toolControl?.title ? { title: toolControl.title } : void 0))?.data?.id;
		if (!sessionId) throw new Error("Failed to create OpenCode session");
		return sessionId;
	};
	async function promptWithTimeout(promptParams, timeoutMs) {
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(/* @__PURE__ */ new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
		});
		return Promise.race([client.sessionPrompt(promptParams.path.id, promptParams.body), timeoutPromise]);
	}
	async function pollForAssistantResponse(sessionId, timeoutMs, intervalMs = DEFAULT_POLL_INTERVAL_MS) {
		const pollStart = Date.now();
		const startedAt = Date.now();
		let lastPartial = null;
		while (Date.now() - startedAt < timeoutMs) {
			const messagesRes = await client.sessionMessages(sessionId);
			const messages = messagesRes?.data || messagesRes || [];
			if (Array.isArray(messages) && messages.length) for (let i = messages.length - 1; i >= 0; i -= 1) {
				const entry = messages[i];
				const info = entry?.info;
				if (info?.role !== "assistant") continue;
				const { content, reasoning, toolParts } = extractFromParts(entry?.parts || []);
				const error = info?.error || null;
				const finished = info.finish && info.finish !== "tool";
				const done = Boolean(finished || info.time?.completed || error);
				if (toolParts.length > 0) logDebug("Polling found tool parts", {
					sessionId,
					count: toolParts.length
				});
				if (done) {
					if (error) console.error("[Local] OpenCode assistant error:", error);
					logDebug("Polling completed", {
						sessionId,
						ms: Date.now() - pollStart,
						contentLen: content.length,
						reasoningLen: reasoning.length
					});
					return {
						content,
						reasoning,
						error
					};
				}
				if (content || reasoning) lastPartial = {
					content,
					reasoning,
					error: null
				};
				break;
			}
			await sleep(intervalMs);
		}
		if (lastPartial) {
			logDebug("Polling timeout with partial response", {
				sessionId,
				ms: Date.now() - pollStart
			});
			return lastPartial;
		}
		logDebug("Polling timeout", {
			sessionId,
			ms: Date.now() - pollStart
		});
		throw new Error(`Request timeout after ${timeoutMs}ms`);
	}
	function extractFromParts(parts) {
		if (!Array.isArray(parts)) return {
			content: "",
			reasoning: "",
			toolParts: []
		};
		return {
			content: parts.filter((p) => p.type === "text").map((p) => p.text).join(""),
			reasoning: parts.filter((p) => p.type === "reasoning").map((p) => p.text).join(""),
			toolParts: parts.filter((p) => p.type === "tool")
		};
	}
	async function collectFromEvents(sessionId, timeoutMs, onDelta, firstDeltaTimeoutMs, idleTimeoutMs) {
		const controller = new AbortController();
		const eventStreamPromise = client.eventStream(controller.signal);
		let finished = false;
		let content = "";
		let reasoning = "";
		let receivedDelta = false;
		let deltaChars = 0;
		let firstDeltaAt = null;
		const activeToolCallIds = /* @__PURE__ */ new Set();
		const startedAt = Date.now();
		const finishPromise = new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				if (finished) return;
				finished = true;
				controller.abort();
				reject(/* @__PURE__ */ new Error(`Request timeout after ${timeoutMs}ms`));
			}, timeoutMs);
			const firstDeltaTimer = firstDeltaTimeoutMs ? setTimeout(() => {
				if (finished || receivedDelta) return;
				finished = true;
				controller.abort();
				logDebug("No event data received", {
					sessionId,
					ms: Date.now() - startedAt
				});
				resolve({
					content: "",
					reasoning: "",
					noData: true
				});
			}, firstDeltaTimeoutMs) : null;
			let idleTimer = null;
			const scheduleIdleTimer = () => {
				if (!idleTimeoutMs) return;
				if (idleTimer) clearTimeout(idleTimer);
				idleTimer = setTimeout(() => {
					if (finished) return;
					if (activeToolCallIds.size > 0) {
						logDebug("Event idle while internal tool call is active, continuing to wait", {
							sessionId,
							ms: Date.now() - startedAt,
							activeTools: activeToolCallIds.size
						});
						scheduleIdleTimer();
						return;
					}
					finished = true;
					controller.abort();
					logDebug("Event idle timeout", {
						sessionId,
						ms: Date.now() - startedAt,
						deltaChars
					});
					resolve({
						content,
						reasoning,
						idleTimeout: true,
						receivedDelta
					});
				}, idleTimeoutMs);
			};
			const trackToolActivity = (part) => {
				if (!part || part.type !== "tool") return;
				const status = part.state?.status;
				if (status === "pending" || status === "running") {
					if (part.id) activeToolCallIds.add(part.id);
				} else if (status === "completed" || status === "error") {
					if (part.id) activeToolCallIds.delete(part.id);
				}
				receivedDelta = true;
				if (firstDeltaTimer) clearTimeout(firstDeltaTimer);
				scheduleIdleTimer();
			};
			const partTypeById = /* @__PURE__ */ new Map();
			const rememberPartType = (part) => {
				if (part && part.id && typeof part.type === "string") partTypeById.set(part.id, part.type);
			};
			const applyTextDelta = (partType, delta) => {
				receivedDelta = true;
				if (firstDeltaTimer) clearTimeout(firstDeltaTimer);
				scheduleIdleTimer();
				if (!firstDeltaAt) {
					firstDeltaAt = Date.now();
					logDebug("SSE first delta", {
						sessionId,
						ms: firstDeltaAt - startedAt,
						type: partType
					});
				}
				if (partType === "reasoning") {
					reasoning += delta;
					if (onDelta) onDelta(delta, true);
				} else {
					content += delta;
					if (onDelta) onDelta(delta, false);
				}
				deltaChars += delta.length;
			};
			(async () => {
				try {
					for await (const event of await eventStreamPromise) {
						if (event.type === "message.part.updated" && event.properties?.part?.sessionID === sessionId) {
							const { part, delta } = event.properties;
							rememberPartType(part);
							trackToolActivity(part);
							if (delta) applyTextDelta(part.type, delta);
							continue;
						}
						if (event.type === "message.part.delta" && event.properties?.sessionID === sessionId) {
							const { partID, delta, field } = event.properties;
							if (typeof delta === "string" && field === "text") {
								const partType = partTypeById.get(partID);
								if (partType === "reasoning" || partType === "text") applyTextDelta(partType, delta);
							}
							continue;
						}
						if (event.type === "message.updated" && event.properties?.info?.sessionID === sessionId) {
							const info = event.properties.info;
							const finish = info.finish;
							if (info.error && !finished) {
								finished = true;
								clearTimeout(timeoutId);
								if (firstDeltaTimer) clearTimeout(firstDeltaTimer);
								if (idleTimer) clearTimeout(idleTimer);
								logDebug("SSE upstream message error", {
									sessionId,
									ms: Date.now() - startedAt,
									error: info.error.name || "UnknownError"
								});
								resolve({
									content,
									reasoning,
									error: info.error
								});
								break;
							}
							if (Array.isArray(info.parts)) for (const part of info.parts) {
								rememberPartType(part);
								if (part && part.type === "tool") {
									const status = part.state?.status;
									if (status === "pending" || status === "running") {
										if (part.id) activeToolCallIds.add(part.id);
									} else if (status === "completed" || status === "error") {
										if (part.id) activeToolCallIds.delete(part.id);
									}
								}
							}
							if (finish === "tool") {
								if (firstDeltaTimer) clearTimeout(firstDeltaTimer);
								scheduleIdleTimer();
								continue;
							}
							if (finish === "stop") {
								if (activeToolCallIds.size > 0) {
									logDebug("Ignoring intermediate stop while tools are active", {
										sessionId,
										activeTools: activeToolCallIds.size
									});
									continue;
								}
								if (!finished) {
									finished = true;
									clearTimeout(timeoutId);
									if (firstDeltaTimer) clearTimeout(firstDeltaTimer);
									if (idleTimer) clearTimeout(idleTimer);
									logDebug("SSE completed", {
										sessionId,
										ms: Date.now() - startedAt,
										deltaChars
									});
									resolve({
										content,
										reasoning
									});
								}
								break;
							}
						}
					}
				} catch (e) {
					if (!finished) {
						finished = true;
						clearTimeout(timeoutId);
						if (firstDeltaTimer) clearTimeout(firstDeltaTimer);
						if (idleTimer) clearTimeout(idleTimer);
						reject(e);
					}
				}
			})();
		});
		try {
			return await finishPromise;
		} finally {
			controller.abort();
		}
	}
	const getCleanupRoots = () => {
		const roots = [];
		const add = (dir) => {
			if (!dir) return;
			if (!roots.includes(dir)) roots.push(dir);
		};
		add("/home/node/.local/share/opencode/storage");
		return roots;
	};
	const cleanupConversationFiles = async () => {
		if (!AUTO_CLEANUP_CONVERSATIONS) return {
			removed: 0,
			scanned: 0
		};
		const now = Date.now();
		let removed = 0;
		let scanned = 0;
		for (const storageRoot of getCleanupRoots()) for (const sub of ["message", "session"]) {
			const dir = path.join(storageRoot, sub);
			if (!fs.existsSync(dir)) continue;
			let entries = [];
			try {
				entries = fs.readdirSync(dir, { withFileTypes: true });
			} catch {
				continue;
			}
			for (const entry of entries) {
				const full = path.join(dir, entry.name);
				let stat;
				try {
					stat = fs.statSync(full);
				} catch {
					continue;
				}
				scanned += 1;
				if (now - (stat.mtimeMs || stat.ctimeMs || now) < CLEANUP_MAX_AGE_MS) continue;
				try {
					fs.rmSync(full, {
						recursive: true,
						force: true
					});
					removed += 1;
				} catch (e) {
					logDebug("Cleanup remove failed", {
						full,
						error: e.message
					});
				}
			}
		}
		if (removed > 0) logDebug("Conversation cleanup completed", {
			removed,
			scanned,
			maxAgeMs: CLEANUP_MAX_AGE_MS
		});
		return {
			removed,
			scanned
		};
	};
	if (AUTO_CLEANUP_CONVERSATIONS) {
		setTimeout(() => {
			cleanupConversationFiles().catch((e) => logDebug("Cleanup run failed", { error: e.message }));
		}, 3e3);
		const cleanupTimer = setInterval(() => {
			cleanupConversationFiles().catch((e) => logDebug("Cleanup run failed", { error: e.message }));
		}, CLEANUP_INTERVAL_MS);
		if (cleanupTimer.unref) cleanupTimer.unref();
	}
	const ensureBackendOnce = async () => {
		await ensureBackend({
			serverUrl,
			opencodePath: config.opencodePath,
			useIsolatedHome: config.useIsolatedHome,
			zenApiKey: config.zenApiKey,
			serverPassword: config.serverPassword,
			manageBackend: config.manageBackend,
			promptMode: PROMPT_MODE,
			toolLockPluginPath: config.toolLockPluginPath
		});
	};
	function createForcedToolCallRequester({ mode, sessionId, systemWithGuard, requiredTool, providerID, modelID, toolOverrides, requestTimeoutMs, forbidThinkBlock = false }) {
		return async () => {
			if (mode !== "required") return null;
			if (!requiredTool) return null;
			const forcedPromptParams = {
				path: { id: sessionId },
				body: {
					model: {
						providerID,
						modelID
					},
					...systemWithGuard ? { system: systemWithGuard } : {},
					parts: [{
						type: "text",
						text: `SYSTEM: Your previous reply did not emit the required external tool call. Reply now with ONLY <function_calls>{\\"name\\":\\"${requiredTool}\\",\\"arguments\\":{}}</function_calls> or an array inside <function_calls>...</function_calls>. Do not output any prose, reasoning, markdown${forbidThinkBlock ? ", or <think> block" : ""}. Infer the correct arguments from the conversation so far.`
					}]
				}
			};
			if (toolOverrides && Object.keys(toolOverrides).length > 0) forcedPromptParams.body.tools = toolOverrides;
			await promptWithTimeout(forcedPromptParams, requestTimeoutMs);
			return pollForAssistantResponse(sessionId, requestTimeoutMs);
		};
	}
	async function handleChat(body, requestStream) {
		try {
			return await lock(async () => {
				let sessionId = null;
				try {
					const { messages, model, tools = [], tool_choice, temperature, max_tokens, top_p, stop, reasoning_effort, reasoning: requestReasoning, opencode: requestOpencodeConfig } = body ?? {};
					if (!messages || !Array.isArray(messages) || messages.length === 0) return jsonResponse({ error: { message: "messages array is required" } }, 400);
					const stream = Boolean(requestStream);
					const reasoningLevel = normalizeReasoningEffort(reasoning_effort || requestReasoning?.effort, null);
					const requestParams = {
						temperature: typeof temperature === "number" ? temperature : .7,
						max_tokens: typeof max_tokens === "number" ? max_tokens : null,
						top_p: typeof top_p === "number" ? top_p : 1,
						stop: Array.isArray(stop) ? stop : stop ? [stop] : null,
						reasoning_effort: reasoningLevel
					};
					const resolvedModel = await resolveRequestedModel(model);
					const pID = resolvedModel.providerID;
					const mID = resolvedModel.modelID;
					if (resolvedModel.aliasFrom) logDebug("Resolved model alias", {
						from: resolvedModel.aliasFrom,
						to: resolvedModel.resolved
					});
					const normalizeMessageContent = (content) => normalizeTextContent(content);
					const buildPromptParts = async (rawMessages, externalToolRegistry) => {
						const parts = [];
						const systemChunks = [];
						const userContents = [];
						const assistantToolCalls = /* @__PURE__ */ new Map();
						const formatRoleLine = (role, name, text) => {
							return `${role.toUpperCase()}${name ? `(${name})` : ""}: ${text}`;
						};
						for (const m of rawMessages) {
							const role = (m?.role || "user").toLowerCase();
							const content = m?.content;
							if (role === "system") {
								const text = normalizeMessageContent(content);
								if (text) systemChunks.push(text);
								continue;
							}
							if (role === "assistant" && Array.isArray(m?.tool_calls) && m.tool_calls.length) {
								const serializedToolCalls = m.tool_calls.map((toolCall, index) => ({
									id: toolCall?.id || `call_${index + 1}`,
									name: findExternalToolByName(externalToolRegistry, toolCall?.function?.name || toolCall?.name)?.namespacedName || toolCall?.function?.name || toolCall?.name,
									arguments: normalizeToolArguments(toolCall?.function?.arguments ?? toolCall?.arguments)
								})).filter((toolCall) => toolCall.name);
								if (serializedToolCalls.length) {
									serializedToolCalls.forEach((toolCall) => {
										assistantToolCalls.set(toolCall.id, toolCall.name);
									});
									parts.push({
										type: "text",
										text: `ASSISTANT: <function_calls>${JSON.stringify(serializedToolCalls)}</function_calls>`
									});
								}
							}
							if (role === "tool") {
								const text = normalizeMessageContent(content);
								if (text) {
									const toolName = (findExternalToolByName(externalToolRegistry, m?.name) || findExternalToolByName(externalToolRegistry, assistantToolCalls.get(m?.tool_call_id)))?.namespacedName || assistantToolCalls.get(m?.tool_call_id) || m?.name || `external__unknown`;
									const toolCallId = m?.tool_call_id || `call_${toolName.replace(/[^a-zA-Z0-9_]/g, "_")}`;
									parts.push({
										type: "text",
										text: `TOOL_RESULT: ${JSON.stringify({
											tool_call_id: toolCallId,
											name: toolName,
											content: text
										})}`
									});
								}
								continue;
							}
							if (!content) continue;
							if (typeof content === "string") {
								if (role === "user") userContents.push(content);
								parts.push({
									type: "text",
									text: formatRoleLine(role, m?.name, content)
								});
							} else if (Array.isArray(content)) for (const part of content) {
								if (!part) continue;
								if (part.type === "text") {
									const text = part.text || "";
									if (role === "user") userContents.push(text);
									parts.push({
										type: "text",
										text: formatRoleLine(role, m?.name, text)
									});
								} else if (part.type === "image_url") {
									const imageUrl = typeof part.image_url === "string" ? part.image_url : part.image_url?.url;
									if (imageUrl) try {
										const dataUri = await getImageDataUri(imageUrl);
										const mime = dataUri.split(";")[0].split(":")[1];
										parts.push({
											type: "file",
											mime,
											url: dataUri,
											filename: "image"
										});
									} catch (imgErr) {
										console.warn("[Local] Skipping image due to error:", imgErr.message);
									}
								}
							}
						}
						return {
							parts,
							system: systemChunks.join("\n\n"),
							fullPromptText: parts.map((p) => p.text).join("\n\n"),
							lastUserMsg: userContents[userContents.length - 1] || ""
						};
					};
					const requestToolContext = createRequestToolContext(tools, tool_choice, requestOpencodeConfig);
					const toolMode = requestToolContext.mode;
					const externalToolContext = requestToolContext.external;
					const externalToolRegistry = externalToolContext.registry;
					const externalToolChoice = externalToolContext.toolChoice;
					const internalToolContext = requestToolContext.internal;
					trackToolMode(toolMode);
					const { parts, system: systemMsg, fullPromptText } = await buildPromptParts(messages, externalToolRegistry);
					const systemWithGuard = buildSystemPrompt([systemMsg, externalToolContext.prompt].filter(Boolean).join("\n\n"), requestParams.reasoning_effort, toolMode, internalToolContext.allowedToolNames);
					if (!parts.length) return jsonResponse({ error: { message: "messages must include at least one non-system text message" } }, 400);
					await ensureBackendOnce();
					try {
						await client.configUpdate({ activeModel: {
							providerID: pID,
							modelID: mID
						} });
					} catch (confError) {
						logDebug("Failed to set active model:", confError.message);
					}
					const toolControl = await resolveToolControl(toolMode, internalToolContext);
					sessionId = await createSession(toolControl);
					logDebug("Session created", { sessionId });
					const id = `chatcmpl-${crypto.randomUUID()}`;
					let completionTokens = 0;
					let reasoningTokens = 0;
					const promptParams = {
						path: { id: sessionId },
						body: {
							model: {
								providerID: pID,
								modelID: mID
							},
							system: systemWithGuard,
							parts: externalToolContext.reminder ? [...parts, {
								type: "text",
								text: externalToolContext.reminder
							}] : parts,
							...requestParams.max_tokens && { max_tokens: requestParams.max_tokens },
							...requestParams.temperature !== void 0 && { temperature: requestParams.temperature },
							...requestParams.top_p !== void 0 && { top_p: requestParams.top_p },
							...requestParams.stop && { stop: requestParams.stop }
						}
					};
					const { toolOverrides } = toolControl;
					if (toolOverrides && Object.keys(toolOverrides).length > 0) promptParams.body.tools = toolOverrides;
					const makeForcedChatToolCallRequester = () => createForcedToolCallRequester({
						mode: externalToolChoice.mode,
						sessionId,
						systemWithGuard,
						requiredTool: externalToolChoice.requiredTool || externalToolRegistry[0]?.namespacedName,
						providerID: pID,
						modelID: mID,
						toolOverrides,
						requestTimeoutMs: REQUEST_TIMEOUT_MS,
						forbidThinkBlock: true
					});
					let requestForcedChatToolCall = makeForcedChatToolCallRequester();
					const finalizeStream = (finalStreamedToolCalls) => {
						const promptTokens = Math.ceil((fullPromptText || "").length / 4);
						const totalTokens = promptTokens + completionTokens + reasoningTokens;
						return [`data: ${JSON.stringify({
							id,
							choices: [{
								index: 0,
								delta: {},
								finish_reason: finalStreamedToolCalls.length > 0 ? "tool_calls" : "stop"
							}],
							usage: {
								prompt_tokens: promptTokens,
								completion_tokens: completionTokens + reasoningTokens,
								total_tokens: totalTokens,
								completion_tokens_details: { reasoning_tokens: reasoningTokens }
							}
						})}\n\n`, "data: [DONE]\n\n"];
					};
					if (stream) {
						const shouldStripStreamingToolMarkup = externalToolRegistry.length > 0;
						const filterContentDelta = createToolCallFilter({
							disableTools: DISABLE_TOOLS,
							forceStrip: shouldStripStreamingToolMarkup
						});
						const filterReasoningDelta = createToolCallFilter({
							disableTools: DISABLE_TOOLS,
							forceStrip: shouldStripStreamingToolMarkup
						});
						const parseContentToolCalls = createExternalToolCallStreamParser(externalToolRegistry);
						const parseReasoningToolCalls = createExternalToolCallStreamParser(externalToolRegistry);
						let streamedContent = "";
						let streamedReasoning = "";
						let rawStreamedContent = "";
						let rawStreamedReasoning = "";
						const streamedToolCalls = [];
						completionTokens = 0;
						reasoningTokens = 0;
						let sink = null;
						let keepaliveTimer = null;
						const encoderChunk = (payload) => `data: ${JSON.stringify(payload)}\n\n`;
						const sendDelta = (delta, isReasoning = false) => {
							if (!delta) return;
							if (isReasoning) rawStreamedReasoning += delta;
							else rawStreamedContent += delta;
							(isReasoning ? parseReasoningToolCalls(delta) : parseContentToolCalls(delta)).forEach((toolCall) => {
								streamedToolCalls.push(toolCall);
								sink?.(encoderChunk({
									id,
									object: "chat.completion.chunk",
									created: Math.floor(Date.now() / 1e3),
									model: `${pID}/${mID}`,
									choices: [{
										index: 0,
										delta: { tool_calls: [{
											index: streamedToolCalls.length - 1,
											id: toolCall.id,
											type: "function",
											function: {
												name: toolCall.function.name,
												arguments: toolCall.function.arguments
											}
										}] },
										finish_reason: null
									}]
								}));
							});
							const filtered = isReasoning ? filterReasoningDelta(delta) : filterContentDelta(delta);
							if (!filtered) return;
							if (isReasoning) {
								streamedReasoning += filtered;
								reasoningTokens += Math.ceil(filtered.length / 4);
							} else {
								streamedContent += filtered;
								completionTokens += Math.ceil(filtered.length / 4);
							}
							const deltaField = isReasoning ? { reasoning_content: filtered } : { content: filtered };
							sink?.(encoderChunk({
								id,
								object: "chat.completion.chunk",
								created: Math.floor(Date.now() / 1e3),
								model: `${pID}/${mID}`,
								choices: [{
									index: 0,
									delta: deltaField,
									finish_reason: null
								}]
							}));
						};
						const runStream = async (emit) => {
							sink = emit;
							if (!keepaliveTimer) keepaliveTimer = setInterval(() => sink?.(": keepalive\n\n"), 15e3);
							let collected = null;
							for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt += 1) {
								if (attempt > 1) {
									try {
										await client.sessionDelete(sessionId);
									} catch (e) {
										logDebug("Failed to delete retried session", {
											sessionId,
											error: e.message
										});
									}
									sessionId = await createSession(toolControl);
									promptParams.path.id = sessionId;
									requestForcedChatToolCall = makeForcedChatToolCallRequester();
									streamedContent = "";
									streamedReasoning = "";
									rawStreamedContent = "";
									rawStreamedReasoning = "";
									streamedToolCalls.length = 0;
									completionTokens = 0;
									reasoningTokens = 0;
									await sleep(RETRY_BACKOFF_BASE_MS * attempt);
								}
								try {
									const safeCollect = collectFromEvents(sessionId, REQUEST_TIMEOUT_MS, sendDelta, EVENT_FIRST_DELTA_TIMEOUT_MS, EVENT_IDLE_TIMEOUT_MS).catch((err) => ({ __error: err }));
									client.sessionPrompt(promptParams.path.id, promptParams.body).catch((err) => logDebug("Prompt error:", err.message));
									collected = await safeCollect;
								} catch (e) {
									logDebug("Stream error:", e.message);
								}
								const attemptError = collected?.error || collected?.__error || null;
								const nothingStreamed = !rawStreamedContent && !rawStreamedReasoning && streamedToolCalls.length === 0;
								if (attemptError && nothingStreamed && attempt < RETRY_MAX_ATTEMPTS && isTransientUpstreamError(attemptError)) {
									console.warn(`[Local] Transient upstream error (attempt ${attempt}/${RETRY_MAX_ATTEMPTS}), retrying:`, attemptError.data?.message || attemptError.message || attemptError.name || "unknown");
									continue;
								}
								break;
							}
							const pollFallback = async () => {
								const { content, reasoning: pollReasoning, error } = await pollForAssistantResponse(sessionId, REQUEST_TIMEOUT_MS);
								if (error && !content && !pollReasoning) sendDelta(`[Proxy Error] ${error.name || "OpenCodeError"}: ${error.data?.message || error.message || "Unknown error"}`);
								else {
									if (pollReasoning) sendDelta(pollReasoning, true);
									if (content) sendDelta(content, false);
								}
							};
							if (collected && collected.__error) {
								logDebug("SSE collect error, falling back to polling", {
									sessionId,
									error: collected.__error?.message
								});
								await pollFallback();
							} else if (collected && collected.noData) {
								logDebug("Fallback to polling (stream)", { sessionId });
								await pollFallback();
							} else if (collected && collected.idleTimeout) {
								logDebug("SSE idle timeout, polling for completion", { sessionId });
								const { content, reasoning: polledReasoning, error } = await pollForAssistantResponse(sessionId, REQUEST_TIMEOUT_MS);
								if (error && !content && !polledReasoning) sendDelta(`[Proxy Error] ${error.name || "OpenCodeError"}: ${error.data?.message || error.message || "Unknown error"}`);
								else {
									const remainingReasoning = polledReasoning && polledReasoning.startsWith(rawStreamedReasoning) ? polledReasoning.slice(rawStreamedReasoning.length) : polledReasoning;
									const remainingContent = content && content.startsWith(rawStreamedContent) ? content.slice(rawStreamedContent.length) : content;
									if (remainingReasoning) sendDelta(remainingReasoning, true);
									if (remainingContent) sendDelta(remainingContent, false);
								}
							}
							if (collected && !streamedContent && !streamedReasoning && (collected.reasoning || collected.content)) {
								if (collected.reasoning) sendDelta(collected.reasoning, true);
								if (collected.content) sendDelta(collected.content, false);
							}
							if (!streamedContent && !streamedReasoning) {
								logDebug("SSE returned empty, falling back to polling", { sessionId });
								await pollFallback();
							} else if (streamedReasoning && !streamedContent) {
								logDebug("Reasoning streamed but no content, reconciling from snapshot", { sessionId });
								const snapshot = await pollForAssistantResponse(sessionId, REQUEST_TIMEOUT_MS).catch(() => null);
								if (snapshot && snapshot.content) {
									const remainingContent = rawStreamedContent ? snapshot.content.slice(rawStreamedContent.length) : snapshot.content;
									if (remainingContent) sendDelta(remainingContent, false);
								}
							}
							const flushedReasoningCalls = parseReasoningToolCalls.flush ? parseReasoningToolCalls.flush() : [];
							const flushedContentCalls = parseContentToolCalls.flush ? parseContentToolCalls.flush() : [];
							const flushedReasoningText = filterReasoningDelta.flush ? filterReasoningDelta.flush() : "";
							const flushedContentText = filterContentDelta.flush ? filterContentDelta.flush() : "";
							const finalReasoningText = rawStreamedReasoning + flushedReasoningText;
							const finalContentText = rawStreamedContent + flushedContentText;
							const parseStreamedToolCalls = () => {
								if (externalToolRegistry.length === 0) return [];
								const perChannel = [
									...flushedReasoningCalls,
									...flushedContentCalls,
									...parseExternalToolCallsFromText(externalToolRegistry, finalReasoningText, finalContentText)
								];
								if (perChannel.length > 0) return perChannel;
								return parseExternalToolCallsFromText(externalToolRegistry, finalReasoningText + finalContentText);
							};
							let parsedToolCalls = streamedToolCalls.length > 0 ? streamedToolCalls : parseStreamedToolCalls();
							if (parsedToolCalls.length === 0 && externalToolChoice.mode === "required") {
								const forcedResponse = await requestForcedChatToolCall();
								if (forcedResponse) parsedToolCalls = parseExternalToolCallsFromText(externalToolRegistry, forcedResponse.reasoning, forcedResponse.content);
							}
							const { validCalls: validatedStreamedToolCalls } = finalizeValidatedToolCalls(parsedToolCalls, externalToolRegistry);
							const finalStreamedToolCalls = validatedStreamedToolCalls;
							if (finalStreamedToolCalls.length > 0) {
								const toolCallDeltas = finalStreamedToolCalls.map((toolCall, index) => ({
									index,
									id: toolCall.id,
									type: "function",
									function: {
										name: toolCall.function.name,
										arguments: toolCall.function.arguments
									}
								}));
								emit(encoderChunk({
									id,
									object: "chat.completion.chunk",
									created: Math.floor(Date.now() / 1e3),
									model: `${pID}/${mID}`,
									choices: [{
										index: 0,
										delta: { tool_calls: toolCallDeltas },
										finish_reason: null
									}]
								}));
							}
							for (const tail of finalizeStream(finalStreamedToolCalls)) emit(tail);
							if (keepaliveTimer) {
								clearInterval(keepaliveTimer);
								keepaliveTimer = null;
							}
						};
						return sseResponse(runStream);
					}
					let content = "";
					let reasoning = "";
					let assistantError = null;
					for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt += 1) {
						if (attempt > 1) {
							try {
								await client.sessionDelete(sessionId);
							} catch (e) {
								logDebug("Failed to delete retried session", {
									sessionId,
									error: e.message
								});
							}
							sessionId = await createSession(toolControl);
							promptParams.path.id = sessionId;
							requestForcedChatToolCall = makeForcedChatToolCallRequester();
							await sleep(RETRY_BACKOFF_BASE_MS * attempt);
						}
						await promptWithTimeout(promptParams, REQUEST_TIMEOUT_MS);
						const collected = await pollForAssistantResponse(sessionId, REQUEST_TIMEOUT_MS);
						content = collected.content || "";
						reasoning = collected.reasoning || "";
						assistantError = collected.error || null;
						if (assistantError && !content && !reasoning && attempt < RETRY_MAX_ATTEMPTS && isTransientUpstreamError(assistantError)) {
							console.warn(`[Local] Transient upstream error (attempt ${attempt}/${RETRY_MAX_ATTEMPTS}), retrying:`, assistantError.data?.message || assistantError.message || assistantError.name || "unknown");
							continue;
						}
						break;
					}
					if (assistantError && !content && !reasoning) return jsonResponse({ error: {
						message: assistantError.data?.message || assistantError.message || "OpenCode provider error",
						type: assistantError.name || "OpenCodeError"
					} }, 502);
					let parsedToolCalls = externalToolRegistry.length > 0 ? parseExternalToolCallsFromText(externalToolRegistry, reasoning, content) : [];
					if (parsedToolCalls.length === 0 && externalToolChoice.mode === "required") {
						const forcedResponse = await requestForcedChatToolCall();
						if (forcedResponse) {
							content = forcedResponse.content || content;
							reasoning = forcedResponse.reasoning || reasoning;
							parsedToolCalls = parseExternalToolCallsFromText(externalToolRegistry, reasoning, content);
						}
					}
					const { validCalls: validatedToolCalls } = finalizeValidatedToolCalls(parsedToolCalls, externalToolRegistry);
					const safeContent = stripFunctionCallMarkup(stripFunctionCalls(content));
					const safeReasoning = stripFunctionCallMarkup(stripFunctionCalls(reasoning));
					const promptTokens = Math.ceil((fullPromptText || "").length / 4);
					const completionTokensCalc = Math.ceil((content || "").length / 4);
					const reasoningTokensCalc = Math.ceil((reasoning || "").length / 4);
					const totalTokens = promptTokens + completionTokensCalc + reasoningTokensCalc;
					const publicValidatedToolCalls = toPublicToolCalls(validatedToolCalls);
					const assistantMessage = {
						role: "assistant",
						content: publicValidatedToolCalls.length > 0 ? safeContent || null : safeContent,
						...safeReasoning ? { reasoning_content: safeReasoning } : {}
					};
					if (publicValidatedToolCalls.length > 0) assistantMessage.tool_calls = publicValidatedToolCalls;
					return jsonResponse({
						id: `chatcmpl-${crypto.randomUUID()}`,
						object: "chat.completion",
						created: Math.floor(Date.now() / 1e3),
						model: `${pID}/${mID}`,
						choices: [{
							index: 0,
							message: assistantMessage,
							finish_reason: publicValidatedToolCalls.length > 0 ? "tool_calls" : "stop"
						}],
						usage: {
							prompt_tokens: promptTokens,
							completion_tokens: completionTokensCalc + reasoningTokensCalc,
							total_tokens: totalTokens,
							completion_tokens_details: { reasoning_tokens: reasoningTokensCalc }
						}
					});
				} catch (error) {
					console.error("[Local] API Error:", error.message);
					if (sessionId) try {
						await client.sessionDelete(sessionId);
					} catch (e) {
						console.error("[Local] Failed to cleanup session on error:", e.message);
					}
					return errorResponse(transformUpstreamError(error));
				}
			}, REQUEST_TIMEOUT_MS + 2e4);
		} catch (error) {
			console.error("[Local] Request Handler Error:", error.message);
			return jsonResponse({ error: {
				message: error.message,
				type: error.constructor?.name ?? "Error"
			} }, 500);
		}
	}
	async function handleResponses(body, requestStream) {
		try {
			const { model, input, reasoning_effort, reasoning: requestReasoning, max_output_tokens, tools = [], tool_choice, instructions, temperature, top_p, stream = false, messages: chatMessages, prompt, previous_response_id: previousResponseId, opencode: requestOpencodeConfig } = body ?? {};
			const previousState = previousResponseId ? getResponseState(previousResponseId) : null;
			if (previousResponseId && !previousState) return jsonResponse({ error: { message: "Invalid or expired previous_response_id" } }, 400);
			const reasoningLevel = normalizeReasoningEffort(reasoning_effort || requestReasoning?.effort, null);
			const requestToolContext = createRequestToolContext(tools, tool_choice, requestOpencodeConfig);
			const toolMode = requestToolContext.mode;
			const internalToolContext = requestToolContext.internal;
			trackToolMode(toolMode);
			const externalToolContext = requestToolContext.external;
			const externalToolRegistry = externalToolContext.registry;
			const externalToolChoice = externalToolContext.toolChoice;
			const assistantToolCalls = /* @__PURE__ */ new Map();
			const rememberAssistantToolCall = (toolCallId, toolName) => {
				if (!toolCallId || !toolName) return;
				assistantToolCalls.set(toolCallId, toolName);
			};
			const buildResponsesToolResultLine = (item = {}) => {
				const text = item?.content ?? item?.output ?? item?.result ?? item?.text;
				const normalizedText = typeof text === "string" ? text : text ? JSON.stringify(text) : "";
				if (!normalizedText) return null;
				const toolName = (findExternalToolByName(externalToolRegistry, item?.name) || findExternalToolByName(externalToolRegistry, assistantToolCalls.get(item?.call_id || item?.tool_call_id)))?.namespacedName || assistantToolCalls.get(item?.call_id || item?.tool_call_id) || item?.name || `external__unknown`;
				const toolCallId = item?.call_id || item?.tool_call_id || `call_${toolName.replace(/[^a-zA-Z0-9_]/g, "_")}`;
				rememberAssistantToolCall(toolCallId, toolName);
				return `TOOL_RESULT: ${JSON.stringify({
					tool_call_id: toolCallId,
					name: toolName,
					content: normalizedText
				})}`;
			};
			const buildResponsesAssistantToolCallsLine = (item = {}) => {
				const sourceCalls = Array.isArray(item?.tool_calls) ? item.tool_calls : item?.type === "function_call" ? [item] : [];
				if (!sourceCalls.length) return null;
				const serializedToolCalls = sourceCalls.map((toolCall, index) => {
					const rawName = toolCall?.function?.name || toolCall?.name;
					const namespacedName = findExternalToolByName(externalToolRegistry, rawName)?.namespacedName || rawName;
					if (!namespacedName) return null;
					const toolCallId = toolCall?.call_id || toolCall?.id || `call_${index + 1}`;
					rememberAssistantToolCall(toolCallId, namespacedName);
					return {
						id: toolCallId,
						name: namespacedName,
						arguments: normalizeToolArguments(toolCall?.arguments ?? toolCall?.function?.arguments)
					};
				}).filter(Boolean);
				if (!serializedToolCalls.length) return null;
				return `ASSISTANT: <function_calls>${JSON.stringify(serializedToolCalls)}</function_calls>`;
			};
			const buildResponsesInputMessages = (rawItems) => {
				const normalized = [];
				if (!Array.isArray(rawItems)) return normalized;
				for (const item of rawItems) {
					if (!item) continue;
					if (item.type === "function_call_output" || item.type === "tool_result" || item.role === "tool") {
						const toolResultLine = buildResponsesToolResultLine(item);
						if (toolResultLine) normalized.push({
							role: "tool",
							content: toolResultLine
						});
						continue;
					}
					if (item.type === "function_call") {
						const assistantToolCallsLine = buildResponsesAssistantToolCallsLine(item);
						if (assistantToolCallsLine) normalized.push({
							role: "assistant",
							content: assistantToolCallsLine,
							isToolCalls: true
						});
						continue;
					}
					if (item.role === "assistant" && Array.isArray(item?.tool_calls) && item.tool_calls.length) {
						const assistantToolCallsLine = buildResponsesAssistantToolCallsLine(item);
						if (assistantToolCallsLine) normalized.push({
							role: "assistant",
							content: assistantToolCallsLine,
							isToolCalls: true
						});
					}
					if (item.type === "message") {
						const role = item.role || "user";
						const content = normalizeTextContent(item.content);
						if (content) normalized.push({
							role,
							content
						});
						continue;
					}
					if (item.type === "input_text") {
						if (item.text) normalized.push({
							role: "user",
							content: item.text
						});
						continue;
					}
					const text = normalizeTextContent(item.content || item.text);
					if (text) normalized.push({
						role: item.role || "user",
						content: text
					});
				}
				return normalized;
			};
			let messages = [];
			if (Array.isArray(chatMessages) && chatMessages.length) messages = buildResponsesInputMessages(chatMessages);
			else if (typeof prompt === "string" && prompt.trim()) messages = [{
				role: "user",
				content: prompt
			}];
			else if (typeof input === "string") messages = [{
				role: "user",
				content: input
			}];
			else if (Array.isArray(input)) messages = buildResponsesInputMessages(input);
			else if (input && typeof input === "object") {
				if (input.type === "message" || input.type === "function_call" || input.type === "function_call_output" || input.type === "tool_result") messages = buildResponsesInputMessages([input]);
				else {
					const content = normalizeTextContent(input.content || input.text);
					if (content) messages = [{
						role: input.role || "user",
						content
					}];
				}
			}
			if (!messages.length) return jsonResponse({ error: { message: "input is required" } }, 400);
			const resolvedModel = await resolveRequestedModel(model || previousState?.model);
			const pID = resolvedModel.providerID;
			const mID = resolvedModel.modelID;
			await ensureBackendOnce();
			try {
				await client.configUpdate({ activeModel: {
					providerID: pID,
					modelID: mID
				} });
			} catch {}
			const toolControl = await resolveToolControl(toolMode, internalToolContext);
			let sessionId = previousState?.sessionId || null;
			if (!sessionId) sessionId = await createSession(toolControl);
			const parts = [];
			const systemChunks = [];
			let fullPromptText = "";
			const formatResponsesRoleLine = (role, text) => `${String(role || "user").toUpperCase()}: ${text}`;
			for (const msg of messages) {
				if (msg.role === "system") {
					if (msg.content) systemChunks.push(msg.content);
					continue;
				}
				if (!msg.content) continue;
				const text = msg.role === "tool" || String(msg.content).startsWith("ASSISTANT: ") || String(msg.content).startsWith("TOOL_RESULT: ") ? msg.content : msg.role === "user" ? msg.content : formatResponsesRoleLine(msg.role, msg.content);
				parts.push({
					type: "text",
					text
				});
				fullPromptText += `${text}\n\n`;
			}
			const systemWithGuard = buildSystemPrompt([
				instructions,
				...systemChunks,
				externalToolContext.prompt
			].filter(Boolean).join("\n\n"), reasoningLevel, toolMode, internalToolContext.allowedToolNames);
			const requestForcedResponsesToolCall = createForcedToolCallRequester({
				mode: externalToolChoice.mode,
				sessionId,
				systemWithGuard,
				requiredTool: externalToolChoice.requiredTool || externalToolRegistry[0]?.namespacedName,
				providerID: pID,
				modelID: mID,
				toolOverrides: toolControl.toolOverrides,
				requestTimeoutMs: REQUEST_TIMEOUT_MS,
				forbidThinkBlock: false
			});
			const promptParams = {
				path: { id: sessionId },
				body: {
					model: {
						providerID: pID,
						modelID: mID
					},
					...systemWithGuard ? { system: systemWithGuard } : {},
					parts: externalToolContext.reminder ? [...parts, {
						type: "text",
						text: externalToolContext.reminder
					}] : parts,
					...max_output_tokens && { max_tokens: max_output_tokens },
					...temperature !== void 0 && { temperature },
					...top_p !== void 0 && { top_p }
				}
			};
			const { toolOverrides } = toolControl;
			if (toolOverrides && Object.keys(toolOverrides).length > 0) promptParams.body.tools = toolOverrides;
			let content = "";
			let reasoning = "";
			const buildResponsesFunctionCallOutputItem = (toolCall) => ({
				id: toolCall.id,
				type: "function_call",
				status: "completed",
				call_id: toolCall.id,
				name: toolCall.function.name,
				arguments: toolCall.function.arguments
			});
			const buildResponsesMessageOutputItem = (text) => {
				if (!text) return null;
				return {
					type: "message",
					role: "assistant",
					status: "completed",
					content: [{
						type: "output_text",
						text
					}]
				};
			};
			if (requestStream || stream) {
				const responseId = `resp_${crypto.randomUUID()}`;
				const messageOutputIndex = 0;
				const reasoningOutputIndex = 1;
				const contentIndex = 0;
				const outputItemId = `msg_${crypto.randomUUID()}`;
				const reasoningItemId = "reasoning-0";
				let nextOutputIndex = 2;
				let sequenceNumber = 0;
				let announcedOutput = false;
				let announcedContent = false;
				let announcedReasoning = false;
				const nextSeq = () => sequenceNumber++;
				let sink = null;
				const emit = (payload) => sink?.(`data: ${JSON.stringify(payload)}\n\n`);
				emit({
					type: "response.created",
					sequence_number: nextSeq(),
					response: {
						id: responseId,
						object: "response",
						created: Math.floor(Date.now() / 1e3),
						model: `${pID}/${mID}`
					}
				});
				const shouldStripStreamingToolMarkup = externalToolRegistry.length > 0;
				const filterContentDelta = createToolCallFilter({
					disableTools: DISABLE_TOOLS,
					forceStrip: shouldStripStreamingToolMarkup
				});
				const filterReasoningDelta = createToolCallFilter({
					disableTools: DISABLE_TOOLS,
					forceStrip: shouldStripStreamingToolMarkup
				});
				const parseContentToolCalls = createExternalToolCallStreamParser(externalToolRegistry);
				const parseReasoningToolCalls = createExternalToolCallStreamParser(externalToolRegistry);
				const streamedToolCalls = [];
				let rawContent = "";
				let rawReasoning = "";
				const ensureOutputScaffold = () => {
					if (!announcedOutput) {
						emit({
							type: "response.output_item.added",
							sequence_number: nextSeq(),
							output_index: messageOutputIndex,
							item: {
								id: outputItemId,
								type: "message",
								status: "in_progress",
								role: "assistant",
								content: []
							}
						});
						announcedOutput = true;
					}
					if (!announcedContent) {
						emit({
							type: "response.content_part.added",
							sequence_number: nextSeq(),
							output_index: messageOutputIndex,
							content_index: contentIndex,
							item_id: outputItemId,
							part: {
								type: "output_text",
								text: ""
							}
						});
						announcedContent = true;
					}
				};
				const ensureReasoningScaffold = () => {
					if (!announcedReasoning) {
						emit({
							type: "response.output_item.added",
							sequence_number: nextSeq(),
							output_index: reasoningOutputIndex,
							item: {
								id: reasoningItemId,
								type: "reasoning",
								status: "in_progress",
								summary: [{
									type: "summary_text",
									text: ""
								}]
							}
						});
						announcedReasoning = true;
					}
				};
				const emitResponsesFunctionCall = (toolCall) => {
					const outputIndex = nextOutputIndex++;
					const functionCallItem = buildResponsesFunctionCallOutputItem(toolCall);
					streamedToolCalls.push(toolCall);
					emit({
						type: "response.output_item.added",
						sequence_number: nextSeq(),
						output_index: outputIndex,
						item: {
							...functionCallItem,
							status: "in_progress"
						}
					});
					emit({
						type: "response.function_call_arguments.delta",
						sequence_number: nextSeq(),
						output_index: outputIndex,
						item_id: toolCall.id,
						delta: toolCall.function.arguments
					});
					emit({
						type: "response.function_call_arguments.done",
						sequence_number: nextSeq(),
						output_index: outputIndex,
						item_id: toolCall.id,
						arguments: toolCall.function.arguments
					});
					emit({
						type: "response.output_item.done",
						sequence_number: nextSeq(),
						output_index: outputIndex,
						item: functionCallItem
					});
				};
				const sendResponsesDelta = (delta, isReasoning = false) => {
					if (!delta) return;
					if (isReasoning) rawReasoning += delta;
					else rawContent += delta;
					const parsedDeltaToolCalls = isReasoning ? parseReasoningToolCalls(delta) : parseContentToolCalls(delta);
					if (parsedDeltaToolCalls.length > 0) {
						const { validCalls: allowedDeltaToolCalls } = finalizeValidatedToolCalls(parsedDeltaToolCalls, externalToolRegistry);
						allowedDeltaToolCalls.forEach((toolCall) => emitResponsesFunctionCall(toolCall));
					}
					const filtered = isReasoning ? filterReasoningDelta(delta) : filterContentDelta(delta);
					if (!filtered) return;
					if (isReasoning) {
						ensureReasoningScaffold();
						reasoning += filtered;
						emit({
							type: "response.reasoning_summary_text.delta",
							sequence_number: nextSeq(),
							output_index: reasoningOutputIndex,
							item_id: reasoningItemId,
							summary_index: 0,
							delta: filtered
						});
					} else {
						if (!filtered.trim()) {
							content += filtered;
							return;
						}
						ensureOutputScaffold();
						content += filtered;
						emit({
							type: "response.output_text.delta",
							sequence_number: nextSeq(),
							output_index: messageOutputIndex,
							content_index: contentIndex,
							item_id: outputItemId,
							delta: filtered
						});
					}
				};
				const responsesStreamBody = async () => {
					let collected = null;
					try {
						const safeCollect = collectFromEvents(sessionId, REQUEST_TIMEOUT_MS, sendResponsesDelta, EVENT_FIRST_DELTA_TIMEOUT_MS, EVENT_IDLE_TIMEOUT_MS).catch((err) => ({ __error: err }));
						client.sessionPrompt(promptParams.path.id, promptParams.body).catch((err) => logDebug("Responses prompt error:", err.message));
						collected = await safeCollect;
					} catch (e) {
						collected = { __error: e };
					}
					if (!content && !reasoning) {
						const polled = await pollForAssistantResponse(sessionId, REQUEST_TIMEOUT_MS);
						if (polled.error && !polled.content && !polled.reasoning) throw polled.error;
						if (polled.reasoning) sendResponsesDelta(polled.reasoning, true);
						if (polled.content) sendResponsesDelta(polled.content, false);
					} else if (collected && collected.idleTimeout) {
						const polled = await pollForAssistantResponse(sessionId, REQUEST_TIMEOUT_MS);
						const remainingReasoning = polled.reasoning && polled.reasoning.startsWith(rawReasoning) ? polled.reasoning.slice(rawReasoning.length) : polled.reasoning;
						const remainingContent = polled.content && polled.content.startsWith(rawContent) ? polled.content.slice(rawContent.length) : polled.content;
						if (remainingReasoning) sendResponsesDelta(remainingReasoning, true);
						if (remainingContent) sendResponsesDelta(remainingContent, false);
					} else if (collected && (collected.content || collected.reasoning)) {
						if (!reasoning && collected.reasoning) sendResponsesDelta(collected.reasoning, true);
						if (!content && collected.content) sendResponsesDelta(collected.content, false);
					}
					if (announcedReasoning) {
						emit({
							type: "response.reasoning_summary_text.done",
							sequence_number: nextSeq(),
							output_index: reasoningOutputIndex,
							item_id: reasoningItemId,
							summary_index: 0,
							text: reasoning
						});
						emit({
							type: "response.output_item.done",
							sequence_number: nextSeq(),
							output_index: reasoningOutputIndex,
							item: {
								id: reasoningItemId,
								type: "reasoning",
								status: "completed",
								summary: [{
									type: "summary_text",
									text: reasoning
								}]
							}
						});
					}
					const hasMeaningfulContent = Boolean(content && content.trim());
					if (announcedContent && hasMeaningfulContent) {
						emit({
							type: "response.output_text.done",
							sequence_number: nextSeq(),
							output_index: messageOutputIndex,
							content_index: contentIndex,
							item_id: outputItemId,
							text: content
						});
						emit({
							type: "response.content_part.done",
							sequence_number: nextSeq(),
							output_index: messageOutputIndex,
							content_index: contentIndex,
							item_id: outputItemId,
							part: {
								type: "output_text",
								text: content
							}
						});
						emit({
							type: "response.output_item.done",
							sequence_number: nextSeq(),
							output_index: messageOutputIndex,
							item: {
								id: outputItemId,
								type: "message",
								status: "completed",
								role: "assistant",
								content: [{
									type: "output_text",
									text: content
								}]
							}
						});
					}
					let polledForToolCalls = null;
					if (externalToolRegistry.length > 0 && streamedToolCalls.length === 0) try {
						polledForToolCalls = await pollForAssistantResponse(sessionId, REQUEST_TIMEOUT_MS);
					} catch {}
					const flushedReasoningCalls = parseReasoningToolCalls.flush ? parseReasoningToolCalls.flush() : [];
					const flushedContentCalls = parseContentToolCalls.flush ? parseContentToolCalls.flush() : [];
					const flushedReasoningText = filterReasoningDelta.flush ? filterReasoningDelta.flush() : "";
					const flushedContentText = filterContentDelta.flush ? filterContentDelta.flush() : "";
					const finalReasoningText = (polledForToolCalls?.reasoning || rawReasoning) + flushedReasoningText;
					const finalContentText = (polledForToolCalls?.content || rawContent) + flushedContentText;
					const parseStreamedToolCalls = () => {
						if (externalToolRegistry.length === 0) return [];
						const perChannel = [
							...flushedReasoningCalls,
							...flushedContentCalls,
							...parseExternalToolCallsFromText(externalToolRegistry, finalReasoningText, finalContentText)
						];
						if (perChannel.length > 0) return perChannel;
						return parseExternalToolCallsFromText(externalToolRegistry, finalReasoningText + finalContentText);
					};
					let parsedToolCalls = streamedToolCalls.length > 0 ? streamedToolCalls : parseStreamedToolCalls();
					if (parsedToolCalls.length === 0 && externalToolChoice.mode === "required") {
						const forcedResponse = await requestForcedResponsesToolCall();
						if (forcedResponse) parsedToolCalls = parseExternalToolCallsFromText(externalToolRegistry, forcedResponse.reasoning, forcedResponse.content);
					}
					const { validCalls: validatedStreamedToolCalls } = finalizeValidatedToolCalls(parsedToolCalls, externalToolRegistry);
					const safeContent = stripFunctionCallMarkup(stripFunctionCalls(content));
					const safeReasoning = stripFunctionCallMarkup(stripFunctionCalls(reasoning));
					if (streamedToolCalls.length === 0) validatedStreamedToolCalls.forEach((toolCall) => {
						emitResponsesFunctionCall(toolCall);
					});
					const streamOutput = [];
					const streamMessageOutputItem = buildResponsesMessageOutputItem(safeContent && safeContent.trim() ? safeContent : "");
					if (streamMessageOutputItem) streamOutput.push(streamMessageOutputItem);
					validatedStreamedToolCalls.forEach((toolCall) => {
						streamOutput.push(buildResponsesFunctionCallOutputItem(toolCall));
					});
					const promptTokens = Math.ceil(fullPromptText.length / 4);
					const completionTokens = Math.ceil(content.length / 4);
					const reasoningTokens = Math.ceil(reasoning.length / 4);
					const response = {
						id: responseId,
						object: "response",
						created: Math.floor(Date.now() / 1e3),
						model: `${pID}/${mID}`,
						reasoning: safeReasoning ? {
							effort: reasoningLevel,
							summary: safeReasoning.substring(0, 100)
						} : void 0,
						output: streamOutput,
						usage: {
							input_tokens: promptTokens,
							output_tokens: completionTokens + reasoningTokens,
							total_tokens: promptTokens + completionTokens + reasoningTokens,
							input_tokens_details: { cached_tokens: 0 },
							output_tokens_details: { reasoning_tokens: reasoningTokens }
						}
					};
					emit({
						type: "response.completed",
						sequence_number: nextSeq(),
						response
					});
					sink?.("data: [DONE]\n\n");
					storeResponseState(responseId, sessionId, `${pID}/${mID}`);
				};
				try {
					return sseResponse(async (emitOuter) => {
						sink = emitOuter;
						try {
							await responsesStreamBody();
						} catch (error) {
							console.error("[Local] Responses API Error:", error?.message || error?.name || error);
							emit({
								type: "response.failed",
								response: { error: transformUpstreamError(error).error }
							});
							sink?.("data: [DONE]\n\n");
						}
					});
				} catch (error) {
					return errorResponse(transformUpstreamError(error));
				}
			}
			const responseRes = await client.sessionPrompt(promptParams.path.id, promptParams.body);
			const responseParts = responseRes.data?.parts || [];
			const promptContent = responseParts.filter((p) => p.type === "text").map((p) => p.text).join("\n");
			const promptReasoning = responseParts.filter((p) => p.type === "reasoning").map((p) => p.text).join("\n");
			let promptBasedToolCalls = externalToolRegistry.length > 0 ? parseExternalToolCallsFromText(externalToolRegistry, promptReasoning, promptContent) : [];
			content = promptBasedToolCalls.length > 0 ? "" : promptContent;
			reasoning = promptReasoning;
			if (!promptContent && !promptReasoning) {
				const polledResponse = await pollForAssistantResponse(sessionId, REQUEST_TIMEOUT_MS);
				if (polledResponse.error && !polledResponse.content && !polledResponse.reasoning) throw polledResponse.error;
				content = polledResponse.content || content;
				reasoning = polledResponse.reasoning || reasoning;
				promptBasedToolCalls = externalToolRegistry.length > 0 ? parseExternalToolCallsFromText(externalToolRegistry, reasoning, content) : [];
			}
			if (!content && !reasoning && responseRes.data && promptBasedToolCalls.length === 0) {
				const data = responseRes.data;
				content = typeof data === "string" ? data : data?.message || JSON.stringify(data);
			}
			let parsedToolCalls = promptBasedToolCalls.length > 0 ? promptBasedToolCalls : externalToolRegistry.length > 0 ? parseExternalToolCallsFromText(externalToolRegistry, reasoning, content) : [];
			if (parsedToolCalls.length === 0 && externalToolChoice.mode === "required") {
				const forcedResponse = await requestForcedResponsesToolCall();
				if (forcedResponse) {
					content = forcedResponse.content || content;
					reasoning = forcedResponse.reasoning || reasoning;
					parsedToolCalls = parseExternalToolCallsFromText(externalToolRegistry, reasoning, content);
				}
			}
			const { validCalls: validatedToolCalls } = finalizeValidatedToolCalls(parsedToolCalls, externalToolRegistry);
			const safeContent = stripFunctionCallMarkup(stripFunctionCalls(content));
			const safeReasoning = stripFunctionCallMarkup(stripFunctionCalls(reasoning));
			const promptTokens = Math.ceil(fullPromptText.length / 4);
			const completionTokens = Math.ceil(content.length / 4);
			const reasoningTokens = Math.ceil(reasoning.length / 4);
			const output = [];
			const messageOutputItem = buildResponsesMessageOutputItem(safeContent);
			if (messageOutputItem) output.push(messageOutputItem);
			validatedToolCalls.forEach((toolCall) => {
				output.push(buildResponsesFunctionCallOutputItem(toolCall));
			});
			const responseId = `resp_${crypto.randomUUID()}`;
			const response = {
				id: responseId,
				object: "response",
				created: Math.floor(Date.now() / 1e3),
				model: `${pID}/${mID}`,
				reasoning: safeReasoning ? {
					effort: reasoningLevel,
					summary: safeReasoning.substring(0, 100)
				} : void 0,
				output,
				usage: {
					input_tokens: promptTokens,
					output_tokens: completionTokens + reasoningTokens,
					total_tokens: promptTokens + completionTokens + reasoningTokens,
					input_tokens_details: { cached_tokens: 0 },
					output_tokens_details: { reasoning_tokens: reasoningTokens }
				}
			};
			storeResponseState(responseId, sessionId, `${pID}/${mID}`);
			return jsonResponse(response);
		} catch (error) {
			console.error("[Local] Responses API Error:", error?.message || error?.data?.message || error?.name || error);
			return errorResponse(transformUpstreamError(error));
		}
	}
	return {
		id: config.id,
		async listModels() {
			try {
				return buildModelsList(await getProvidersList()).map((m) => m.id);
			} catch (error) {
				console.error("[Local] Model Fetch Error:", error.message);
				return ["opencode/big-pickle"];
			}
		},
		handleChat,
		handleResponses,
		healthDetails() {
			return {
				status: "ok",
				proxy: true,
				upstream: config.id,
				backend: serverUrl,
				internal_tools: {
					config: {
						allowed_tools: SERVER_INTERNAL_ALLOWED_TOOL_NAMES,
						discovery_fixture: []
					},
					metrics: { ...internalToolMetrics },
					cache: {
						tool_ids_cached: !!cachedToolIds,
						tool_id_count: cachedToolIds ? cachedToolIds.length : 0,
						age_ms: cachedToolIdsAt ? Date.now() - cachedToolIdsAt : null
					}
				}
			};
		},
		metricsText() {
			return `${[
				"# HELP opencode_internal_tool_mode_requests_total Count of internal tool mode selections by mode.",
				"# TYPE opencode_internal_tool_mode_requests_total counter",
				`opencode_internal_tool_mode_requests_total{mode="external_bridge"} ${internalToolMetrics.externalBridgeRequests}`,
				`opencode_internal_tool_mode_requests_total{mode="internal_allowlist"} ${internalToolMetrics.internalAllowlistRequests}`,
				`opencode_internal_tool_mode_requests_total{mode="disabled"} ${internalToolMetrics.disabledRequests}`,
				`# HELP opencode_internal_tool_discovery_failures_total Count of backend tool discovery failures.`,
				`# TYPE opencode_internal_tool_discovery_failures_total counter`,
				`opencode_internal_tool_discovery_failures_total ${internalToolMetrics.discoveryFailures}`,
				`# HELP opencode_internal_tool_fallback_disabled_total Count of allowlist resolutions that fell back to disabled.`,
				`# TYPE opencode_internal_tool_fallback_disabled_total counter`,
				`opencode_internal_tool_fallback_disabled_total ${internalToolMetrics.fallbackToDisabled}`,
				`# HELP opencode_internal_tool_cache_ids Number of cached backend tool IDs.`,
				`# TYPE opencode_internal_tool_cache_ids gauge`,
				`opencode_internal_tool_cache_ids ${cachedToolIds ? cachedToolIds.length : 0}`
			].join("\n")}\n`;
		},
		async warmup() {
			await ensureBackendOnce();
		},
		killBackend() {
			killBackendFor(serverUrl);
		}
	};
}
function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...JSON_HEADERS$1,
			...CORS
		}
	});
}
/**
* Push-based SSE response. The OpenCode event stream delivers deltas from async
* callbacks, so the response body must be enqueued directly (Express res.write
* semantics) instead of pulled from a generator.
*/
function sseResponse(run) {
	const encoder = new TextEncoder();
	const body = new ReadableStream({ start(controller) {
		const emit = (frame) => {
			try {
				controller.enqueue(encoder.encode(frame));
			} catch {}
		};
		run(emit).catch((error) => {
			try {
				emit(`data: ${JSON.stringify({ error: { message: error?.message ?? "stream error" } })}\n\n`);
			} catch {}
		}).finally(() => {
			try {
				controller.close();
			} catch {}
		});
	} });
	return new Response(body, {
		status: 200,
		headers: {
			...SSE_HEADERS,
			...CORS
		}
	});
}
//#endregion
//#region src/local/loopback.ts
/**
* A loopback HTTP listener that exposes an in-process {@link LocalProxy} over
* fetch, so a pi-ai route can treat the proxy as an OpenAI-compatible
* endpoint.
*
* pi-ai's transport does real HTTP against a URL; the proxy's handlers are
* plain functions. This bridges the two the same way the gateway's own
* `standalone.ts` does — request body buffered into a fetch `Request`, the
* response streamed back out — with one addition: a mid-stream upstream drop
* after the headers are flushed must destroy the socket instead of throwing
* `ERR_HTTP_HEADERS_SENT` into the server's callback, or a stray error kills
* the host process.
*
* @module dsh-opencode-gateway/loopback
*/
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: JSON_HEADERS
	});
}
/**
* Start the loopback listener.
* @param options - port plus the in-process handlers to serve.
* @returns the running server.
* @throws the listen error (e.g. `EADDRINUSE`) after a diagnostic log line.
*/
function startLoopbackServer(options) {
	const hostname = options.hostname ?? "127.0.0.1";
	const server = createServer(async (request, response) => {
		try {
			const url = new URL(`http://${request.headers.host ?? `${hostname}:${options.port}`}${request.url ?? "/"}`);
			let webResponse;
			if (request.method === "GET" && (url.pathname === "/v1/models" || url.pathname === "/models")) webResponse = json({
				object: "list",
				data: (await options.listModels().catch(() => [])).map((id) => ({
					id,
					object: "model",
					name: id
				}))
			});
			else if (request.method === "GET" && url.pathname === "/health") webResponse = json({ status: "ok" });
			else if (request.method === "POST" && (url.pathname === "/v1/chat/completions" || url.pathname === "/chat/completions")) {
				const body = await readBody(request);
				webResponse = await options.handleChat(body, Boolean(body?.stream));
			} else if (request.method === "POST" && (url.pathname === "/v1/responses" || url.pathname === "/responses")) {
				const body = await readBody(request);
				webResponse = await options.handleResponses(body, Boolean(body?.stream));
			} else webResponse = json({ error: { message: `No handler for ${request.method} ${url.pathname}` } }, 404);
			response.statusCode = webResponse.status;
			webResponse.headers.forEach((value, key) => {
				if (key === "transfer-encoding" || key === "connection" || key === "keep-alive") return;
				response.setHeader(key, value);
			});
			if (webResponse.body) {
				const reader = webResponse.body.getReader();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					response.write(Buffer.from(value));
				}
			}
			response.end();
		} catch (error) {
			if (response.headersSent) {
				response.destroy(error instanceof Error ? error : void 0);
				return;
			}
			response.statusCode = 500;
			response.setHeader("content-type", "application/json; charset=utf-8");
			response.end(JSON.stringify({ error: { message: error?.message ?? "server error" } }));
		}
	});
	return new Promise((resolvePromise, rejectPromise) => {
		server.once("error", (error) => {
			if (error?.code === "EADDRINUSE") console.error(`opencode-gateway: loopback port ${options.port} is already in use; set "free.proxyPort" in the plugin config`);
			rejectPromise(error);
		});
		server.listen(options.port, hostname, () => {
			const address = server.address();
			const boundPort = typeof address === "object" && address !== null ? address.port : options.port;
			server.unref();
			resolvePromise({
				port: boundPort,
				close: () => new Promise((resolveClose) => {
					server.close(() => resolveClose());
				})
			});
		});
	});
}
async function readBody(request) {
	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	if (chunks.length === 0) return void 0;
	const text = Buffer.concat(chunks).toString("utf8");
	try {
		return JSON.parse(text);
	} catch {
		const error = /* @__PURE__ */ new Error("request body is not valid JSON");
		error.statusCode = 400;
		throw error;
	}
}
//#endregion
//#region src/free-listing.ts
/**
* The free route's candidate listing, taken from opencode's own answer.
*
* The card cannot use the local backend's provider config for this. That view
* is CREDENTIALED: with `OPENCODE_API_KEY` set, the backend's `opencode`
* provider reports the paid catalog alongside the free one (measured: 84 models
* of which 10 are cost-zero), so filtering it by `cost` produced a set that
* disagreed with what opencode itself shows — it missed free models the
* credentialed view does not carry at all and kept region-blocked ones it does.
*
* `opencode models` answers the free tier exactly when that key is absent, and
* the `opencode/` prefix separates it from the `opencode-go/` subscription
* line. The command is the same one the CLI's own model list comes from, so
* the card and the CLI agree by construction.
*
* @module dsh-opencode-gateway/free-listing
*/
/** Longest one `opencode models` run may take before it is killed. */
const COMMAND_TIMEOUT_MS = 3e4;
/**
* How long one answer is reused. The free tier changes on the order of days,
* and the route polls its listing every minute, so an uncached call would spawn
* a process 60 times an hour.
*/
const DEFAULT_CACHE_TTL_MS = 6e5;
/** Provider prefix the free tier is listed under (the subscription line is `opencode-go/`). */
const FREE_LISTING_PREFIX = "opencode/";
/** One cached answer, shared by every call in this process. */
let cache;
/** Drop the cached answer (tests, and any explicit refresh that wants a re-read). */
function resetFreeListingCache() {
	cache = void 0;
}
/**
* The free tier's model ids, as opencode reports them.
*
* A failed run falls back to the last good answer rather than to an empty
* list, so a transient spawn failure cannot make the card look like the free
* tier vanished.
* @param options - executable path plus test seams.
* @returns `opencode/<id>` entries; empty only when nothing ever answered.
*/
async function listFreeModels(options) {
	const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
	const now = options.now ?? Date.now;
	if (cache !== void 0 && now() - cache.at < ttl) return cache.ids;
	const run = options.runCommand ?? runOpencodeModels;
	try {
		const ids = parseFreeModelIds(await run(options.opencodePath));
		cache = {
			at: now(),
			ids
		};
		return ids;
	} catch {
		return cache?.ids ?? [];
	}
}
/**
* Reduce `opencode models` output to the free tier's ids.
*
* The command prints one `provider/model` per line; everything outside the
* `opencode/` prefix belongs to another provider (the `opencode-go/`
* subscription line in particular) and is not part of the free tier.
* @param stdout - the command's standard output.
* @returns unique `opencode/<id>` entries in the order printed.
*/
function parseFreeModelIds(stdout) {
	const seen = /* @__PURE__ */ new Set();
	const ids = [];
	for (const rawLine of stdout.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line.startsWith(FREE_LISTING_PREFIX)) continue;
		if (seen.has(line)) continue;
		seen.add(line);
		ids.push(line);
	}
	return ids;
}
/** Run `opencode models` once and return its stdout. */
function runOpencodeModels(opencodePath) {
	return new Promise((resolve, reject) => {
		const env = { ...process.env };
		delete env.OPENCODE_API_KEY;
		delete env.OPENCODE_ZEN_API_KEY;
		const extension = /\.([a-z0-9]+)$/i.exec(opencodePath)?.[1]?.toLowerCase();
		const useShell = extension === "cmd" || extension === "bat" || process.platform === "win32" && extension === void 0;
		let child;
		try {
			child = spawn(opencodePath, ["models"], {
				env,
				stdio: [
					"ignore",
					"pipe",
					"pipe"
				],
				shell: useShell,
				windowsHide: true
			});
		} catch (error) {
			reject(error);
			return;
		}
		let stdout = "";
		let stderr = "";
		let settled = false;
		const finish = (action) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			action();
		};
		const timer = setTimeout(() => {
			finish(() => {
				try {
					child.kill();
				} catch {}
				reject(/* @__PURE__ */ new Error(`opencode models timed out after ${COMMAND_TIMEOUT_MS}ms`));
			});
		}, COMMAND_TIMEOUT_MS);
		timer.unref?.();
		child.stdout?.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.stderr?.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", (error) => finish(() => reject(error)));
		child.on("close", (code) => finish(() => {
			if (code === 0) resolve(stdout);
			else reject(/* @__PURE__ */ new Error(`opencode models exited with ${code}: ${stderr.trim().slice(0, 200)}`));
		}));
	});
}
//#endregion
//#region src/free-service.ts
/**
* Client and lifecycle for the free route's `service` mode: the standalone Go
* [opencode2api](https://github.com/jasonxu114514/opencode2api).
*
* Since Oct 2026 OpenCode rejects free-tier traffic that does not look like its
* own client (403 FreeTierError on raw API calls) and meters the free quota per
* egress IP (429 `Free usage limit reached`, intermittent). The Go service is
* the working path: it speaks to the upstream with full client fidelity (uTLS
* Bun ClientHello, OpenCode 2.1 version and `/inference` routes, byte-for-byte
* bodies) and rotates egress exits with a per-exit cooldown.
*
* The route keeps its loopback listener (see ./local/loopback.ts) and swaps the
* handler backend: every call here is a thin authenticated passthrough to the
* service's OpenAI-compatible surface (`/v1/models`, `/v1/chat/completions`,
* `/v1/responses`).
*
* @module dsh-opencode-gateway/free-service
*/
/** How long one spawn-to-healthy wait may take before the route gives up. */
const SERVICE_START_TIMEOUT_MS = 3e4;
/** Interval between health probes while waiting for the service. */
const SERVICE_START_POLL_MS = 500;
/**
* Resolve the companion gateway's `bin\opencode2api.exe` and `bin\config.json`.
*
* The plugin and the gateway are deployed as sibling checkouts
* (`E:\Agent\dsh-opencode-gateway` next to `E:\Agent\opencode-api-plugin`), and
* the gateway's start scripts keep the service binary and its config there.
* @param packageRoot - this plugin's package root (the parent of `src/` in a
*   source checkout, of `lib/` in a built one).
* @returns existing paths; a missing file comes back as null.
*/
function defaultServicePaths(pluginRoot) {
	const bin = path.join(pluginRoot, "..", "opencode-api-plugin", "bin");
	const exePath = path.join(bin, "opencode2api.exe");
	const configPath = path.join(bin, "config.json");
	return {
		exePath: fs.existsSync(exePath) ? exePath : null,
		configPath: fs.existsSync(configPath) ? configPath : null
	};
}
/**
* Read the service's server key out of its own config file.
*
* This is the zero-configuration path: the plugin and the service are managed
* by the same operator, so the key the service already requires is right there
* in `server_keys[0]`. An explicit `serviceApiKeyEnv` still wins.
* @param configPath - the service's config.json.
* @returns the first enabled server key, or undefined.
*/
function readServiceKeyFromConfig(configPath) {
	try {
		const keys = JSON.parse(fs.readFileSync(configPath, "utf8"))?.server_keys;
		if (Array.isArray(keys)) {
			for (const key of keys) if (typeof key === "string" && key.length > 0) return key;
		}
	} catch {}
}
/**
* Probe the service's unauthenticated health endpoint.
*
* `GET /healthz` answers 200 without a key, which makes it the one request
* that can decide "is anything listening" before credentials exist.
*/
async function serviceHealthy(serviceUrl, timeoutMs = 2e3) {
	try {
		return (await fetch(`${serviceUrl}/healthz`, { signal: AbortSignal.timeout(timeoutMs) })).ok;
	} catch {
		return false;
	}
}
/**
* Make sure the Go service is listening, spawning it when allowed.
*
* A service already listening is reused untouched (the gateway's start scripts
* own theirs); only a process this call spawns is returned for disposal —
* same ownership rule the embedded route applies to `opencode serve`.
* @param options - endpoint, paths, and whether spawning is allowed.
* @param logger - optional logger for the spawn lifecycle lines.
* @returns the spawned process, or undefined when one was reused.
*/
async function ensureServiceRunning(options, logger) {
	if (await serviceHealthy(options.serviceUrl)) return void 0;
	if (!options.manageService) throw new Error(`the opencode2api service is not listening at ${options.serviceUrl} (start it, or set free.manageService: true)`);
	if (!fs.existsSync(options.exePath)) throw new Error(`the opencode2api service is not listening at ${options.serviceUrl} and the executable is missing: ${options.exePath} (set free.serviceExePath and free.serviceConfigPath to the companion gateway bin files)`);
	const args = ["-config", options.configPath];
	const child = spawn(options.exePath, args, {
		stdio: "ignore",
		cwd: path.dirname(options.exePath),
		windowsHide: true,
		detached: false
	});
	child.on("error", (error) => {
		logger?.error?.(`opencode-gateway: failed to spawn the opencode2api service: ${error.message}`);
	});
	const deadline = Date.now() + SERVICE_START_TIMEOUT_MS;
	while (Date.now() < deadline) {
		if (child.exitCode !== null) throw new Error(`the opencode2api service exited during startup (code=${child.exitCode})`);
		if (await serviceHealthy(options.serviceUrl, 1e3)) {
			logger?.info?.(`opencode-gateway: opencode2api service ready at ${options.serviceUrl} (spawned)`);
			return { stop: () => {
				try {
					child.kill();
				} catch {}
			} };
		}
		await new Promise((resolve) => setTimeout(resolve, SERVICE_START_POLL_MS));
	}
	try {
		child.kill();
	} catch {}
	throw new Error(`the opencode2api service did not become healthy within ${SERVICE_START_TIMEOUT_MS}ms`);
}
/**
* The service's free-tier model ids (its `/v1/models` answer).
*
* With the companion config's `models.free_only: true` the listing is already
* exactly the free tier, so no filtering happens here.
* @returns bare model ids (`big-pickle`), in listing order.
*/
async function listServiceModels(client) {
	const response = await fetch(`${client.serviceUrl}/v1/models`, {
		headers: { authorization: `Bearer ${client.apiKey}` },
		signal: AbortSignal.timeout(15e3)
	});
	if (!response.ok) throw new Error(`opencode2api /v1/models answered ${response.status}`);
	const payload = await response.json();
	const ids = [];
	for (const entry of payload?.data ?? []) if (typeof entry?.id === "string" && entry.id.length > 0) ids.push(entry.id);
	return ids;
}
/**
* Chat Completions passthrough.
*
* The loopback server hands the parsed body over; this re-serializes it so
* the service sees the exact JSON the client sent, and returns the fetch
* `Response` (streaming body included) for the loopback to relay.
*/
async function serviceChat(client, body, stream) {
	return fetch(`${client.serviceUrl}/v1/chat/completions`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${client.apiKey}`
		},
		body: JSON.stringify({
			...body,
			stream
		}),
		signal: AbortSignal.timeout(6e5)
	});
}
/**
* Responses API passthrough, same contract as {@link serviceChat}. The Go
* service exposes `/v1/responses` natively, so no protocol conversion happens
* on either side.
*/
async function serviceResponses(client, body, stream) {
	return fetch(`${client.serviceUrl}/v1/responses`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${client.apiKey}`
		},
		body: JSON.stringify({
			...body,
			stream
		}),
		signal: AbortSignal.timeout(6e5)
	});
}
/** This module's own directory, for sibling-path resolution. */
function moduleDirname(importMetaUrl) {
	return path.dirname(fileURLToPath(importMetaUrl));
}
//#endregion
//#region src/discovery.ts
/**
* Live model discovery against the gateway route's endpoint.
*
* Discovery is advisory end to end: the route mounts immediately with the
* configured/seed menu, and upgrades to the listing the endpoint reports once
* it answers. Failures stay soft — the previous facts keep serving.
*
* The settings page's manual refresh is NOT soft: it needs to tell "the
* endpoint has no models" apart from "the endpoint never answered", so the
* detailed form reports the failure kind instead of collapsing every path to
* an empty id list.
*
* @module dsh-opencode-gateway/discovery
*/
/** Bounded read cap for one listing body (an endpoint cannot exhaust memory by listing). */
const MAX_LISTING_BYTES = 8388608;
/** How long the settings page's refresh waits for an answer. */
const REFRESH_TIMEOUT_MS = 6e4;
/** How long the background poll waits; keeps boot retries quick. */
const POLL_TIMEOUT_MS = 1e4;
/**
* Fetch the gateway's model listing, reporting why an empty answer is empty.
* @param baseURL - the gateway endpoint, version segment included.
* @param apiKey - the gateway token; omitted when the gateway runs unauthenticated.
* @param timeoutMs - how long to wait for headers, in milliseconds.
* @returns the listing ids, or a typed failure.
*/
async function fetchGatewayListingDetailed(baseURL, apiKey, timeoutMs = REFRESH_TIMEOUT_MS) {
	const headers = { accept: "application/json" };
	if (apiKey !== void 0 && apiKey.length > 0) headers.authorization = `Bearer ${apiKey}`;
	let response;
	try {
		response = await fetch(`${baseURL}/models`, {
			method: "GET",
			headers,
			signal: AbortSignal.timeout(timeoutMs)
		});
	} catch (error) {
		if (error?.name === "TimeoutError" || error?.name === "AbortError") return {
			ok: false,
			reason: "timeout",
			message: `no answer within ${timeoutMs >= 1e3 ? `${Math.round(timeoutMs / 1e3)}s` : `${timeoutMs}ms`}`
		};
		return {
			ok: false,
			reason: "network",
			message: error?.cause?.message ?? error?.message ?? "connection failed"
		};
	}
	if (response.status === 401 || response.status === 403) return {
		ok: false,
		reason: "auth",
		message: `HTTP ${response.status} — the gateway rejected the token (set OPENCODE_GATEWAY_KEY in ~/.dsh/.env)`
	};
	if (!response.ok) return {
		ok: false,
		reason: "http",
		message: `HTTP ${response.status} ${response.statusText}`.trim()
	};
	let text;
	try {
		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > MAX_LISTING_BYTES) return {
			ok: false,
			reason: "invalid",
			message: "listing body is too large"
		};
		text = new TextDecoder().decode(buffer);
	} catch (error) {
		return {
			ok: false,
			reason: "network",
			message: error?.message ?? "listing body read failed"
		};
	}
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		return {
			ok: false,
			reason: "invalid",
			message: "listing is not JSON"
		};
	}
	const data = Array.isArray(body) ? body : body?.data;
	if (!Array.isArray(data)) return {
		ok: false,
		reason: "invalid",
		message: "listing has no data array"
	};
	return {
		ok: true,
		ids: data.map((entry) => typeof entry === "string" ? entry : entry?.id).filter((id) => typeof id === "string" && id.length > 0)
	};
}
/**
* Fetch the gateway's model listing (soft form: any failure reads as no ids).
* @param baseURL - the gateway endpoint, version segment included.
* @param apiKey - the gateway token; omitted when the gateway runs unauthenticated.
* @returns the listing ids, empty on any failure.
*/
async function fetchGatewayListing(baseURL, apiKey) {
	const result = await fetchGatewayListingDetailed(baseURL, apiKey, POLL_TIMEOUT_MS);
	return result.ok ? result.ids : [];
}
//#endregion
//#region src/credentials.ts
/**
* Credential resolution and the minimal pi-ai auth adapters this plugin's
* routes run behind.
*
* Both routes authenticate through `apiKeyEnv` alone — the gateway route via a
* credential reference resolved per request, the free route with a literal
* dummy because the loopback proxy holds the backend password itself. Neither
* route performs OAuth, so the collection-level `CredentialStore` this plugin
* supplies is honestly empty: the ambient store exists because pi-ai requires
* one, and a route whose only auth path is the per-request key override never
* reads it.
*
* @module dsh-opencode-gateway/credentials
*/
/**
* Resolve one credential reference through the optional credentials service,
* then the launch environment, then the process environment.
* @param ctx - the plugin context carrying the optional `ctx.credentials`.
* @param name - the reference name (an environment-variable name).
* @returns the secret, or undefined when no layer holds one.
*/
async function resolveCredential(ctx, name) {
	const ref = credentialRef(name);
	if (isCredentialRefName(name)) {
		const credentials = ctx.get("credentials");
		const hit = credentials !== void 0 ? await credentials.resolve(ref) : void 0;
		if (hit !== void 0 && hit.value.length > 0) return hit.value;
	}
	const env = launchEnvironmentOf(ctx).get(name);
	if (env !== void 0 && env.value.length > 0) return env.value;
	const direct = process.env[name];
	return direct !== void 0 && direct.length > 0 ? direct : void 0;
}
/** Where opencode stores its auth state across platforms. */
function opencodeAuthPath() {
	if (process.platform === "win32") return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "opencode", "auth.json");
	if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "opencode", "auth.json");
	const xdg = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
	return join(xdg, "opencode", "auth.json");
}
/**
* The local opencode login key for the Zen backend, read straight from
* opencode's own auth file — the same fallback the gateway's embedded upstream
* uses, so a machine signed into `opencode auth login` needs no extra
* configuration here. Ported from opencode-api-plugin's gateway.ts.
* @returns the key, or undefined when opencode is not signed in.
*/
function readLocalOpencodeKey() {
	const path = opencodeAuthPath();
	if (!accessExists(path)) return void 0;
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8"));
		for (const [id, entry] of Object.entries(parsed ?? {})) {
			const key = typeof entry === "string" ? entry : entry?.key ?? entry?.api_key ?? entry?.accessToken;
			if (typeof key === "string" && key.length > 0 && /opencode|zen/i.test(id)) return key;
		}
		for (const entry of Object.values(parsed ?? {})) {
			const key = typeof entry === "string" ? entry : entry?.key ?? entry?.api_key ?? entry?.accessToken;
			if (typeof key === "string" && key.length > 0) return key;
		}
	} catch {}
}
function accessExists(path) {
	try {
		accessSync(path);
		return true;
	} catch {
		return false;
	}
}
/**
* A pi-ai `CredentialStore` over nothing. This plugin's routes authenticate
* per request through their resolved `apiKeyEnv`; pi-ai requires the store to
* exist, so the honest empty implementation is supplied rather than pi-ai's
* in-memory default (which would also be empty, but only by accident).
* @returns the store to hand `PiAiAdapter`.
*/
function emptyCredentialStore() {
	return {
		async read() {},
		async list() {
			return [];
		},
		async modify() {
			throw new Error("opencode-gateway: this plugin stores no credentials; authenticate routes through apiKeyEnv");
		},
		async delete() {}
	};
}
/**
* A pi-ai `AuthContext` over the process environment and host filesystem.
* The credential seam is deliberately absent: this plugin resolves its own
* references per request, and no provider in its routes performs the ambient
* discovery a seam-backed `env()` would feed.
* @returns the auth context to hand `PiAiAdapter`.
*/
function minimalAuthContext() {
	return {
		async env(name) {
			return process.env[name];
		},
		async fileExists(path) {
			return accessExists(path.startsWith("~/") || path === "~" ? resolve(homedir(), path.slice(1).replace(/^\//, "")) : path);
		}
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@0.87.1_ws@8.22.0_zod@4.6.5/node_modules/@earendil-works/pi-ai/dist/api/openai-completions.lazy.js
const openAICompletionsApi = () => lazyApi(() => import("./openai-completions-Dn8kaSJS.js"));
//#endregion
//#region src/registry.ts
/**
* Curated model registry for the two routes this plugin serves.
*
* Every OpenCode Go entry below is ported from AIMFllyYS/dsh-protocom-api
* (MIT), whose windows, effort vocabularies and vision flags were verified
* against the live `zen/go` endpoint request by request — the same endpoint
* this plugin's gateway route reaches through the local gateway. Bare ids here
* join live listings by identity (the id after its routing prefix), so a model
* listed under several spellings resolves to one entry.
*
* Metadata is curated here; membership never is. What the Go card offers comes
* from the live listing alone ({@link GO_OFFICIAL_PREFIXES}), because the
* endpoint's catalog changes without notice and any frozen allow/deny list
* goes stale: a measured "this id cannot serve a turn" is a fact about one
* moment, not a property of the model.
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
		id: "step-5-preview-free",
		displayName: "Step-5 Preview Free",
		contextWindow: 1e6,
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
/**
* The ONLY routing prefix whose models belong on the Go card.
*
* The gateway's listing mixes three sources under look-alike prefixes, and
* only the first is the official Go subscription:
*
* - `go/` — the gateway's `opencode-go` upstream, fronting
*   `https://opencode.ai/zen/go/v1/models`. This is the official catalog: a
*   live read of it matched the gateway's `go/` ids exactly, one for one.
* - `opencode-go/` — the LOCAL `opencode serve` catalog, surfaced through the
*   gateway's `local-free` upstream (whose `modelRewrite` maps only
*   `opencode/`, so this spelling passes through untouched). It is a different
*   catalog from a different source, not an alias of `go/`.
* - `free/` — that same local backend's Zen catalog, paid models included.
*
* Treating `opencode-go/` as an alias spelling of `go/` is what let
* `opencode-go/step-5-preview-free` — a local-backend entry the official
* endpoint does not list — show up on the Go card. Membership follows this
* whitelist; nothing else is filtered by a frozen list, because the endpoint's
* catalog changes without notice.
*/
const GO_OFFICIAL_PREFIXES = ["go"];
/** The bare model id behind a gateway listing id (`go/deepseek-x` → `deepseek-x`). */
function bareModelId(listingId) {
	const slash = listingId.indexOf("/");
	return slash > 0 ? listingId.slice(slash + 1) : listingId;
}
/** Registry entry for a bare id, or undefined. */
function lookupEntry(bareId) {
	return GO_REGISTRY.find((entry) => entry.id === bareId);
}
/** `deepseek_v4.1_flash` → `Deepseek V4.1 Flash`: menu name for registry-missing ids. */
function prettifyId(bareId) {
	return bareId.split(/[-_.]/).filter(Boolean).map((part) => /\d/.test(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
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
/** Gateway route: the ZCode subscription list, verbatim `go/` ids. */
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
	}
];
/**
* Free route: the free tier under the backend's raw wire ids.
*
* In `service` mode (default) these are the bare ids the Go opencode2api's
* `/v1/models` answers (`models.free_only: true` on the companion config makes
* that listing exactly the free tier); in `embedded` mode the ids carry the
* `opencode/` prefix `opencode models` prints. The card's refresh reads the
* same source, so the shipped list and a live refresh agree by construction.
* Context windows come from opencode's catalog (`limit.context`); ids the
* upstream has retired drop out on the first live refresh.
*/
const FREE_DEFAULT_MODELS = [
	{
		id: "beam-free",
		name: label("OpenCode Free", "beam-free"),
		contextWindow: 1048576
	},
	{
		id: "big-pickle",
		name: label("OpenCode Free", "big-pickle"),
		contextWindow: 2e5
	},
	{
		id: "deepseek-v4.1-flash-free",
		name: label("OpenCode Free", "deepseek-v4.1-flash-free"),
		contextWindow: 2e5
	},
	{
		id: "flint-40b-free",
		name: label("OpenCode Free", "flint-40b-free"),
		contextWindow: 2e5
	},
	{
		id: "glm-5.3-flash-free",
		name: label("OpenCode Free", "glm-5.3-flash-free"),
		contextWindow: 2e5
	},
	{
		id: "mimo-v2.6-flash-free",
		name: label("OpenCode Free", "mimo-v2.6-flash-free"),
		contextWindow: 2e5
	},
	{
		id: "nemotron-3.5-lightning-free",
		name: label("OpenCode Free", "nemotron-3.5-lightning-free"),
		contextWindow: 262144
	},
	{
		id: "nemotron-3.5-super-vl-free",
		name: label("OpenCode Free", "nemotron-3.5-super-vl-free"),
		contextWindow: 1048576
	}
];
//#endregion
//#region src/routes.ts
/**
* Construction of the two pi-ai route profiles this plugin registers.
*
* A route the installed pi-ai catalog does not ship is one `createProvider`
* call over an explicit model list; this module owns that construction —
* registry enrichment of a live listing, capacity defaults, reasoning-vocab
* mapping — and hands the adapter fully-built `ResolvedPiAiProviderProfile`
* snapshots. Everything a request needs is decided here, so the adapter's own
* snapshot machinery can treat configuration as immutable facts.
*
* @module dsh-opencode-gateway/routes
*/
const NO_COST = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0
};
const THINKING_LEVELS = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
/** Rank of an official prefix; lower wins when one bare id is listed twice. */
function prefixRank(prefix) {
	const index = GO_OFFICIAL_PREFIXES.indexOf(prefix);
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
/**
* Project a live gateway listing down to the official Go catalog.
*
* The gateway aggregates several upstreams, so its listing carries ids from
* sources that are NOT the Go subscription under look-alike prefixes (see
* {@link GO_OFFICIAL_PREFIXES}). Membership is decided by that whitelist
* alone: an id the endpoint no longer lists disappears and one it newly lists
* appears, with no frozen list in between. Surviving ids are deduped by bare
* model and enriched with the curated registry's metadata.
* @param listingIds - ids the gateway's `/v1/models` answered.
* @param gateway - the resolved gateway route config.
* @returns menu entries in listing order, curated metadata applied.
*/
function projectGatewayListing(listingIds, gateway) {
	const chosen = /* @__PURE__ */ new Map();
	for (const listingId of listingIds) {
		const slash = listingId.indexOf("/");
		if (slash <= 0) continue;
		const prefix = listingId.slice(0, slash);
		const bare = listingId.slice(slash + 1);
		if (bare.length === 0) continue;
		if (!GO_OFFICIAL_PREFIXES.includes(prefix)) continue;
		if (gateway.hiddenModels.some((hidden) => listingId.startsWith(hidden))) continue;
		const existing = chosen.get(bare);
		const rank = prefixRank(prefix);
		if (existing === void 0 || rank < existing.rank) chosen.set(bare, {
			wireId: listingId,
			rank
		});
	}
	const projected = [];
	for (const [bare, { wireId }] of chosen) {
		const entry = lookupEntry(bare);
		projected.push({
			id: wireId,
			...entry?.displayName === void 0 ? {} : { name: entry.displayName },
			...entry?.contextWindow === void 0 ? {} : { contextWindow: entry.contextWindow },
			...entry === void 0 ? {} : { reasoningEfforts: reasoningEffortsFor(entry) },
			...entry?.vision === true ? { input: ["text", "image"] } : {}
		});
	}
	return projected;
}
/** Build one pi-ai model from a resolved route entry plus route defaults. */
function toPiModel(provider, baseURL, entry, defaults) {
	const efforts = entry.reasoningEfforts;
	const reasoning = efforts !== void 0 && efforts !== false && Object.keys(efforts).length > 0;
	let thinkingLevelMap;
	if (reasoning) {
		const map = {};
		for (const level of THINKING_LEVELS) {
			const wire = efforts[level];
			map[level] = wire === void 0 || wire === null ? null : wire;
		}
		thinkingLevelMap = map;
	}
	const name = entry.name ?? prettifyId(bareModelId(entry.id));
	return {
		id: entry.id,
		name,
		api: "openai-completions",
		provider,
		baseUrl: baseURL,
		compat: { supportsDeveloperRole: false },
		reasoning,
		...thinkingLevelMap === void 0 ? {} : { thinkingLevelMap },
		input: entry.input !== void 0 ? [...entry.input] : ["text"],
		cost: NO_COST,
		contextWindow: entry.contextWindow ?? defaults.contextWindow,
		maxTokens: entry.maxTokens ?? defaults.maxTokens
	};
}
/**
* Fill a model entry's absent metadata from the measured registry: only
* fields the entry does not STATE are filled, so an explicit
* `reasoningEfforts: false` (a declared non-reasoning model) is never
* overridden. This is what keeps a settings-page-saved entry — which may
* carry nothing but an id — from losing the effort menu the registry
* measured for its bare id.
* @param entry - the model entry as configured or saved.
* @returns the entry with registry-known metadata filled in.
*/
function enrichFromRegistry(entry) {
	const known = lookupEntry(bareModelId(entry.id));
	if (known === void 0) return entry;
	return {
		...entry,
		...entry.name !== void 0 ? {} : { name: known.displayName },
		...entry.contextWindow !== void 0 ? {} : { contextWindow: known.contextWindow },
		...entry.reasoningEfforts !== void 0 ? {} : { reasoningEfforts: reasoningEffortsFor(known) },
		...entry.input !== void 0 || known.vision !== true ? {} : { input: ["text", "image"] }
	};
}
/** Materialize one route profile: a pi-ai provider plus the adapter's facts. */
function buildProfile(provider, displayName, baseURL, models, defaults, streamIdleTimeoutMs, retryPolicy, apiKeyEnv) {
	const enriched = models.map((entry) => enrichFromRegistry(entry));
	const piProvider = createProvider({
		id: provider,
		name: displayName,
		baseUrl: baseURL,
		auth: { apiKey: {
			name: displayName,
			resolve: ({ credential }) => Promise.resolve({
				auth: credential?.key === void 0 ? {} : { apiKey: credential.key },
				source: displayName
			})
		} },
		models: enriched.map((entry) => toPiModel(provider, baseURL, entry, defaults)),
		api: openAICompletionsApi()
	});
	const configuredMaxTokens = new Map(models.filter((entry) => entry.maxTokens !== void 0).map((entry) => [entry.id, entry.maxTokens]));
	return {
		provider,
		displayName,
		api: "openai-completions",
		baseURL,
		...apiKeyEnv === void 0 ? {} : { apiKeyEnv: credentialRef(apiKeyEnv) },
		streamIdleTimeoutMs,
		maxRequestImageBytes: 20971520,
		requestImagePixelBudget: 4194304,
		requestImageMaxBytes: 1048576,
		retryPolicy,
		piProvider,
		modelErrors: /* @__PURE__ */ new Map(),
		configuredMaxTokens
	};
}
/**
* The gateway route's profile. The menu is the explicit `models` list — or the
* shipped ZCode-aligned list when none is set; the gateway's full live listing
* only merges in when `discoverModels` is on.
* @param gateway - resolved gateway config.
* @param listingIds - ids discovered from the gateway (possibly empty).
*/
function gatewayProfile(gateway, listingIds) {
	const declared = gateway.models ?? GATEWAY_DEFAULT_MODELS;
	const seen = new Set(declared.map((entry) => entry.id));
	const extra = gateway.discoverModels ? projectGatewayListing(listingIds, gateway).filter((entry) => !seen.has(entry.id)).map((entry) => ({
		...entry,
		name: `${gateway.displayName}/${bareModelId(entry.id)}`
	})) : [];
	const models = [...declared, ...extra];
	return buildProfile(gateway.provider, gateway.displayName, gateway.baseURL, models, {
		contextWindow: gateway.defaultContextWindow,
		maxTokens: gateway.defaultMaxTokens
	}, gateway.streamIdleTimeoutMs, gateway.retryPolicy, gateway.apiKeyEnv);
}
/**
* The free route's profile. The menu is the explicit `models` list — or the
* shipped ZCode-aligned free list when none is set; the backend's live
* listing only merges in when `discoverModels` is on.
* @param free - resolved free config.
* @param liveIds - ids the inlined proxy reports, empty until its backend is healthy.
*/
function freeProfile(free, liveIds) {
	const declared = free.models ?? FREE_DEFAULT_MODELS;
	const seen = new Set(declared.map((entry) => entry.id));
	const extra = free.discoverModels ? liveIds.filter((id) => !seen.has(id)).map((id) => ({
		id,
		name: `${free.displayName}/${bareModelId(id)}`
	})) : [];
	const models = [...declared, ...extra];
	return buildProfile(free.provider, free.displayName, `http://127.0.0.1:${free.proxyPort}/v1`, models, {
		contextWindow: free.defaultContextWindow,
		maxTokens: free.defaultMaxTokens
	}, free.streamIdleTimeoutMs, free.retryPolicy);
}
//#endregion
//#region src/index.ts
/**
* OpenCode gateway provider plugin.
*
* Two pi-ai-backed routes land on the Harness LLM seam:
*
* - `opencode-gateway` — the local opencode-api-plugin gateway (OpenAI Chat
*   Completions; the gateway fronts OpenCode Go, OpenCode Zen and any custom
*   upstreams its own config aggregates, and fixes the protocol-level quirks
*   server-side). Credential: `OPENCODE_GATEWAY_KEY`, any non-empty value
*   while the gateway runs without a token.
* - `opencode-free` — the inlined opencode2api local proxy driving this
*   machine's `opencode serve` backend for the Zen free tier. Works with no
*   gateway process; the backend spawns on first use.
*
* Both routes mount immediately with configured/seed menus, then upgrade to
* the live listing discovery reports; discovery failures stay soft. The
* plugin's Config IS the settings form (volatile sections): the settings
* page's model checkboxes write the `models` lists, and a write reaches the
* running plugin through the volatile refs without a remount.
*
* @module dsh-opencode-gateway
*/
/** Cordis plugin name; also the log and error-message prefix, the discovery key, and the settings form namespace. */
const name = "opencode-gateway";
/** Services required by this provider plugin. */
const inject = ["llm"];
/** Install both routes on the LLM seam. */
function apply(ctx, config) {
	const options = () => resolveConfig({
		gateway: readSection(config.gateway),
		free: readSection(config.free)
	});
	options();
	const assetsPath = fileURLToPath(new URL("../assets/opencode2api-tool-lock.js", import.meta.url));
	const packageRoot = path.dirname(moduleDirname(import.meta.url));
	let freeRuntime;
	let freeStructuralFacts;
	/**
	* Free-route retry budget.
	*
	* The route used to be decided once, at load: `buildFreeRuntime()` assigns
	* `freeRuntime` before the asynchronous start, so its "already built" guard made every
	* later attempt a no-op -- a harness that loaded before the companion gateway had its
	* service on 18080 was stuck without free models for the whole session, and the 60s
	* listing poll could not bring it back (it only refreshes model ids).
	*
	* Rebuilding needs `freeRuntime` to be cleared first, which is what the retry below
	* does. Backoff is short at first because the usual cause is simply "the service is
	* still starting"; it then stretches out so a permanently broken setup stops costing
	* anything.
	*/
	const FREE_ROUTE_RETRY_DELAYS = [
		5e3,
		15e3,
		3e4,
		6e4,
		12e4,
		3e5
	];
	let freeRouteRetry = 0;
	const structuralFactsOf = (free) => JSON.stringify({
		mode: free.mode,
		serviceUrl: free.serviceUrl,
		serviceApiKeyEnv: free.serviceApiKeyEnv,
		manageService: free.manageService,
		serviceExePath: free.serviceExePath,
		serviceConfigPath: free.serviceConfigPath,
		serverUrl: free.serverUrl,
		proxyPort: free.proxyPort,
		opencodePath: free.opencodePath,
		serverPassword: free.serverPassword,
		manageBackend: free.manageBackend,
		disableTools: free.disableTools,
		internalAllowedTools: free.internalAllowedTools,
		promptMode: free.promptMode,
		omitSystemPrompt: free.omitSystemPrompt,
		requestTimeoutMs: free.requestTimeoutMs,
		autoCleanupConversations: free.autoCleanupConversations,
		useIsolatedHome: free.useIsolatedHome,
		zenApiKeyEnv: free.zenApiKeyEnv
	});
	/** The free route's model-listing source, shared by discovery and the poll. */
	const freeListingIds = async (free) => {
		if (free.mode === "service") {
			const client = freeRuntime?.service;
			if (client === void 0) return [];
			return listServiceModels(client).catch(() => []);
		}
		return listFreeModels({ opencodePath: resolveOpencodePath(free.opencodePath).path ?? free.opencodePath });
	};
	const buildFreeRuntime = () => {
		const free = options().free;
		const facts = structuralFactsOf(free);
		if (freeRuntime !== void 0) {
			if (facts === freeStructuralFacts) return;
			ctx.logger?.warn?.("opencode-gateway: free-route backend facts changed in settings; restart the harness to apply them (the model menu applies live)");
			freeStructuralFacts = facts;
			return;
		}
		freeStructuralFacts = facts;
		const runtime = {
			free,
			serverReady: false
		};
		try {
			if (free.mode === "service") {
				const defaults = defaultServicePaths(packageRoot);
				const configPath = free.serviceConfigPath || defaults.configPath || "";
				const apiKey = process.env[free.serviceApiKeyEnv] ?? (configPath ? readServiceKeyFromConfig(configPath) : void 0);
				if (apiKey === void 0 || apiKey.length === 0) throw new Error(`no opencode2api server key: set ${free.serviceApiKeyEnv} in ~/.dsh/.env or keep the companion gateway bin/config.json readable`);
				const client = {
					serviceUrl: free.serviceUrl,
					apiKey
				};
				runtime.service = client;
				freeRuntime = runtime;
				(async () => {
					const spawned = await ensureServiceRunning({
						serviceUrl: free.serviceUrl,
						apiKey,
						manageService: free.manageService,
						exePath: free.serviceExePath || defaults.exePath || "",
						configPath: configPath || (defaults.exePath ? defaults.exePath : "")
					}, ctx.logger);
					if (freeRuntime !== runtime) {
						spawned?.stop();
						return;
					}
					runtime.serviceProcess = spawned;
					return startLoopbackServer({
						port: free.proxyPort,
						listModels: () => listServiceModels(client),
						handleChat: (body, stream) => serviceChat(client, body, stream),
						handleResponses: (body, stream) => serviceResponses(client, body, stream)
					}).then((started) => {
						if (freeRuntime !== runtime) return;
						runtime.server = started;
						runtime.serverReady = true;
						freeRouteRetry = 0;
						ensure();
					}, (error) => {
						ctx.logger?.error?.(`opencode-gateway: free route unavailable, loopback listener failed: ${error?.message ?? error}`);
						ensure();
						scheduleFreeRouteRetry(runtime);
					});
				})().catch((error) => {
					ctx.logger?.error?.(`opencode-gateway: free route unavailable, service start failed: ${error?.message ?? error}`);
					ensure();
					scheduleFreeRouteRetry(runtime);
				});
			} else {
				const zenApiKey = process.env[free.zenApiKeyEnv] ?? readLocalOpencodeKey();
				runtime.proxy = createLocalProxy(normalizeLocalProxyConfig({
					id: free.provider,
					baseURL: free.serverUrl,
					serverPassword: free.serverPassword,
					opencodePath: free.opencodePath,
					manageBackend: free.manageBackend,
					zenApiKey: zenApiKey ?? "",
					disableTools: free.disableTools,
					internalAllowedTools: [...free.internalAllowedTools],
					promptMode: free.promptMode,
					omitSystemPrompt: free.omitSystemPrompt,
					requestTimeoutMs: free.requestTimeoutMs,
					autoCleanupConversations: free.autoCleanupConversations,
					useIsolatedHome: free.useIsolatedHome,
					toolLockPluginPath: assetsPath
				}));
				freeRuntime = runtime;
				startLoopbackServer({
					port: free.proxyPort,
					listModels: () => runtime.proxy.listModels(),
					handleChat: (body, stream) => runtime.proxy.handleChat(body, stream),
					handleResponses: (body, stream) => runtime.proxy.handleResponses(body, stream)
				}).then((started) => {
					if (freeRuntime !== runtime) return;
					runtime.server = started;
					runtime.serverReady = true;
					ensure();
				}, (error) => {
					ctx.logger?.error?.(`opencode-gateway: free route unavailable, loopback listener failed: ${error?.message ?? error}`);
					ensure();
				});
			}
		} catch (error) {
			ctx.logger?.error?.(`opencode-gateway: free route failed to start: ${error?.message ?? error}`);
			freeRuntime = void 0;
		}
	};
	/**
	* Rebuild a free route whose start failed, with backoff.
	*
	* `buildFreeRuntime()` treats an assigned `freeRuntime` as "already built", so the
	* failed runtime has to be cleared before the rebuild or the retry is a no-op. It is
	* only cleared when it is still the same object the failure came from: a settings
	* change meanwhile owns the route and must not be stomped on.
	*/
	const scheduleFreeRouteRetry = (failed) => {
		if (freeRuntime !== failed) return;
		if (freeRouteRetry >= FREE_ROUTE_RETRY_DELAYS.length) {
			ctx.logger?.warn?.(`opencode-gateway: giving up on the free route for this session after ${FREE_ROUTE_RETRY_DELAYS.length} retries; restart the harness once the service is reachable`);
			return;
		}
		const delay = FREE_ROUTE_RETRY_DELAYS[freeRouteRetry];
		freeRouteRetry += 1;
		setTimeout(() => {
			if (freeRuntime !== failed) return;
			ctx.logger?.info?.(`opencode-gateway: retrying the free route (attempt ${freeRouteRetry})`);
			freeRuntime = void 0;
			buildFreeRuntime();
			ensure();
		}, delay).unref?.();
	};
	buildFreeRuntime();
	let gatewayListing = [];
	let freeListing = [];
	let version = 0;
	const buildGatewayState = () => {
		const profile = gatewayProfile(options().gateway, gatewayListing);
		return {
			profile,
			menu: (profile.piProvider?.getModels?.() ?? []).map((model) => ({
				id: model.id,
				name: model.name
			}))
		};
	};
	const buildFreeState = () => {
		const profile = freeProfile(options().free, freeListing);
		return {
			profile,
			menu: (profile.piProvider?.getModels?.() ?? []).map((model) => ({
				id: model.id,
				name: model.name
			}))
		};
	};
	let states = /* @__PURE__ */ new Map();
	let statesVersion = -1;
	let statesServerReady = false;
	/** Memoized profiles; a change in discovery facts or server readiness rebuilds. */
	const profilesMap = () => {
		const serverReady = freeRuntime?.serverReady === true;
		if (statesVersion === version && statesServerReady === serverReady) return states;
		const next = /* @__PURE__ */ new Map();
		next.set(options().gateway.provider, buildGatewayState());
		if (serverReady) next.set(options().free.provider, buildFreeState());
		states = next;
		statesVersion = version;
		statesServerReady = serverReady;
		return states;
	};
	const adapter = new PiAiAdapter({
		profiles: () => {
			const map = /* @__PURE__ */ new Map();
			for (const state of profilesMap().values()) map.set(state.profile.provider, state.profile);
			return map;
		},
		resolveApiKey: async (provider, profile) => {
			if (provider === options().free.provider) return "opencode-local";
			const ref = profile.apiKeyEnv;
			if (ref === void 0) throw new LlmError(`opencode-gateway: route "${provider}" names no credential reference`, "MISSING_CREDENTIAL");
			const value = await resolveCredential(ctx, ref);
			if (value === void 0) throw new LlmError(`opencode-gateway: no credential resolved from ${ref}; set ${ref} in ~/.dsh/.env or the environment (any non-empty value works while the gateway runs without a token)`, "MISSING_CREDENTIAL");
			return assertUsableApiKey(value, "opencode-gateway", ref);
		},
		auth: {
			credentials: emptyCredentialStore(),
			authContext: minimalAuthContext()
		},
		resolveAttachments: () => ctx.get("attachments"),
		onReplayDegrade: ({ provider, model, reason }) => {
			ctx.logger?.warn?.(`opencode-gateway: unusable replay state on ${provider}/${model}; sending it as neutral content (${reason})`);
		}
	});
	let registration;
	let directory;
	let registrationFacts;
	let directoryFacts;
	const factsOf = (value) => JSON.stringify(value);
	const ensure = () => {
		const map = profilesMap();
		const routes = [...map.keys()];
		const registrationNext = factsOf(routes);
		const directoryNext = factsOf(directoryEntries(map));
		if (registrationNext === registrationFacts && directoryNext === directoryFacts) return;
		try {
			if (registration === void 0) {
				if (routes.length > 0) registration = ctx.llm.registerAdapter(routes, adapter);
			} else registration.replace(routes);
			registrationFacts = registrationNext;
			const entries = directoryEntries(map);
			if (directory === void 0) directory = ctx.llm.registerConfigurableProviders(entries);
			else directory.replace(entries);
			directoryFacts = directoryNext;
		} catch (error) {
			ctx.logger?.error?.(`opencode-gateway: route registration failed: ${error?.message ?? error}`);
		}
	};
	ensure();
	function directoryEntries(map) {
		return [...map.values()].map((state) => ({
			provider: state.profile.provider,
			displayName: state.profile.displayName,
			settingsNs: name,
			settingsPath: [state.profile.provider === options().free.provider ? "free" : "gateway"],
			catalog: {
				routes: [],
				models: state.menu,
				...state.profile.apiKeyEnv === void 0 ? {} : { credentialEnv: state.profile.apiKeyEnv }
			}
		}));
	}
	ctx.on("loader/volatile-update", () => {
		buildFreeRuntime();
		version += 1;
		ensure();
	});
	try {
		ctx.llm.registerModelDiscovery(name, async (request) => {
			const current = options();
			if (request.provider === current.free.provider) return (await freeListingIds(current.free)).map((id) => discoveryRow(enrichFromRegistry({ id }), current.free.displayName));
			const key = await resolveCredential(ctx, current.gateway.apiKeyEnv);
			if (key === void 0) throw new Error(`no credential resolved from ${current.gateway.apiKeyEnv}; set it in ~/.dsh/.env to the gateway token (or any non-empty value while the gateway runs without a token)`);
			const listing = await fetchGatewayListingDetailed(current.gateway.baseURL, key);
			if (!listing.ok) throw new Error(listing.message);
			return projectGatewayListing(listing.ids, current.gateway).map((entry) => discoveryRow(entry, current.gateway.displayName));
		});
	} catch (error) {
		ctx.logger?.warn?.(`opencode-gateway: model discovery not (re)registered: ${error?.message ?? error}`);
	}
	const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
	const refreshOnce = async () => {
		const current = options();
		const key = await resolveCredential(ctx, current.gateway.apiKeyEnv).catch(() => void 0);
		const gatewayNext = await fetchGatewayListing(current.gateway.baseURL, key);
		const freeNext = await freeListingIds(current.free);
		const changed = !sameList(gatewayNext, gatewayListing) || !sameList(freeNext, freeListing);
		gatewayListing = gatewayNext;
		freeListing = freeNext;
		if (changed) {
			version += 1;
			ensure();
		}
	};
	(async () => {
		for (const delay of [
			0,
			5e3,
			2e4,
			6e4
		]) {
			if (delay > 0) await sleep(delay);
			try {
				await refreshOnce();
				if (gatewayListing.length > 0) return;
			} catch {}
		}
	})().catch(() => {});
	const pollTimer = setInterval(() => {
		refreshOnce().catch(() => {});
	}, 6e4);
	pollTimer.unref?.();
	ctx.effect(function* () {
		yield () => {
			clearInterval(pollTimer);
			freeRuntime?.server?.close();
			freeRuntime?.proxy?.killBackend();
			freeRuntime?.serviceProcess?.stop();
		};
	}, "opencode-gateway disposal");
}
/**
* One projected route entry as the settings page renders it: the entry's own
* registry-enriched facts, labeled `<group>/<bare id>` so the page rows, the
* menu and the composer chip all read the same way. Projection already resolved
* the facts, so nothing is looked up again here.
*/
function discoveryRow(entry, groupLabel) {
	const bare = bareModelId(entry.id);
	return {
		id: entry.id,
		name: `${groupLabel}/${bare}`,
		...entry.contextWindow === void 0 ? {} : { contextWindow: entry.contextWindow },
		...entry.maxTokens === void 0 ? {} : { maxTokens: entry.maxTokens },
		...entry.input === void 0 ? {} : { inputModalities: [...entry.input] }
	};
}
function sameList(next, previous) {
	return next.length === previous.length && next.every((id, index) => id === previous[index]);
}
//#endregion
export { Config, DEFAULT_CONFIG, FREE_DEFAULT_MODELS, GATEWAY_DEFAULT_MODELS, GO_OFFICIAL_PREFIXES, GO_REGISTRY, apply, defaultServicePaths, emptyCredentialStore, enrichFromRegistry, fetchGatewayListing, freeProfile, gatewayProfile, inject, listFreeModels, listServiceModels, minimalAuthContext, name, parseFreeModelIds, projectGatewayListing, readLocalOpencodeKey, readSection, readServiceKeyFromConfig, reasoningEffortsFor, resetFreeListingCache, resolveCredential, serviceHealthy };
