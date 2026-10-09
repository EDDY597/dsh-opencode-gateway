/**
 * Web client half of the OpenCode gateway plugin: registers the copy
 * namespace, injects the section stylesheet, and contributes the
 * `opencode-gateway` section — the model manager — to the settings page
 * (`settings.section` slot). The Host half resolves credentials and serves
 * the model discovery the section's refresh button reads.
 *
 * @module dsh-opencode-gateway/client
 */
import { ModelManagerSection } from "./ModelManagerSection.js";
import { createModelManagerOperations } from "./operations.js";
import { en, zh } from "./locales.js";
import { SECTION_CSS } from "./styles.js";
import { GATEWAY_DEFAULT_MODELS, FREE_DEFAULT_MODELS } from "../default-models.js";
/** The locale namespace this section owns. */
const NS = 'settings.opencode-gateway';
/** Required services. */
export const inject = [
    'slots',
    'locale',
    'remote',
    'remote.settings',
    'remote.llm',
];
/** Wire the model manager into the settings page. */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }));
    const t = (key, vars) => {
        let text = ctx.locale.bind(NS)(key);
        if (vars !== undefined) {
            for (const [name, value] of Object.entries(vars))
                text = text.replaceAll(`{${name}}`, String(value));
        }
        return text;
    };
    ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset['plugin'] = 'dsh-opencode-gateway';
        tag.textContent = SECTION_CSS;
        document.head.appendChild(tag);
        return () => { tag.remove(); };
    });
    ctx.slots.inject('settings.section', () => {
        const section = ctx.slots.register({
            name: 'settings.section',
            id: 'opencode-gateway',
            order: 20,
            label: () => t('nav'),
            inject: () => ({
                operations: createModelManagerOperations(ctx),
                t,
                copy: { title: t('title'), intro: t('intro') },
                routes: [
                    { key: 'gateway', title: t('cardGateway'), shipped: GATEWAY_DEFAULT_MODELS },
                    { key: 'free', title: t('cardFree'), shipped: FREE_DEFAULT_MODELS },
                ],
            }),
        }, ModelManagerSection);
        return () => section();
    });
}
