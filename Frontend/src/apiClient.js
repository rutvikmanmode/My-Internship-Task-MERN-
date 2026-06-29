// API client with HMAC signature generation using Web Crypto API.
// These keys authenticate the *app* (not the user) and must match the backend .env values.
const APP_KEY = import.meta.env.VITE_APP_KEY || "";
const APP_HMAC_SECRET = import.meta.env.VITE_APP_HMAC_SECRET || "";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
const PUBLIC_ENDPOINTS = new Set([
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/register/send-otp",
    "/api/auth/register/verify-otp",
    "/api/auth/forgot-password/send-otp",
    "/api/auth/forgot-password/verify-otp",
    "/api/auth/forgot-password/reset"
]);

async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(secret, message) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const sigArray = Array.from(new Uint8Array(sigBuffer));
    return sigArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildHeaders(method, path, body) {
    if (!APP_KEY || !APP_HMAC_SECRET) {
        const error = new Error(
            "Missing VITE_APP_KEY or VITE_APP_HMAC_SECRET. Add them to your .env and restart the dev server."
        );
        error.status = 400;
        throw error;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyHash = await sha256(JSON.stringify(body || {}));
    const message = `${timestamp}:${method}:${path}:${bodyHash}`;
    const signature = await hmacSha256(APP_HMAC_SECRET, message);

    const headers = {
        "Content-Type": "application/json",
        "X-App-Key": APP_KEY,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
    };

    // Attach JWT token if logged in.
    const token = localStorage.getItem("token");
    if (token && !PUBLIC_ENDPOINTS.has(path)) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL}${path}`;
}

export async function apiPost(path, body) {
    const headers = await buildHeaders("POST", path, body);

    const response = await fetch(buildUrl(path), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || "Request failed");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export async function apiGet(path) {
    const headers = await buildHeaders("GET", path, {});

    const response = await fetch(buildUrl(path), {
        method: "GET",
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || "Request failed");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export async function apiPut(path, body) {
    const headers = await buildHeaders("PUT", path, body);

    const response = await fetch(buildUrl(path), {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || "Request failed");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}
