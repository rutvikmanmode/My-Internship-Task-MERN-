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

router.use(hmacMiddleware);

// PUT /api/photos/profile - upload profile photo
router.put("/profile", jwtMiddleware, async (req, res) => {
    try {
        const { imageData } = req.body || {};

        if (!imageData || typeof imageData !== "string") {
            return res.status(400).json({
                success: false,
                message: "Profile photo is required"
            });
        }

        const cloudConfig = {
            cloud_name: normalizeEnvValue(process.env.CLOUDINARY_CLOUD_NAME),
            api_key: normalizeEnvValue(process.env.CLOUDINARY_API_KEY),
            api_secret: normalizeEnvValue(process.env.CLOUDINARY_API_SECRET)
        };

        if (!cloudConfig.cloud_name || !cloudConfig.api_key || !cloudConfig.api_secret) {
            return res.status(500).json({
                success: false,
                message: "Cloudinary configuration is missing"
            });
        }

        cloudinary.config(cloudConfig);

        const uploadResult = await cloudinary.uploader.upload(imageData, {
            folder: "profiles",
            resource_type: "image"
        });

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.avatarUrl = uploadResult.secure_url;
        await user.save();

        return res.json({
            success: true,
            message: "Profile photo updated",
            avatarUrl: user.avatarUrl
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to upload profile photo",
            details: error.message
        });
    }
});

module.exports = router;
