/**
 * Web client half of the OpenCode gateway plugin: registers the copy
 * namespace, injects the section stylesheet, and contributes the
 * `opencode-gateway` section — the model manager — to the settings page
 * (`settings.section` slot). The Host half resolves credentials and serves
 * the model discovery the section's refresh button reads.
 *
 * @module dsh-opencode-gateway/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ModelManagerKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'settings.opencode-gateway': ModelManagerKey;
    }
}
/** Required services. */
export declare const inject: string[];
/** Wire the model manager into the settings page. */
export declare function apply(ctx: ClientContext): void;
