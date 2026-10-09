/**
 * The model manager section: one card per route, each carrying a refresh
 * button (live listing interrogation) and checkbox rows — checked models are
 * the route's menu. Staged toggles commit as one revision-fenced settings
 * write per save; conflicts reload the snapshot and drop the staging, and a
 * landed write applies its own reply view instead of re-describing.
 *
 * @module dsh-opencode-gateway/client/ModelManagerSection
 */
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots';
import type { RouteModel } from '../config.ts';
import type { RouteKey } from './rows.ts';
import type { ModelManagerOperations } from './operations.ts';
import type { en } from './locales.ts';
type Translator = (key: keyof typeof en, vars?: Record<string, string | number>) => string;
/** Injected dependencies of the section (slot `inject`). */
export interface ModelManagerInjected {
    /** The Host operations the section invokes. */
    operations: ModelManagerOperations;
    /** Section copy. */
    t: Translator;
    /** Heading copy, resolved through `t` at inject time. */
    copy: {
        title: string;
        intro: string;
    };
    /** The route cards this section renders. */
    routes: readonly RouteSpec[];
}
/** One route card's static facts. */
export interface RouteSpec {
    /** The Config section this card manages. */
    key: RouteKey;
    /** Card title. */
    title: string;
    /** The bundled shipped defaults (the inherit target and initial rows). */
    shipped: readonly RouteModel[];
}
/** Props delivered by the slot outlet; absent pieces mean not injected yet. */
export type ModelManagerSectionProps = Partial<InjectFace<ModelManagerInjected>>;
/** The section: describe once on mount, then explicit refreshes and saves. */
export declare function ModelManagerSection(props: ModelManagerSectionProps): import("react").JSX.Element | null;
export {};
