/**
 * The Host operations the model manager section invokes, over the harness's
 * generic settings/llm discovery remotes — no plugin-specific RPC.
 *
 * @module dsh-opencode-gateway/client/operations
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { LlmDiscoveredModel, LlmModelDiscoveryRequest, SettingsNamespaceView, SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client';
/** What one settings write answered. */
export type SettingsWriteOutcome = {
    readonly kind: 'written';
    readonly view: SettingsNamespaceView;
} | {
    readonly kind: 'conflict';
    readonly message: string;
} | {
    readonly kind: 'refused';
    readonly message: string;
};
/** What one endpoint interrogation answered. */
export type ModelDiscoveryOutcome = {
    readonly kind: 'found';
    readonly models: readonly LlmDiscoveredModel[];
} | {
    readonly kind: 'refused';
    readonly message: string;
};
/** The Host operations the model manager invokes. */
export interface ModelManagerOperations {
    /** Read this plugin's settings namespace view (defaults merged in). */
    describeSettings(): Promise<SettingsNamespaceView | undefined>;
    /** Apply path operations to this plugin's namespace, revision-fenced. */
    writeSettings(ops: SettingsPathOpView[], expectedRevision: number | undefined): Promise<SettingsWriteOutcome>;
    /** Ask one route's endpoint what models it serves. */
    discoverModels(request: LlmModelDiscoveryRequest): Promise<ModelDiscoveryOutcome>;
}
/** The Loader entry id this plugin's settings form is keyed by. */
export declare const ENTRY_ID = "opencode-gateway";
/** The model-discovery registration key; the plugin's own key space. */
export declare const DISCOVERY_NS = "opencode-gateway";
/**
 * Bind the section's Host operations to the plugin's Remote surface.
 * @param ctx - the plugin's client context (declares `remote.settings`, `remote.llm`).
 * @returns the operations the section invokes.
 */
export declare function createModelManagerOperations(ctx: ClientContext): ModelManagerOperations;
