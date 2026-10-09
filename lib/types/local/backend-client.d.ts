/**
 * Zero-dependency client for the OpenCode server HTTP API (replaces @opencode-ai/sdk).
 *
 * Route map (from the SDK's generated client):
 *   config.providers  GET    /config/providers
 *   config.get        GET    /config
 *   config.update     PATCH  /config
 *   session.create    POST   /session
 *   session.delete    DELETE /session/{id}
 *   session.messages  GET    /session/{id}/message
 *   session.prompt    POST   /session/{id}/message
 *   event.subscribe   GET    /event  (SSE)
 *   tool.ids          GET    /experimental/tool/ids
 */
export type LocalClient = {
    baseUrl: string;
    configProviders(): Promise<any>;
    configGet(): Promise<any>;
    configUpdate(body: any): Promise<any>;
    sessionCreate(body?: any): Promise<any>;
    sessionDelete(id: string): Promise<any>;
    sessionMessages(id: string, signal?: AbortSignal): Promise<any>;
    sessionPrompt(sessionId: string, body: any, signal?: AbortSignal): Promise<any>;
    toolIds(): Promise<any>;
    eventStream(signal: AbortSignal): AsyncGenerator<any>;
};
export declare function createLocalClient(baseUrl: string, password?: string): LocalClient;
