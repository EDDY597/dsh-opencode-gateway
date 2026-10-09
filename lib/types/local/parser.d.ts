import { type ExternalTool } from "./tools.ts";
export type RawToolCall = {
    id?: string;
    name: string;
    arguments: unknown;
};
export declare function stripFunctionCallMarkup(text: string, trim?: boolean, options?: {
    registry?: ExternalTool[] | null;
}): string;
export declare function parseExternalToolCallsFromText(registry: ExternalTool[] | null, ...chunks: string[]): {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}[];
export type StreamTextFilter = ((chunk: string) => string) & {
    flush: () => string;
};
export declare function createToolCallFilter(options: {
    disableTools: boolean;
    forceStrip?: boolean;
    registry?: ExternalTool[] | null;
}): StreamTextFilter;
export type StreamToolCallParser = ((chunk: string) => any[]) & {
    flush: () => any[];
};
export declare function createExternalToolCallStreamParser(registry: ExternalTool[] | null): StreamToolCallParser;
