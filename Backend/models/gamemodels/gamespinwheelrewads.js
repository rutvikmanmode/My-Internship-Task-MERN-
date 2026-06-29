const mongoose = require("mongoose");

const gameSpinWheelRewardsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GameUser",
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ""
    },
    userName: {
        type: String,
        trim: true,
        default: ""
    },
    spinWheelClaimDates: {
        type: [String],
        default: []
    },
    spinWheelCoinsEarned: {
        type: Number,
        min: 0,
        default: 0
    }
}, {
    timestamps: true,
    collection: "gamespinwheelrewads"
});

module.exports = mongoose.models.GameSpinWheelRewards
    || mongoose.model("GameSpinWheelRewards", gameSpinWheelRewardsSchema);
