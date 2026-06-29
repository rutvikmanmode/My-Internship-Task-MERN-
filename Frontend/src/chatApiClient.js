const CHAT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

function buildChatUrl(path) {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return `${CHAT_API_BASE_URL}${path}`;
}

async function parseResponse(response) {
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || "Chat request failed");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

async function chatRequest(method, path, body) {
    const options = {
        method,
        credentials: "include",
        headers: {}
    };

    if (body !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const response = await fetch(buildChatUrl(path), options);
    return parseResponse(response);
}

export function chatApiGet(path) {
    return chatRequest("GET", path);
}

export function chatApiPost(path, body) {
    return chatRequest("POST", path, body);
}

export function chatApiPut(path, body) {
    return chatRequest("PUT", path, body);
}

export function chatApiDelete(path) {
    return chatRequest("DELETE", path);
}

export async function chatApiUpload(path, formData) {
    const response = await fetch(buildChatUrl(path), {
        method: "POST",
        credentials: "include",
        body: formData
    });
    return parseResponse(response);
}
