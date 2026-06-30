const fs = require("fs");
const path = require("path");
const http = require("http");
const dns = require("dns");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const { Server } = require("socket.io");

const envPath = path.join(__dirname, ".env");

if (fs.existsSync(envPath)) {
    // Load .env manually for non-CLI startup environments.
    const envFile = fs.readFileSync(envPath, "utf8");

    envFile.split(/\r?\n/).forEach((line) => {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith("#")) {
            return;
        }

        const separatorIndex = trimmedLine.indexOf("=");

        if (separatorIndex === -1) {
            return;
        }

        const key = trimmedLine.slice(0, separatorIndex).trim();
        const value = trimmedLine.slice(separatorIndex + 1).trim();

        if (key && !process.env[key]) {
            process.env[key] = value;
        }
    });
}

const contactRoutes = require("./routes/contactRoutes");
const authRoutes = require("./routes/authRoutes");
const photoRoutes = require("./routes/photoRoutes");
const profileRoutes = require("./routes/profile");
const chatAuthRoutes = require("./routes/chatAuthRoutes");
const chatRoutes = require("./routes/chatRoutes");
const chatUploadRoutes = require("./routes/chatUploadRoutes");
const gameAppAuthRoutes = require("./routes/gameappauth");
const gameTaskRoutes = require("./routes/gameTasks");
const passportConfig = require("./config/passport");
const initializeChatSocket = require("./socket/chatSocket");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/contactform";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DNS_SERVERS = (process.env.DNS_SERVERS || "")
    .split(",")
    .map((serverAddress) => serverAddress.trim())
    .filter(Boolean);

if (MONGODB_URI.startsWith("mongodb+srv://") && DNS_SERVERS.length > 0) {
    dns.setServers(DNS_SERVERS);
}

// Socket.io setup with CORS.
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store io instance on app for route access.
app.set("io", io);

// Middleware setup.
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express.json({ limit: "5mb" }));

// Session middleware (used by Passport for chat auth).
const isProduction = process.env.NODE_ENV === "production" || FRONTEND_URL.startsWith("https://");
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "chat-session-fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: isProduction ? "none" : "lax"
    }
});

app.use(sessionMiddleware);

// Initialize Passport.
app.use(passportConfig.initialize());
app.use(passportConfig.session());

// Share session with Socket.io.
io.engine.use(sessionMiddleware);
io.use((socket, next) => {
    const req = socket.request;
    if (req.user) {
        next();
    } else {
        // Try to deserialize from session.
        if (req.session && req.session.passport && req.session.passport.user) {
            passportConfig.deserializeUser(req.session.passport.user, (err, user) => {
                if (err || !user) {
                    return next(new Error("Authentication error"));
                }
                req.user = user;
                next();
            });
        } else {
            next(new Error("Authentication error"));
        }
    }
});

app.get("/", (_req, res) => {
    // Health check endpoint.
    res.json({ message: "Contact form backend is running" });
});

// ── Existing API routes (untouched) ──
app.use("/api/contact", contactRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/photos", photoRoutes);

// ── Chat API routes (new) ──
app.use("/api/chat/auth", chatAuthRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/chat/upload", chatUploadRoutes);
app.use("/api/game/auth", gameAppAuthRoutes);
app.use("/api/game/tasks", gameTaskRoutes);

// Initialize Socket.io chat handlers.
initializeChatSocket(io);

mongoose
    // Connect to MongoDB and start the server.
    .connect(MONGODB_URI)
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log("MongoDB connected");
            console.log("Socket.io ready for chat connections");
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });
