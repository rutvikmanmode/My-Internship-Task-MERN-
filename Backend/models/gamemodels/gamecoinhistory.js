const mongoose = require("mongoose");

const coinEarningHistorySchema = new mongoose.Schema({
    rewardType: {
        type: String,
        trim: true,
        default: ""
    },
    coinsEarned: {
        type: Number,
        min: 0,
        default: 0
    },
    source: {
        type: String,
        trim: true,
        default: ""
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const gameCoinHistorySchema = new mongoose.Schema({
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
    coins: {
        type: Number,
        min: 0,
        default: 0
    },
    coinEarningHistory: {
        type: [coinEarningHistorySchema],
        default: []
    }
}, {
    timestamps: true,
    collection: "gamecoinhistory"
});

gameCoinHistorySchema.index({ coins: -1, createdAt: 1 });

module.exports = mongoose.models.GameCoinHistory || mongoose.model("GameCoinHistory", gameCoinHistorySchema);
