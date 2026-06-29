const mongoose = require("mongoose");

const { DEFAULT_GAME_GLOBAL_CONFIG } = require("./gameglobalconfig");

const miniGameRewardSchema = new mongoose.Schema({
    game: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    missionKey: {
        type: String,
        required: true,
        trim: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    rewardType: {
        type: String,
        enum: ["divisor", "multiplier"],
        default: "multiplier"
    },
    divisor: {
        type: Number,
        default: 1,
        min: 1
    },
    multiplier: {
        type: Number,
        default: 1,
        min: 0
    },
    maxReward: {
        type: Number,
        default: 0,
        min: 0
    },
    minScore: {
        type: Number,
        default: 1,
        min: 0
    }
}, { _id: false });

const DEFAULT_MINI_GAME_REWARDS = DEFAULT_GAME_GLOBAL_CONFIG.miniGameRewards.map((entry) => ({ ...entry }));

const gameScoreSchema = new mongoose.Schema({
    bestScore: {
        type: Number,
        min: 0,
        default: 0
    },
    totalSubmittedScore: {
        type: Number,
        min: 0,
        default: 0
    },
    coinsEarned: {
        type: Number,
        min: 0,
        default: 0
    },
    lastScore: {
        type: Number,
        min: 0,
        default: 0
    },
    lastSubmittedAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const gameMiniGameSchema = new mongoose.Schema({
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
    miniGameCoinsEarned: {
        type: Number,
        min: 0,
        default: 0
    },
    gameScores: {
        zombieRush: {
            type: gameScoreSchema,
            default: () => ({})
        },
        zombieRun: {
            type: gameScoreSchema,
            default: () => ({})
        }
    }
}, {
    timestamps: true,
    collection: "gameminigames"
});

const GameMiniGame = mongoose.models.GameMiniGame || mongoose.model("GameMiniGame", gameMiniGameSchema);

module.exports = GameMiniGame;
module.exports.miniGameRewardSchema = miniGameRewardSchema;
module.exports.DEFAULT_MINI_GAME_REWARDS = DEFAULT_MINI_GAME_REWARDS;
