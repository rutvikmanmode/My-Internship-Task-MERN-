const mongoose = require("mongoose");

const gameUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    firebaseUid: {
        type: String,
        required: true,
        trim: true
    },
    displayName: {
        type: String,
        trim: true,
        default: ""
    },
    provider: {
        type: String,
        trim: true,
        default: "password"
    },
    status: {
        type: String,
        enum: ["active", "banned"],
        trim: true,
        default: "active"
    },
    lastLoginAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: "gameusers"
});

gameUserSchema.index({ email: 1 }, { unique: true });
gameUserSchema.index({ firebaseUid: 1 }, { unique: true });
gameUserSchema.index({ lastLoginAt: -1 });

module.exports = mongoose.models.GameUser || mongoose.model("GameUser", gameUserSchema);
