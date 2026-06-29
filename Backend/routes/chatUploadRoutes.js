const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

// Configure Cloudinary from environment variables.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer memory storage for temporary file holding.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max.
});

// Middleware to check chat session auth.
function requireChatAuth(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: "Not authenticated"
        });
    }
    next();
}

router.use(requireChatAuth);

// POST /upload — upload media to Cloudinary.
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file provided"
            });
        }

        const fileType = req.body.type || "auto";

        // Determine Cloudinary resource type.
        let resourceType = "auto";
        if (fileType === "image") resourceType = "image";
        else if (fileType === "video" || fileType === "voice") resourceType = "video";
        else if (fileType === "document") resourceType = "raw";

        // Upload to Cloudinary via stream.
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    folder: "chat-media",
                    public_id: `chat_${Date.now()}_${req.user._id}`
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            uploadStream.end(req.file.buffer);
        });

        return res.json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            fileName: req.file.originalname,
            size: result.bytes
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Upload failed",
            details: error.message
        });
    }
});

module.exports = router;
