const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Otp = require("../models/Otp");
const hmacMiddleware = require("../middleware/hmacMiddleware");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const { generateOtp, sendOtpEmail } = require("./otpHelper");

const router = express.Router();
const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Apply HMAC middleware to all auth routes.
router.use(hmacMiddleware);

// POST /register
router.post("/register", async (req, res) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = typeof req.body.password === "string" ? req.body.password : "";
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

        // Validate input.
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

        // Check if user already exists.
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Hash password and save user.
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await User.create({
            email,
            password: hashedPassword,
            name
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed",
            details: error.message
        });
    }
});

// POST /login
router.post("/login", async (req, res) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = typeof req.body.password === "string" ? req.body.password : "";

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Check email exists.
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare password.
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate JWT.
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            success: true,
            token
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Login failed",
            details: error.message
        });
    }
});

// GET /profile — protected by JWT middleware.
router.get("/profile", jwtMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.json({
            success: true,
            email: user.email,
            name: user.name,
            phone: user.phone
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile"
        });
    }
});

// PUT /profile — protected by JWT middleware.
router.put("/profile", jwtMiddleware, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;

        await user.save();

        return res.json({
            success: true,
            message: "Profile updated successfully",
            name: user.name,
            phone: user.phone
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update profile",
            details: error.message
        });
    }
});

// ─── Registration OTP Flow ──────────────────────────────────────────────────

// POST /register/send-otp
// Validates credentials, stores OTP + hashed password, and emails the code.
router.post("/register/send-otp", async (req, res) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = typeof req.body.password === "string" ? req.body.password : "";
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

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

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Remove any previous OTPs for this email + purpose.
        await Otp.deleteMany({ email, purpose: "register" });

        const otp = generateOtp();
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await Otp.create({
            email,
            otp,
            purpose: "register",
            pendingPassword: hashedPassword,
            pendingName: name,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOtpEmail(email, otp, "register");

        return res.json({
            success: true,
            message: "OTP sent to your email"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to send OTP",
            details: error.message
        });
    }
});

// POST /register/verify-otp
// Verifies the OTP and creates the user account.
router.post("/register/verify-otp", async (req, res) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const otpRecord = await Otp.findOne({ email, purpose: "register", otp });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Check expiry manually as a safeguard.
        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteMany({ email, purpose: "register" });
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        // Create the user with the pre-hashed password.
        await User.create({
            email,
            password: otpRecord.pendingPassword,
            name: otpRecord.pendingName || ""
        });

        // Clean up.
        await Otp.deleteMany({ email, purpose: "register" });

        return res.status(201).json({
            success: true,
            message: "Account verified and registered successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Verification failed",
            details: error.message
        });
    }
});

// ─── Forgot Password OTP Flow ───────────────────────────────────────────────

// POST /forgot-password/send-otp
// Verifies email exists and sends a reset OTP.
router.post("/forgot-password/send-otp", async (req, res) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email"
            });
        }

        await Otp.deleteMany({ email, purpose: "forgot" });

        const otp = generateOtp();

        await Otp.create({
            email,
            otp,
            purpose: "forgot",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOtpEmail(email, otp, "forgot");

        return res.json({
            success: true,
            message: "OTP sent to your email"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to send OTP",
            details: error.message
        });
    }
});

// POST /forgot-password/verify-otp
// Verifies the reset OTP and returns a short-lived reset token.
router.post("/forgot-password/verify-otp", async (req, res) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const otpRecord = await Otp.findOne({ email, purpose: "forgot", otp });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteMany({ email, purpose: "forgot" });
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        // Clean up OTP.
        await Otp.deleteMany({ email, purpose: "forgot" });

        // Issue a short-lived reset token (10 minutes).
        const resetToken = jwt.sign(
            { email, purpose: "password-reset" },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );

        return res.json({
            success: true,
            message: "OTP verified",
            resetToken
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Verification failed",
            details: error.message
        });
    }
});

// POST /forgot-password/reset
// Accepts reset token + new password and updates the user.
router.post("/forgot-password/reset", async (req, res) => {
    try {
        const resetToken = typeof req.body.resetToken === "string" ? req.body.resetToken : "";
        const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";

        if (!resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        // Verify reset token.
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        if (decoded.purpose !== "password-reset") {
            return res.status(400).json({
                success: false,
                message: "Invalid reset token"
            });
        }

        const user = await User.findOne({ email: decoded.email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();

        return res.json({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Password reset failed",
            details: error.message
        });
    }
});

module.exports = router;




