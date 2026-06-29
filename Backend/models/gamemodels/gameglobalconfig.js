const mongoose = require("mongoose");

const DEFAULT_GAME_GLOBAL_CONFIG = {
    key: "default",
    dailyLoginRewards: [10, 20, 35, 50, 70, 90, 150],
    spinWheelRewards: [75, 10, 20, 50, 100, 200, 500, 5],
    dailySpinLimit: 2,
    dailyMissions: [
        {
            Mission: "Claim daily reward 1 time",
            count: 1,
            type: "Daily",
            reward: 10,
            Image: "",
            mission_name: "DailyClaim1",
            category: "lifetime_claims"
        },
        {
            Mission: "Claim daily reward 3 days",
            count: 3,
            type: "Daily",
            reward: 50,
            Image: "",
            mission_name: "DailyClaim3Days",
            category: "lifetime_claims"
        },
        {
            Mission: "Claim daily reward 7 days",
            count: 7,
            type: "Daily",
            reward: 150,
            Image: "",
            mission_name: "DailyClaim7Days",
            category: "lifetime_claims"
        },
        {
            Mission: "Maintain 5-day reward streak",
            count: 5,
            type: "Daily",
            reward: 100,
            Image: "",
            mission_name: "Streak5Days",
            category: "streak"
        },
        {
            Mission: "Maintain 10-day reward streak",
            count: 10,
            type: "Daily",
            reward: 300,
            Image: "",
            mission_name: "Streak10Days",
            category: "streak"
        },
        {
            Mission: "Maintain 30-day reward streak",
            count: 30,
            type: "Daily",
            reward: 1000,
            Image: "",
            mission_name: "Streak30Days",
            category: "streak"
        }
    ],
    weeklyMissions: [
        {
            Mission: "Claim daily reward 3 times this week",
            count: 3,
            type: "Weekly",
            reward: 50,
            Image: "",
            mission_name: "WeeklyClaim3",
            category: "weekly_claims"
        },
        {
            Mission: "Claim daily reward 5 times this week",
            count: 5,
            type: "Weekly",
            reward: 120,
            Image: "",
            mission_name: "WeeklyClaim5",
            category: "weekly_claims"
        },
        {
            Mission: "Claim daily reward 7 times this week",
            count: 7,
            type: "Weekly",
            reward: 300,
            Image: "",
            mission_name: "WeeklyClaim7",
            category: "weekly_claims"
        },
        {
            Mission: "Claim rewards every day for 7 days",
            count: 7,
            type: "Weekly",
            reward: 500,
            Image: "",
            mission_name: "PerfectWeek",
            category: "perfect_week"
        },
        {
            Mission: "Claim at least 6 daily rewards this week",
            count: 6,
            type: "Weekly",
            reward: 250,
            Image: "",
            mission_name: "AlmostPerfectWeek",
            category: "almost_perfect_week"
        }
    ],
    miniGameRewards: [
        {
            game: "zombie-rush",
            missionKey: "zombieRush",
            label: "Zombie Rush",
            rewardType: "divisor",
            divisor: 100,
            multiplier: 1,
            maxReward: 500,
            minScore: 1
        },
        {
            game: "zombie-run",
            missionKey: "zombieRun",
            label: "Zombie Run",
            rewardType: "multiplier",
            divisor: 1,
            multiplier: 1,
            maxReward: 0,
            minScore: 1
        }
    ],
    isActive: true
};

const DEFAULT_DAILY_LOGIN_REWARDS = [...DEFAULT_GAME_GLOBAL_CONFIG.dailyLoginRewards];
const DEFAULT_DAILY_MISSIONS = DEFAULT_GAME_GLOBAL_CONFIG.dailyMissions.map((entry) => ({ ...entry }));
const DEFAULT_WEEKLY_MISSIONS = DEFAULT_GAME_GLOBAL_CONFIG.weeklyMissions.map((entry) => ({ ...entry }));
const DEFAULT_MINI_GAME_REWARDS = DEFAULT_GAME_GLOBAL_CONFIG.miniGameRewards.map((entry) => ({ ...entry }));

const rewardValueSchema = new mongoose.Schema({
    value: {
        type: Number,
        required: true,
        min: 0
    }
});

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
});

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
});

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
});

const gameGlobalConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true,
        default: DEFAULT_GAME_GLOBAL_CONFIG.key
    },
    dailyLoginRewards: {
        type: [rewardValueSchema],
        default: () => DEFAULT_DAILY_LOGIN_REWARDS.map((value) => ({ value }))
    },
    spinWheelRewards: {
        type: [rewardValueSchema],
        default: () => DEFAULT_GAME_GLOBAL_CONFIG.spinWheelRewards.map((value) => ({ value }))
    },
    dailySpinLimit: {
        type: Number,
        default: DEFAULT_GAME_GLOBAL_CONFIG.dailySpinLimit,
        min: 1
    },
    dailyMissions: {
        type: [dailyMissionSchema],
        default: () => DEFAULT_DAILY_MISSIONS.map((entry) => ({ ...entry }))
    },
    weeklyMissions: {
        type: [weeklyMissionSchema],
        default: () => DEFAULT_WEEKLY_MISSIONS.map((entry) => ({ ...entry }))
    },
    miniGameRewards: {
        type: [miniGameRewardSchema],
        default: () => DEFAULT_MINI_GAME_REWARDS.map((entry) => ({ ...entry }))
    },
    isActive: {
        type: Boolean,
        default: DEFAULT_GAME_GLOBAL_CONFIG.isActive
    }
}, {
    timestamps: true,
    collection: "gameglobalconfig"
});

gameGlobalConfigSchema.index({ key: 1 }, { unique: true });
gameGlobalConfigSchema.index({ isActive: 1, key: 1 });

const GameGlobalConfig = mongoose.models.GameGlobalConfig || mongoose.model("GameGlobalConfig", gameGlobalConfigSchema);

module.exports = GameGlobalConfig;
module.exports.DEFAULT_GAME_GLOBAL_CONFIG = DEFAULT_GAME_GLOBAL_CONFIG;
