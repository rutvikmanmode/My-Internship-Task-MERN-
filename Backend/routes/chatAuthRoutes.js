const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const ChatUser = require("../models/chatmodels/ChatUser");

const router = express.Router();
const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirectToChatWithError(res, errorCode) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontendUrl}/chat?error=${encodeURIComponent(errorCode)}`);
}

// POST /signup — register a new chat user.
router.post("/signup", async (req, res) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = typeof req.body.password === "string" ? req.body.password : "";
        const displayName = typeof req.body.displayName === "string" ? req.body.displayName.trim() : "";

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const existingUser = await ChatUser.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await ChatUser.create({
            email,
            password: hashedPassword,
            displayName: displayName || email.split("@")[0]
        });

        // Log the user in after signup.
        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Signup succeeded but auto-login failed"
                });
            }

            return res.status(201).json({
                success: true,
                message: "Account created successfully",
                user: {
                    _id: user._id,
                    email: user.email,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    about: user.about,
                    status: user.status
                }
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Signup failed",
            details: error.message
        });
    }
});

// POST /login — authenticate with email + password.
router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Login failed",
                details: err.message
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: info?.message || "Invalid credentials"
            });
        }

        req.login(user, (loginErr) => {
            if (loginErr) {
                return res.status(500).json({
                    success: false,
                    message: "Session creation failed"
                });
            }

            return res.json({
                success: true,
                user: {
                    _id: user._id,
                    email: user.email,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    about: user.about,
                    status: user.status
                }
            });
        });
    })(req, res, next);
});

// GET /google — redirect to Google OAuth.
router.get("/google", (req, res, next) => {
    if (!passport.hasUsableGoogleConfig()) {
        return redirectToChatWithError(res, "google_not_configured");
    }

    return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// GET /google/callback — handle Google OAuth callback.
router.get("/google/callback", (req, res, next) => {
    if (!passport.hasUsableGoogleConfig()) {
        return redirectToChatWithError(res, "google_not_configured");
    }

    return passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:5173"}/chat?error=google_failed` })(
        req,
        res,
        () => {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
            res.redirect(`${frontendUrl}/chat`);
        }
    );
});

// GET /me — get current authenticated user.
router.get("/me", (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: "Not authenticated"
        });
    }

    return res.json({
        success: true,
        user: {
            _id: req.user._id,
            email: req.user.email,
            displayName: req.user.displayName,
            avatarUrl: req.user.avatarUrl,
            about: req.user.about,
            status: req.user.status,
            isOnline: req.user.isOnline,
            lastSeen: req.user.lastSeen
        }
    });
});

// POST /logout — destroy session.
router.post("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Logout failed"
            });
        }

        req.session.destroy(() => {
            res.clearCookie("connect.sid");
            return res.json({
                success: true,
                message: "Logged out successfully"
            });
        });
    });
});

// PUT /change-password — change user password.
router.put("/change-password", async (req, res) => {
    try {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
        const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters"
            });
        }

        const user = await ChatUser.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Google-only accounts may not have a password set.
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: "Cannot change password for Google-authenticated accounts"
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();

        return res.json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to change password",
            details: error.message
        });
    }
});

module.exports = router;
