const crypto = require("crypto");

const MAX_TIMESTAMP_DRIFT_SECONDS = 60;

function hmacMiddleware(req, res, next) {
    const appKey = req.headers["x-app-key"];
    const timestamp = req.headers["x-timestamp"];
    const signature = req.headers["x-signature"];

    // Step 1: Verify App Key.
    if (!appKey || appKey !== process.env.APP_KEY) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: invalid app key"
        });
    }

    // Step 2: Verify Timestamp is within ±60 seconds.
    if (!timestamp) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: missing timestamp"
        });
    }

    const requestTime = parseInt(timestamp, 10);
    const serverTime = Math.floor(Date.now() / 1000);

    if (Math.abs(serverTime - requestTime) > MAX_TIMESTAMP_DRIFT_SECONDS) {
        return res.status(403).json({
            success: false,
            message: "Request expired"
        });
    }

    // Step 3: Generate body hash.
    const bodyHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(req.body || {}))
        .digest("hex");

    // Step 4: Create message string.
    const method = req.method.toUpperCase();
    const path = req.originalUrl;
    const message = `${timestamp}:${method}:${path}:${bodyHash}`;

    // Step 5: Generate expected HMAC signature and compare.
    const expected = crypto
        .createHmac("sha256", process.env.APP_HMAC_SECRET)
        .update(message)
        .digest("hex");

    if (!signature || signature !== expected) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: invalid signature"
        });
    }

    next();
}

module.exports = hmacMiddleware;
