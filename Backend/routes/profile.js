const express = require("express");
const cloudinary = require("cloudinary").v2;

const User = require("../models/User");
const hmacMiddleware = require("../middleware/hmacMiddleware");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();
function normalizeEnvValue(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

// Apply app-level HMAC auth to all profile routes.
router.use(hmacMiddleware);

// GET /api/profile - protected by JWT middleware.
router.get("/", jwtMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select(
            "email name phone role about skills location avatarUrl"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            about: user.about,
            skills: user.skills,
            location: user.location,
            avatarUrl: user.avatarUrl
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile"
        });
    }
});

// PUT /api/profile - protected by JWT middleware.
router.put("/", jwtMiddleware, async (req, res) => {
    try {
        const { name, phone, role, about, skills, location, avatarUrl } =
            req.body || {};

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (typeof name === "string") user.name = name.trim();
        if (typeof phone === "string") user.phone = phone.trim();
        if (typeof role === "string") user.role = role.trim();
        if (typeof about === "string") user.about = about.trim();
        if (typeof location === "string") user.location = location.trim();
        if (typeof avatarUrl === "string") user.avatarUrl = avatarUrl.trim();
        if (Array.isArray(skills)) {
            user.skills = skills
                .filter((skill) => typeof skill === "string")
                .map((skill) => skill.trim())
                .filter(Boolean);
        }

        await user.save();

        return res.json({
            success: true,
            message: "Profile updated successfully",
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            about: user.about,
            skills: user.skills,
            location: user.location,
            avatarUrl: user.avatarUrl
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update profile",
            details: error.message
        });
    }
});

module.exports = router;











