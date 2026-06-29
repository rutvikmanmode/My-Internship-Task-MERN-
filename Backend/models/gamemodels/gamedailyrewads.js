const mongoose = require("mongoose");

const { DEFAULT_GAME_GLOBAL_CONFIG } = require("./gameglobalconfig");

const DEFAULT_DAILY_LOGIN_REWARDS = [...DEFAULT_GAME_GLOBAL_CONFIG.dailyLoginRewards];

const gameDailyRewardsSchema = new mongoose.Schema({
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
    dailyRewardCoinsEarned: {
        type: Number,
        min: 0,
        default: 0
    },
    dailyRewardClaimDates: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
    collection: "gamedailyrewads"
});

const GameDailyRewards = mongoose.models.GameDailyRewards || mongoose.model("GameDailyRewards", gameDailyRewardsSchema);

module.exports = GameDailyRewards;
module.exports.DEFAULT_DAILY_LOGIN_REWARDS = DEFAULT_DAILY_LOGIN_REWARDS;
