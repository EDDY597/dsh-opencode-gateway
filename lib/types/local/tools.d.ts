/**
 * External tool bridging (ported from opencode2api src/tool-runtime/*.js, MIT).
 *
 * Client-declared tools are virtualized: they never reach OpenCode as native tools.
 * The registry namespaces them, the router produces the markup contract injected into
 * the prompt, the parser reads model replies back into tool calls, and the validator
 * + policy gate what is surfaced to the client.
 */
export declare const EXTERNAL_TOOL_PREFIX = "external__";
export declare const TOOL_RISK_LEVELS: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
    readonly CRITICAL: "critical";
};
export declare const TOOL_SIDE_EFFECTS: {
    readonly NONE: "none";
    readonly READ: "read";
    readonly WRITE: "write";
    readonly DELETE: "delete";
    readonly EXTERNAL_NOTIFICATION: "external_notification";
    readonly PAYMENT: "payment";
};
export declare const TOOL_POLICY_DECISIONS: {
    readonly ALLOW: "allow";
    readonly DENY: "deny";
    readonly REQUIRE_CONFIRMATION: "require_confirmation";
};
export declare const VALIDATION_STATUSES: {
    readonly VALID: "valid";
    readonly REPAIRABLE: "repairable";
    readonly REJECTED: "rejected";
};
export type RiskLevel = (typeof TOOL_RISK_LEVELS)[keyof typeof TOOL_RISK_LEVELS];
export type SideEffect = (typeof TOOL_SIDE_EFFECTS)[keyof typeof TOOL_SIDE_EFFECTS];
export type ExternalTool = {
    id: string;
    originalName: string;
    namespacedName: string;
    description: string;
    parameters: any;
    sideEffect: SideEffect;
    riskLevel: RiskLevel;
    requiresConfirmation: boolean;
    enabled: boolean;
    sourceTool: any;
};
export declare function buildExternalToolRegistry(tools: unknown, options?: {
    prefix?: string;
}): ExternalTool[];
export declare function findExternalToolByName(registry: ExternalTool[] | null, name: unknown): ExternalTool | null;
export declare function normalizeExternalToolChoice(toolChoice: any, registry: ExternalTool[]): {
    mode: any;
    requiredTool: null;
} | {
    mode: string;
    requiredTool: string;
};
export declare function buildExternalToolsPrompt(registry: ExternalTool[], toolChoice?: any): string;
/**
 * Short imperative restatement of the markup contract, appended as the final prompt
 * part. Position matters more than wording: with the contract only in the system
 * prompt, deepseek-v4-flash-free emitted parseable markup in 4/8 runs; with this
 * reminder as the last thing before generation it was 8/8.
 */
export declare function buildExternalToolsReminder(registry: ExternalTool[], toolChoice?: any): string;
export declare function buildToolExposure(registry: ExternalTool[], toolChoice?: any): {
    tools: ExternalTool[];
    toolChoice: {
        mode: any;
        requiredTool: null;
    } | {
        mode: string;
        requiredTool: string;
    };
    prompt: string;
    reminder: string;
};
export declare function evaluateToolPolicy(tool: ExternalTool | null, args: unknown, context?: {
    config?: any;
}): {
    status: "deny";
    code: string;
    reason: string;
    effectiveRisk?: undefined;
    confirmationPayload?: undefined;
} | {
    status: "allow";
    effectiveRisk: RiskLevel;
    code?: undefined;
    reason?: undefined;
    confirmationPayload?: undefined;
} | {
    status: "require_confirmation";
    reason: string;
    confirmationPayload: {
        toolName: string;
        namespacedName: string;
        argumentsPreview: unknown;
        risk: RiskLevel;
    };
    code?: undefined;
    effectiveRisk?: undefined;
};
export declare function validateToolCall(parsedCall: any, registry: ExternalTool[]): {
    status: "rejected";
    errors: {
        code: string;
        message: string;
        path: string[];
    }[];
    tool: null;
    normalizedArguments?: undefined;
} | {
    status: "repairable";
    errors: {
        code: string;
        message: string;
        path: string[];
    }[];
    tool: ExternalTool;
    normalizedArguments?: undefined;
} | {
    status: "rejected";
    errors: {
        code: string;
        message: string;
        path: string[];
    }[];
    tool: ExternalTool;
    normalizedArguments?: undefined;
} | {
    status: "valid";
    normalizedArguments: any;
    tool: ExternalTool;
    errors?: undefined;
};
export declare function validateToolCalls(parsedCalls: unknown, registry: ExternalTool[]): {
    validCalls: any[];
    invalidCalls: any[];
};
