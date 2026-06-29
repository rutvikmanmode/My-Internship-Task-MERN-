const mongoose = require("mongoose");

const { DEFAULT_GAME_GLOBAL_CONFIG } = require("./gameglobalconfig");

const dailyMissionSchema = new mongoose.Schema({
    Mission: {
        type: String,
        required: true,
        trim: true
    },
    count: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        required: true,
        trim: true,
        default: "Daily"
    },
    reward: {
        type: Number,
        required: true,
        min: 0
    },
    Image: {
        type: String,
        trim: true,
        default: ""
    },
    mission_name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    }
}, { _id: false });

const DEFAULT_DAILY_MISSIONS = DEFAULT_GAME_GLOBAL_CONFIG.dailyMissions.map((entry) => ({ ...entry }));

const gameDailyMissionSchema = new mongoose.Schema({
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
    dailyMissionCoinsEarned: {
        type: Number,
        min: 0,
        default: 0
    },
    claimedMissionNames: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
    collection: "gamedailymissions"
});

const GameDailyMission = mongoose.models.GameDailyMission || mongoose.model("GameDailyMission", gameDailyMissionSchema);

module.exports = GameDailyMission;
module.exports.dailyMissionSchema = dailyMissionSchema;
module.exports.DEFAULT_DAILY_MISSIONS = DEFAULT_DAILY_MISSIONS;
