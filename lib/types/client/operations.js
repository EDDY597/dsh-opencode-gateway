/**
 * The Host operations the model manager section invokes, over the harness's
 * generic settings/llm discovery remotes — no plugin-specific RPC.
 *
 * @module dsh-opencode-gateway/client/operations
 */
/** The Loader entry id this plugin's settings form is keyed by. */
export const ENTRY_ID = 'opencode-gateway';
/** The model-discovery registration key; the plugin's own key space. */
export const DISCOVERY_NS = 'opencode-gateway';
/**
 * Bind the section's Host operations to the plugin's Remote surface.
 * @param ctx - the plugin's client context (declares `remote.settings`, `remote.llm`).
 * @returns the operations the section invokes.
 */
export function createModelManagerOperations(ctx) {
    return {
        describeSettings: async () => {
            const response = await ctx.remote.settings.describe();
            if (!response.ok)
                return undefined;
            return response.value.namespaces.find((ns) => ns.ns === ENTRY_ID);
        },
        writeSettings: async (ops, expectedRevision) => {
            const response = await ctx.remote.settings.mutate(ENTRY_ID, ops, expectedRevision);
            if (response.ok)
                return { kind: 'written', view: response.value };
            const { code, message } = response.error;
            return code === 'settings/conflict' ? { kind: 'conflict', message } : { kind: 'refused', message };
        },
        discoverModels: async (request) => {
            const response = await ctx.remote.llm.discoverModels(DISCOVERY_NS, request);
            return response.ok
                ? { kind: 'found', models: response.value }
                : { kind: 'refused', message: response.error.message };
        },
    };
}
