const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    otp: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ["register", "forgot"],
        required: true
    },
    // Store pending registration data so we can create the user after OTP verification.
    pendingPassword: {
        type: String,
        default: null
    },
    pendingName: {
        type: String,
        default: ""
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 5 * 60 * 1000)
    }
});

// TTL index — MongoDB automatically deletes documents after expiresAt.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index to speed up lookups by email + purpose.
otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model("Otp", otpSchema);


