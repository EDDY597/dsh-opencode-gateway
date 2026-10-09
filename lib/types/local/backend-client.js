import { buildBackendAuthHeaders } from "./backend.js";
function authHeaders(password = "") {
    return buildBackendAuthHeaders(password) ?? {};
}
async function requestJson(baseUrl, password, method, urlPath, body, signal) {
    const response = await fetch(`${baseUrl}${urlPath}`, {
        method,
        headers: { "content-type": "application/json", ...authHeaders(password) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
    });
    const text = await response.text();
    let parsed;
    try {
        parsed = text ? JSON.parse(text) : undefined;
    }
    catch {
        parsed = text;
    }
    if (!response.ok) {
        // OpenCode surfaces provider errors as "<status>: {json}" strings; keep a
        // comparable shape so transient-error detection works like the SDK's.
        const message = typeof parsed === "object" && parsed ? (parsed.message ?? JSON.stringify(parsed)) : String(text || response.statusText);
        return { error: { message: `${response.status}: ${message}`, statusCode: response.status, data: parsed }, statusCode: response.status };
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
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            let index = buffer.indexOf("\n");
            while (index !== -1) {
                const line = buffer.slice(0, index).replace(/\r$/, "");
                buffer = buffer.slice(index + 1);
                index = buffer.indexOf("\n");
                if (!line.startsWith("data:"))
                    continue;
                const data = line.slice(5).replace(/^ /, "");
                if (!data || data === "[DONE]")
                    continue;
                try {
                    yield JSON.parse(data);
                }
                catch {
                    continue;
                }
            }
        }
    }
    finally {
        try {
            reader.releaseLock();
        }
        catch {
            void 0;
        }
    }
}
export function createLocalClient(baseUrl, password = "") {
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
            return call("GET", `/session/${encodeURIComponent(id)}/message`, undefined, signal);
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
                headers: { accept: "text/event-stream", ...authHeaders(password) },
                signal,
            });
            if (!response.ok || !response.body) {
                throw new Error(`Event stream failed: HTTP ${response.status}`);
            }
            yield* parseEventSse(response.body, signal);
        },
    };
}
