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
/** The in-process handlers one loopback server serves. */
export interface LoopbackOptions {
    /** Port to listen on, bound to loopback only. */
    port: number;
    /** Bind address; defaults to 127.0.0.1. */
    hostname?: string;
    /** Model ids the route's discovery reports. */
    listModels: () => Promise<string[]>;
    /** Chat Completions handler. */
    handleChat: (body: any, stream: boolean) => Promise<Response>;
    /** Responses handler. */
    handleResponses: (body: any, stream: boolean) => Promise<Response>;
}
/** A running loopback listener. */
export interface LoopbackServer {
    /** The port actually bound (an ephemeral port resolves at listen time). */
    port: number;
    /** Stop listening; resolved once the server closed. */
    close(): Promise<void>;
}
/**
 * Start the loopback listener.
 * @param options - port plus the in-process handlers to serve.
 * @returns the running server.
 * @throws the listen error (e.g. `EADDRINUSE`) after a diagnostic log line.
 */
export declare function startLoopbackServer(options: LoopbackOptions): Promise<LoopbackServer>;
