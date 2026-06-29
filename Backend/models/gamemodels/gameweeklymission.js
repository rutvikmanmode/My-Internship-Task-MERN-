const mongoose = require("mongoose");

const { DEFAULT_GAME_GLOBAL_CONFIG } = require("./gameglobalconfig");

const weeklyMissionSchema = new mongoose.Schema({
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
        default: "Weekly"
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

const DEFAULT_WEEKLY_MISSIONS = DEFAULT_GAME_GLOBAL_CONFIG.weeklyMissions.map((entry) => ({ ...entry }));

const gameWeeklyMissionSchema = new mongoose.Schema({
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
    weeklyMissionCoinsEarned: {
        type: Number,
        min: 0,
        default: 0
    },
    claimedWeeklyMissionKeys: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
    collection: "gameweeklymissions"
});

const GameWeeklyMission = mongoose.models.GameWeeklyMission || mongoose.model("GameWeeklyMission", gameWeeklyMissionSchema);

module.exports = GameWeeklyMission;
module.exports.weeklyMissionSchema = weeklyMissionSchema;
module.exports.DEFAULT_WEEKLY_MISSIONS = DEFAULT_WEEKLY_MISSIONS;
