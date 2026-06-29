const express = require("express");
const mongoose = require("mongoose");

const GameAboutUser = require("../models/gamemodels/gameaboutuser");
const GameCoinHistory = require("../models/gamemodels/gamecoinhistory");
const GameDailyRewards = require("../models/gamemodels/gamedailyrewads");
const GameDailyMission = require("../models/gamemodels/gamedialymission");
const GameGlobalConfig = require("../models/gamemodels/gameglobalconfig");
const { DEFAULT_GAME_GLOBAL_CONFIG } = GameGlobalConfig;
const GameMiniGame = require("../models/gamemodels/gameminigame");
const GameSpinWheelRewards = require("../models/gamemodels/gamespinwheelrewads");
const GameUser = require("../models/gamemodels/gameuser");
const GameWeeklyMission = require("../models/gamemodels/gameweeklymission");

const router = express.Router();
const SESSION_KEY = "gameUserId";
const DEFAULT_DAILY_LOGIN_REWARDS = DEFAULT_GAME_GLOBAL_CONFIG.dailyLoginRewards;
const DEFAULT_SPIN_WHEEL_REWARDS = DEFAULT_GAME_GLOBAL_CONFIG.spinWheelRewards;
const DEFAULT_DAILY_SPIN_LIMIT = DEFAULT_GAME_GLOBAL_CONFIG.dailySpinLimit;
const DEFAULT_DAILY_MISSIONS = DEFAULT_GAME_GLOBAL_CONFIG.dailyMissions;
const DEFAULT_WEEKLY_MISSIONS = DEFAULT_GAME_GLOBAL_CONFIG.weeklyMissions;
const DEFAULT_MINI_GAME_REWARDS = DEFAULT_GAME_GLOBAL_CONFIG.miniGameRewards;
const BANNED_USER_MESSAGE = "You are banned by admin";

function getDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function getUtcDateFromKey(dateKey) {
    return new Date(`${dateKey}T00:00:00.000Z`);
}

function diffDays(dateKeyA, dateKeyB) {
    const a = getUtcDateFromKey(dateKeyA);
    const b = getUtcDateFromKey(dateKeyB);
    return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function getWeekStartUtc(date = new Date()) {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utcDate.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    utcDate.setUTCDate(utcDate.getUTCDate() + diffToMonday);
    return utcDate;
}

function getWeekKey(date = new Date()) {
    return getWeekStartUtc(date).toISOString().slice(0, 10);
}

function getWeekRange(date = new Date()) {
    const start = getWeekStartUtc(date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return {
        startKey: getDateKey(start),
        endKey: getDateKey(end)
    };
}

function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
        .filter((value) => typeof value === "string" && value.trim())));
}

function normalizeDateArray(values) {
    return (Array.isArray(values) ? values : [])
        .filter((value) => typeof value === "string" && value.trim());
}

function normalizeClaimDates(missionProgress) {
    const source = missionProgress?.dailyRewards || missionProgress;
    const uniqueDates = normalizeStringArray(source?.dailyRewardClaimDates);
    uniqueDates.sort();
    return uniqueDates;
}

function normalizeSpinClaimDates(missionProgress) {
    const source = missionProgress?.spinWheelRewards || missionProgress;
    const spinDates = normalizeDateArray(source?.spinWheelClaimDates);
    spinDates.sort();
    return spinDates;
}

function getClaimedMissionNames(missionProgress) {
    const source = missionProgress?.dailyMissions || missionProgress;
    return normalizeStringArray(source?.claimedMissionNames);
}

function getClaimedWeeklyMissionKeys(missionProgress) {
    const source = missionProgress?.weeklyMissions || missionProgress;
    return normalizeStringArray(source?.claimedWeeklyMissionKeys);
}

function getMiniGameScores(missionProgress) {
    return missionProgress?.miniGames?.gameScores || missionProgress?.gameScores || {};
}

function getSpinWheelCoinsEarned(missionProgress) {
    const source = missionProgress?.spinWheelRewards || missionProgress;
    return Number(source?.spinWheelCoinsEarned || 0);
}

function getProgressDocs(missionProgress) {
    return [
        missionProgress?.dailyRewards,
        missionProgress?.spinWheelRewards,
        missionProgress?.dailyMissions,
        missionProgress?.weeklyMissions,
        missionProgress?.miniGames
    ].filter(Boolean);
}

function getCurrentStreak(claimDates, todayKey) {
    if (!claimDates.length) {
        return 0;
    }

    const lastClaimKey = claimDates[claimDates.length - 1];
    const sinceLastClaim = diffDays(todayKey, lastClaimKey);

    if (sinceLastClaim > 1) {
        return 0;
    }

    let streak = 1;

    for (let index = claimDates.length - 1; index > 0; index -= 1) {
        const current = claimDates[index];
        const previous = claimDates[index - 1];

        if (diffDays(current, previous) === 1) {
            streak += 1;
            continue;
        }

        break;
    }

    return streak;
}

function getWeeklyClaimDates(claimDates, weekStartKey, weekEndKey) {
    return claimDates.filter((dateKey) => dateKey >= weekStartKey && dateKey <= weekEndKey);
}

function normalizeNumberArray(values, fallback) {
    const numbers = (Array.isArray(values) ? values : [])
        .map((value) => {
            if (value && typeof value === "object" && !Array.isArray(value)) {
                return Number(value.value);
            }

            return Number(value);
        })
        .filter((value) => Number.isFinite(value) && value >= 0);

    return numbers.length ? numbers : [...fallback];
}

function normalizeMissionList(values, fallback, expectedType) {
    const missions = (Array.isArray(values) ? values : [])
        .map((mission) => {
            const count = Number(mission?.count);
            const reward = Number(mission?.reward);
            const missionName = typeof mission?.mission_name === "string" ? mission.mission_name.trim() : "";
            const missionLabel = typeof mission?.Mission === "string" ? mission.Mission.trim() : "";
            const category = typeof mission?.category === "string" ? mission.category.trim() : "";
            const type = typeof mission?.type === "string" ? mission.type.trim() : expectedType;

            if (!missionName || !missionLabel || !category || type !== expectedType) {
                return null;
            }

            if (!Number.isFinite(count) || count < 0 || !Number.isFinite(reward) || reward < 0) {
                return null;
            }

            return {
                Mission: missionLabel,
                count: Math.floor(count),
                type,
                reward: Math.floor(reward),
                Image: typeof mission?.Image === "string" ? mission.Image.trim() : "",
                mission_name: missionName,
                category
            };
        })
        .filter(Boolean);

    return missions.length ? missions : fallback.map((mission) => ({ ...mission }));
}

function normalizeMiniGameRewardList(values, fallback) {
    const rewards = (Array.isArray(values) ? values : [])
        .map((entry) => {
            const game = typeof entry?.game === "string" ? entry.game.trim().toLowerCase() : "";
            const missionKey = typeof entry?.missionKey === "string" ? entry.missionKey.trim() : "";
            const label = typeof entry?.label === "string" ? entry.label.trim() : "";
            const rewardType = entry?.rewardType === "divisor" ? "divisor" : "multiplier";
            const divisor = Number(entry?.divisor);
            const multiplier = Number(entry?.multiplier);
            const maxReward = Number(entry?.maxReward);
            const minScore = Number(entry?.minScore);

            if (!game || !missionKey || !label) {
                return null;
            }

            return {
                game,
                missionKey,
                label,
                rewardType,
                divisor: Number.isFinite(divisor) && divisor > 0 ? divisor : 1,
                multiplier: Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1,
                maxReward: Number.isFinite(maxReward) && maxReward >= 0 ? Math.floor(maxReward) : 0,
                minScore: Number.isFinite(minScore) && minScore >= 0 ? Math.floor(minScore) : 1
            };
        })
        .filter(Boolean);

    return rewards.length ? rewards : fallback.map((entry) => ({ ...entry }));
}

function normalizeRewardConfigDoc(rewardConfigDoc) {
    return {
        dailyLoginRewards: normalizeNumberArray(
            rewardConfigDoc?.dailyLoginRewards,
            DEFAULT_DAILY_LOGIN_REWARDS
        ),
        spinWheelRewards: normalizeNumberArray(
            rewardConfigDoc?.spinWheelRewards,
            DEFAULT_SPIN_WHEEL_REWARDS
        ),
        dailySpinLimit: Math.max(
            1,
            normalizeNonNegativeNumber(rewardConfigDoc?.dailySpinLimit) || DEFAULT_DAILY_SPIN_LIMIT
        ),
        dailyMissions: normalizeMissionList(
            rewardConfigDoc?.dailyMissions,
            DEFAULT_DAILY_MISSIONS,
            "Daily"
        ),
        weeklyMissions: normalizeMissionList(
            rewardConfigDoc?.weeklyMissions,
            DEFAULT_WEEKLY_MISSIONS,
            "Weekly"
        ),
        miniGameRewards: normalizeMiniGameRewardList(
            rewardConfigDoc?.miniGameRewards,
            DEFAULT_MINI_GAME_REWARDS
        )
    };
}

function buildPersistableRewardConfig(config = DEFAULT_GAME_GLOBAL_CONFIG) {
    const normalizedConfig = normalizeRewardConfigDoc(config);

    return {
        key: typeof config?.key === "string" && config.key.trim()
            ? config.key.trim()
            : DEFAULT_GAME_GLOBAL_CONFIG.key,
        isActive: typeof config?.isActive === "boolean"
            ? config.isActive
            : DEFAULT_GAME_GLOBAL_CONFIG.isActive,
        dailyLoginRewards: normalizedConfig.dailyLoginRewards.map((value) => ({ value })),
        spinWheelRewards: normalizedConfig.spinWheelRewards.map((value) => ({ value })),
        dailySpinLimit: normalizedConfig.dailySpinLimit,
        dailyMissions: normalizedConfig.dailyMissions.map((mission) => ({ ...mission })),
        weeklyMissions: normalizedConfig.weeklyMissions.map((mission) => ({ ...mission })),
        miniGameRewards: normalizedConfig.miniGameRewards.map((entry) => ({ ...entry }))
    };
}

function normalizeNonNegativeNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0
        ? Math.floor(numericValue)
        : 0;
}

function sanitizeOptionalEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function sanitizeOptionalUserName(value, fallbackEmail = "") {
    const userName = typeof value === "string" ? value.trim() : "";

    if (userName) {
        return userName;
    }

    return fallbackEmail ? fallbackEmail.split("@")[0] : "";
}

async function getOrCreateGameAboutUser(user) {
    const existingProfile = await GameAboutUser.findOne({ userId: user._id });

    if (existingProfile) {
        let hasChanges = false;

        if (typeof user.avatarUrl === "string" && user.avatarUrl.trim() && !existingProfile.avatarUrl) {
            existingProfile.avatarUrl = user.avatarUrl.trim();
            hasChanges = true;
        }

        if (typeof user.about === "string" && user.about.trim() && !existingProfile.about) {
            existingProfile.about = user.about.trim();
            hasChanges = true;
        }

        if (typeof user.location === "string" && user.location.trim() && !existingProfile.location) {
            existingProfile.location = user.location.trim();
            hasChanges = true;
        }

        if (hasChanges) {
            await existingProfile.save();
        }

        return existingProfile;
    }

    return GameAboutUser.create({
        userId: user._id,
        avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl.trim() : "",
        about: typeof user.about === "string" ? user.about.trim() : "",
        location: typeof user.location === "string" ? user.location.trim() : ""
    });
}

async function getOrCreateGameCoinHistory(user, aboutUser) {
    const userId = user?._id;
    const existingCoinHistory = await GameCoinHistory.findOne({ userId: user._id });

    if (existingCoinHistory) {
        const normalizedEmail = sanitizeOptionalEmail(user?.email);

        if (existingCoinHistory.email !== normalizedEmail) {
            existingCoinHistory.email = normalizedEmail;
            await existingCoinHistory.save();
        }

        return existingCoinHistory;
    }

    const [legacyDailyRewardDoc, legacyDailyMissionDoc, legacyWeeklyMissionDoc, legacySpinWheelDoc, legacyMiniGameDoc, legacyWalletDoc] = await Promise.all([
        GameDailyRewards.collection.findOne({ userId }, { projection: { coins: 1, coinEarningHistory: 1 } }),
        GameDailyMission.collection.findOne({ userId }, { projection: { coins: 1, coinEarningHistory: 1 } }),
        GameWeeklyMission.collection.findOne({ userId }, { projection: { coins: 1, coinEarningHistory: 1 } }),
        GameSpinWheelRewards.collection.findOne({ userId }, { projection: { coins: 1, coinEarningHistory: 1 } }),
        GameMiniGame.collection.findOne({ userId }, { projection: { coins: 1, coinEarningHistory: 1 } }),
        mongoose.connection.collection("gameerewards").findOne({ userId }, { projection: { coins: 1, coinEarningHistory: 1 } })
    ]);

    const legacyDocs = [
        { source: "daily_rewards", doc: legacyDailyRewardDoc },
        { source: "daily_mission", doc: legacyDailyMissionDoc },
        { source: "weekly_mission", doc: legacyWeeklyMissionDoc },
        { source: "spin_wheel", doc: legacySpinWheelDoc },
        { source: "mini_game", doc: legacyMiniGameDoc },
        { source: "wallet", doc: legacyWalletDoc }
    ];

    const legacyCoins = legacyDocs.reduce(
        (maxCoins, entry) => Math.max(maxCoins, Number(entry.doc?.coins || 0)),
        Math.max(0, Number(aboutUser?.coins || user?.coins || 0))
    );

    const coinEarningHistory = legacyDocs
        .flatMap((entry) => (Array.isArray(entry.doc?.coinEarningHistory) ? entry.doc.coinEarningHistory.map((historyEntry) => ({
            rewardType: typeof historyEntry?.rewardType === "string" ? historyEntry.rewardType.trim() : "",
            coinsEarned: Number(historyEntry?.coinsEarned || 0),
            source: entry.source,
            createdAt: new Date()
        })) : []))
        .filter((entry) => entry.rewardType && entry.coinsEarned > 0);

    return GameCoinHistory.create({
        userId: user._id,
        email: sanitizeOptionalEmail(user?.email),
        coins: legacyCoins,
        coinEarningHistory
    });
}

async function cleanupLegacyCoinFields(userId) {
    await Promise.all([
        GameDailyRewards.collection.updateOne(
            { userId },
            { $unset: { coins: "", coinEarningHistory: "" } }
        ),
        GameDailyMission.collection.updateOne(
            { userId },
            { $unset: { coins: "", coinEarningHistory: "" } }
        ),
        GameWeeklyMission.collection.updateOne(
            { userId },
            { $unset: { coins: "", coinEarningHistory: "" } }
        ),
        GameSpinWheelRewards.collection.updateOne(
            { userId },
            { $unset: { coins: "", coinEarningHistory: "" } }
        ),
        GameMiniGame.collection.updateOne(
            { userId },
            { $unset: { coins: "", coinEarningHistory: "" } }
        ),
        mongoose.connection.collection("gameerewards").updateOne(
            { userId },
            { $unset: { coins: "", coinEarningHistory: "" } }
        )
    ]);
}

function appendCoinEarningHistory(coinHistory, entry) {
    if (!coinHistory || !entry || Number(entry.coinsEarned || 0) <= 0) {
        return;
    }

    const nextEntry = {
        rewardType: typeof entry.rewardType === "string" ? entry.rewardType.trim() : "",
        coinsEarned: Number(entry.coinsEarned || 0),
        source: typeof entry.source === "string" ? entry.source.trim() : "",
        createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date()
    };

    const existingHistory = Array.isArray(coinHistory.coinEarningHistory)
        ? coinHistory.coinEarningHistory
        : [];

    coinHistory.coinEarningHistory = [...existingHistory, nextEntry];
}

function syncUserFieldsToGameDocs(user, missionProgress, coinHistory) {
    const normalizedEmail = sanitizeOptionalEmail(user?.email);
    const normalizedUserName = sanitizeOptionalUserName(user?.displayName, normalizedEmail);

    for (const doc of getProgressDocs(missionProgress)) {
        if (doc.email !== normalizedEmail) {
            doc.email = normalizedEmail;
        }
        if (doc.userName !== normalizedUserName) {
            doc.userName = normalizedUserName;
        }
    }

    if (coinHistory && coinHistory.userId && coinHistory.email !== normalizedEmail) {
        coinHistory.email = normalizedEmail;
    }
}

async function getGameRewardsConfig() {
    let rewardConfig = await GameGlobalConfig.findOne({
        isActive: true,
        key: "default"
    }).lean();

    if (!rewardConfig) {
        rewardConfig = await GameGlobalConfig.findOneAndUpdate(
            { key: DEFAULT_GAME_GLOBAL_CONFIG.key },
            {
                $setOnInsert: buildPersistableRewardConfig(DEFAULT_GAME_GLOBAL_CONFIG)
            },
            {
                returnDocument: "after",
                upsert: true,
                setDefaultsOnInsert: true,
                lean: true
            }
        );
    }

    return normalizeRewardConfigDoc(rewardConfig);
}

function buildMissionProgress(mission, context) {
    switch (mission.category) {
    case "lifetime_claims":
        return Math.min(context.totalClaimCount, mission.count);
    case "streak":
        return Math.min(context.streakCount, mission.count);
    case "weekly_claims":
        return Math.min(context.weeklyClaimCount, mission.count);
    case "perfect_week":
        return Math.min(context.weeklyClaimCount === 7 ? 7 : context.weeklyClaimCount, mission.count);
    case "almost_perfect_week":
        return Math.min(context.weeklyClaimCount, mission.count);
    default:
        return 0;
    }
}

function isMissionCompleted(mission, progress) {
    if (mission.category === "perfect_week") {
        return progress >= 7;
    }

    if (mission.category === "almost_perfect_week") {
        return progress >= 6;
    }

    return progress >= mission.count;
}

function buildMissionState(mission, context, missionProgress) {
    const progress = buildMissionProgress(mission, context);
    const completed = isMissionCompleted(mission, progress);
    const weekScopedKey = `${context.weekKey}:${mission.mission_name}`;
    const claimedMissionNames = getClaimedMissionNames(missionProgress);
    const claimedWeeklyMissionKeys = getClaimedWeeklyMissionKeys(missionProgress);
    const claimed = mission.type === "Weekly"
        ? claimedWeeklyMissionKeys.includes(weekScopedKey)
        : claimedMissionNames.includes(mission.mission_name);

    return {
        ...mission,
        progress,
        total: mission.count,
        reward: Number(mission.reward),
        completed,
        claimed,
        claimKey: mission.type === "Weekly" ? weekScopedKey : mission.mission_name,
        canClaim: completed && !claimed
    };
}

function buildRewardTrack(streakCount, hasClaimedToday, rewardCycle) {
    const cycleIndex = hasClaimedToday
        ? ((Math.max(streakCount, 1) - 1) % rewardCycle.length)
        : (streakCount % rewardCycle.length);

    return rewardCycle.map((reward, index) => {
        let status = "locked";

        if (hasClaimedToday) {
            if (index < cycleIndex) {
                status = "claimed";
            } else if (index === cycleIndex) {
                status = "claimed";
            }
        } else {
            if (index < cycleIndex) {
                status = "claimed";
            } else if (index === cycleIndex) {
                status = "available";
            }
        }

        return {
            day: index + 1,
            reward,
            status
        };
    });
}

function buildLevelSummary(coins) {
    const normalizedCoins = Number(coins || 0);
    const level = calculateLevelFromCoins(normalizedCoins);
    const currentLevelFloor = Math.max(0, (level - 1) * 1000);
    const nextLevelFloor = level * 1000;
    const progressTotal = Math.max(1, nextLevelFloor - currentLevelFloor);
    const progressCoins = normalizedCoins - currentLevelFloor;

    return {
        level,
        currentLevelFloor,
        nextLevelFloor,
        progressCoins,
        progressTotal,
        progressPercent: Math.min(100, Math.max(0, Math.round((progressCoins / progressTotal) * 100)))
    };
}

function buildStreakMeta(streakCount, dailyMissions) {
    const streakMissions = dailyMissions
        .filter((mission) => mission.category === "streak")
        .sort((left, right) => left.count - right.count);
    const nextMilestone = streakMissions.find((mission) => mission.count > streakCount) || null;
    const lastMilestone = streakMissions[streakMissions.length - 1] || null;

    return {
        nextTarget: nextMilestone ? nextMilestone.count : (lastMilestone?.count || streakCount || 0),
        nextReward: nextMilestone ? Number(nextMilestone.reward || 0) : 0,
        remainingDays: nextMilestone ? Math.max(0, nextMilestone.count - streakCount) : 0,
        hasMaxMilestone: !nextMilestone && Boolean(lastMilestone)
    };
}

function buildTaskPayload(user, aboutUser, coinHistory, missionProgress, rewardConfig) {
    const todayKey = getDateKey();
    const weekKey = getWeekKey();
    const { startKey, endKey } = getWeekRange();
    const claimDates = normalizeClaimDates(missionProgress);
    const rewardCycle = rewardConfig?.dailyLoginRewards?.length
        ? rewardConfig.dailyLoginRewards
        : DEFAULT_DAILY_LOGIN_REWARDS;
    const dailyMissions = rewardConfig?.dailyMissions?.length
        ? rewardConfig.dailyMissions
        : DEFAULT_DAILY_MISSIONS;
    const weeklyMissions = rewardConfig?.weeklyMissions?.length
        ? rewardConfig.weeklyMissions
        : DEFAULT_WEEKLY_MISSIONS;
    const dailySpinLimit = Math.max(1, Number(rewardConfig?.dailySpinLimit || DEFAULT_DAILY_SPIN_LIMIT));
    const hasClaimedToday = claimDates.includes(todayKey);
    const streakCount = getCurrentStreak(claimDates, todayKey);
    const weeklyClaimDates = getWeeklyClaimDates(claimDates, startKey, endKey);
    const weeklyClaimCount = weeklyClaimDates.length;
    const totalClaimCount = claimDates.length;
    const spinClaimDates = normalizeSpinClaimDates(missionProgress);
    const todaySpinCount = spinClaimDates.filter((dateKey) => dateKey === todayKey).length;
    const spinsRemaining = Math.max(0, dailySpinLimit - todaySpinCount);
    const nextRewardIndex = hasClaimedToday
        ? ((Math.max(streakCount, 1) - 1) % rewardCycle.length)
        : (streakCount % rewardCycle.length);
    const nextRewardAmount = hasClaimedToday ? 0 : rewardCycle[nextRewardIndex];
    const coinBalance = Number(coinHistory?.coins || 0);
    const levelSummary = buildLevelSummary(coinBalance);
    const streakMeta = buildStreakMeta(streakCount, dailyMissions);
    const context = {
        totalClaimCount,
        streakCount,
        weeklyClaimCount,
        weekKey
    };

    const gameScores = getMiniGameScores(missionProgress);

    return {
        wallet: {
            coins: coinBalance,
            totalScore: coinBalance,
            level: levelSummary.level,
            levelProgressPercent: levelSummary.progressPercent,
            levelProgressCoins: levelSummary.progressCoins,
            levelProgressTotal: levelSummary.progressTotal,
            currentLevelFloor: levelSummary.currentLevelFloor,
            nextLevelFloor: levelSummary.nextLevelFloor,
            streakCount,
            totalClaimCount,
            weeklyClaimCount,
            spinLimitPerDay: dailySpinLimit,
            todaySpinCount,
            spinsRemaining,
            spinWheelCoinsEarned: getSpinWheelCoinsEarned(missionProgress),
            hasClaimedToday,
            nextRewardAmount
        },
        streakMeta,
        gameScores: {
            zombieRush: {
                bestScore: Number(gameScores?.zombieRush?.bestScore || 0),
                totalSubmittedScore: Number(gameScores?.zombieRush?.totalSubmittedScore || 0),
                coinsEarned: Number(gameScores?.zombieRush?.coinsEarned || 0),
                lastScore: Number(gameScores?.zombieRush?.lastScore || 0)
            },
            zombieRun: {
                bestScore: Number(gameScores?.zombieRun?.bestScore || 0),
                totalSubmittedScore: Number(gameScores?.zombieRun?.totalSubmittedScore || 0),
                coinsEarned: Number(gameScores?.zombieRun?.coinsEarned || 0),
                lastScore: Number(gameScores?.zombieRun?.lastScore || 0)
            }
        },
        rewardTrack: buildRewardTrack(streakCount, hasClaimedToday, rewardCycle),
        missions: {
            daily: dailyMissions.map((mission) => buildMissionState(mission, context, missionProgress)),
            weekly: weeklyMissions.map((mission) => buildMissionState(mission, context, missionProgress))
        }
    };
}

function buildTaskPayloadForPersistence(user, aboutUser, coinHistory, missionProgress, rewardConfig) {
    syncUserFieldsToGameDocs(user, missionProgress, coinHistory);
    return buildTaskPayload(user, aboutUser, coinHistory, missionProgress, rewardConfig);
}

function calculateLevelFromCoins(coins) {
    return Math.max(1, Math.floor(Number(coins || 0) / 1000) + 1);
}

function buildLeaderboardPlayer(user, aboutUser, coinHistory, missionProgress, rank, todayKey) {
    const claimDates = normalizeClaimDates(missionProgress);
    const coinBalance = Number(coinHistory?.coins || 0);
    return {
        rank,
        userId: String(user._id),
        name: user.displayName || (user.email ? user.email.split("@")[0] : "Anonymous"),
        email: user.email || "",
        avatarUrl: aboutUser?.avatarUrl || "",
        about: aboutUser?.about || "",
        location: aboutUser?.location || "",
        level: calculateLevelFromCoins(coinBalance),
        coins: coinBalance,
        totalScore: coinBalance,
        streak: getCurrentStreak(claimDates, todayKey)
    };
}

function calculateMiniGameCoins(gameConfig, score) {
    if (!gameConfig) {
        return 0;
    }

    if (score < Number(gameConfig.minScore || 1)) {
        return 0;
    }

    let coins = 0;

    if (gameConfig.rewardType === "divisor") {
        coins = Math.floor(score / Math.max(1, Number(gameConfig.divisor || 1)));
    } else {
        coins = Math.floor(score * Number(gameConfig.multiplier || 1));
    }

    if (Number(gameConfig.maxReward || 0) > 0) {
        coins = Math.min(coins, Number(gameConfig.maxReward));
    }

    return Math.max(0, coins);
}

async function getOrCreateGameProgress(userId) {
    const [dailyRewardsDoc, spinWheelRewardsDoc, dailyMissionDoc, weeklyMissionDoc, miniGameDoc, legacyUserDoc, userDoc] = await Promise.all([
        GameDailyRewards.findOne({ userId }),
        GameSpinWheelRewards.findOne({ userId }),
        GameDailyMission.findOne({ userId }),
        GameWeeklyMission.findOne({ userId }),
        GameMiniGame.findOne({ userId }),
        GameUser.collection.findOne(
            { _id: userId },
            {
                projection: {
                    displayName: 1,
                    email: 1,
                    dailyRewardClaimDates: 1,
                    claimedMissionNames: 1,
                    claimedWeeklyMissionKeys: 1
                }
            }
        ),
        GameUser.findById(userId).select("email displayName").lean()
    ]);

    const legacyDailyRewardClaimDates = normalizeStringArray(legacyUserDoc?.dailyRewardClaimDates);
    legacyDailyRewardClaimDates.sort();

    const nextDailyRewardClaimDates = Array.from(new Set([
        ...(dailyRewardsDoc?.dailyRewardClaimDates || []),
        ...legacyDailyRewardClaimDates
    ]));
    nextDailyRewardClaimDates.sort();

    const nextClaimedMissionNames = Array.from(new Set([
        ...(dailyMissionDoc?.claimedMissionNames || []),
        ...normalizeStringArray(legacyUserDoc?.claimedMissionNames)
    ]));

    const nextClaimedWeeklyMissionKeys = Array.from(new Set([
        ...(weeklyMissionDoc?.claimedWeeklyMissionKeys || []),
        ...normalizeStringArray(legacyUserDoc?.claimedWeeklyMissionKeys)
    ]));

    const normalizedEmail = sanitizeOptionalEmail(userDoc?.email || legacyUserDoc?.email);
    const normalizedUserName = sanitizeOptionalUserName(
        userDoc?.displayName || legacyUserDoc?.displayName,
        normalizedEmail
    );

    const dailyRewards = dailyRewardsDoc || new GameDailyRewards({
        userId,
        email: normalizedEmail,
        userName: normalizedUserName
    });
    const dailyMissions = dailyMissionDoc || new GameDailyMission({
        userId,
        email: normalizedEmail,
        userName: normalizedUserName
    });
    const spinWheelRewards = spinWheelRewardsDoc || new GameSpinWheelRewards({
        userId,
        email: normalizedEmail,
        userName: normalizedUserName
    });
    const weeklyMissions = weeklyMissionDoc || new GameWeeklyMission({
        userId,
        email: normalizedEmail,
        userName: normalizedUserName
    });
    const miniGames = miniGameDoc || new GameMiniGame({
        userId,
        email: normalizedEmail,
        userName: normalizedUserName
    });

    const saveOperations = [];

    const hasDailyRewardsChanges = !dailyRewardsDoc
        || JSON.stringify(normalizeClaimDates(dailyRewards)) !== JSON.stringify(nextDailyRewardClaimDates)
        || sanitizeOptionalEmail(dailyRewards.email) !== normalizedEmail
        || sanitizeOptionalUserName(dailyRewards.userName, normalizedEmail) !== normalizedUserName;
    if (hasDailyRewardsChanges) {
        dailyRewards.email = normalizedEmail;
        dailyRewards.userName = normalizedUserName;
        dailyRewards.dailyRewardClaimDates = nextDailyRewardClaimDates;
        saveOperations.push(dailyRewards.save());
    }

    const hasSpinWheelChanges = !spinWheelRewardsDoc
        || sanitizeOptionalEmail(spinWheelRewards.email) !== normalizedEmail
        || sanitizeOptionalUserName(spinWheelRewards.userName, normalizedEmail) !== normalizedUserName;
    if (hasSpinWheelChanges) {
        spinWheelRewards.email = normalizedEmail;
        spinWheelRewards.userName = normalizedUserName;
        saveOperations.push(spinWheelRewards.save());
    }

    const hasDailyMissionChanges = !dailyMissionDoc
        || JSON.stringify(getClaimedMissionNames(dailyMissions)) !== JSON.stringify(nextClaimedMissionNames)
        || sanitizeOptionalEmail(dailyMissions.email) !== normalizedEmail
        || sanitizeOptionalUserName(dailyMissions.userName, normalizedEmail) !== normalizedUserName;
    if (hasDailyMissionChanges) {
        dailyMissions.email = normalizedEmail;
        dailyMissions.userName = normalizedUserName;
        dailyMissions.claimedMissionNames = nextClaimedMissionNames;
        saveOperations.push(dailyMissions.save());
    }

    const hasWeeklyMissionChanges = !weeklyMissionDoc
        || JSON.stringify(getClaimedWeeklyMissionKeys(weeklyMissions)) !== JSON.stringify(nextClaimedWeeklyMissionKeys)
        || sanitizeOptionalEmail(weeklyMissions.email) !== normalizedEmail
        || sanitizeOptionalUserName(weeklyMissions.userName, normalizedEmail) !== normalizedUserName;
    if (hasWeeklyMissionChanges) {
        weeklyMissions.email = normalizedEmail;
        weeklyMissions.userName = normalizedUserName;
        weeklyMissions.claimedWeeklyMissionKeys = nextClaimedWeeklyMissionKeys;
        saveOperations.push(weeklyMissions.save());
    }

    const hasMiniGameChanges = !miniGameDoc
        || sanitizeOptionalEmail(miniGames.email) !== normalizedEmail
        || sanitizeOptionalUserName(miniGames.userName, normalizedEmail) !== normalizedUserName;
    if (hasMiniGameChanges) {
        miniGames.email = normalizedEmail;
        miniGames.userName = normalizedUserName;
        saveOperations.push(miniGames.save());
    }

    if (saveOperations.length) {
        await Promise.all(saveOperations);
    }

    const hasLegacyFields = legacyDailyRewardClaimDates.length
        || normalizeStringArray(legacyUserDoc?.claimedMissionNames).length
        || normalizeStringArray(legacyUserDoc?.claimedWeeklyMissionKeys).length;

    if (hasLegacyFields) {
        await GameUser.collection.updateOne(
            { _id: userId },
            {
                $unset: {
                    dailyRewardClaimDates: "",
                    claimedMissionNames: "",
                    claimedWeeklyMissionKeys: ""
                }
            }
        );
    }

    await cleanupLegacyCoinFields(userId);

    return {
        dailyRewards,
        spinWheelRewards,
        dailyMissions,
        weeklyMissions,
        miniGames
    };
}

async function syncCoinBalance(user, coinHistory, missionProgress) {
    const saveOperations = [];

    syncUserFieldsToGameDocs(user, missionProgress, coinHistory);

    for (const doc of getProgressDocs(missionProgress)) {
        if (doc.isModified()) {
            saveOperations.push(doc.save());
        }
    }

    if (coinHistory?.isModified()) {
        saveOperations.push(coinHistory.save());
    }

    if (saveOperations.length) {
        await Promise.all(saveOperations);
    }
}

async function getAuthenticatedGameUser(req, res) {
    const gameUserId = req.session[SESSION_KEY];

    if (!gameUserId) {
        res.status(401).json({ success: false, message: "Sign in to access missions" });
        return null;
    }

    const user = await GameUser.findById(gameUserId);

    if (!user) {
        delete req.session[SESSION_KEY];
        res.status(401).json({ success: false, message: "Sign in to access missions" });
        return null;
    }

    if (String(user.status || "active").trim().toLowerCase() === "banned") {
        delete req.session[SESSION_KEY];
        res.status(403).json({ success: false, message: BANNED_USER_MESSAGE });
        return null;
    }

    const aboutUser = await getOrCreateGameAboutUser(user);
    const coinHistory = await getOrCreateGameCoinHistory(user, aboutUser);

    return {
        user,
        aboutUser,
        coinHistory
    };
}

router.get("/", async (req, res) => {
    try {
        const gameContext = await getAuthenticatedGameUser(req, res);

        if (!gameContext) {
            return;
        }

        const { user, aboutUser, coinHistory } = gameContext;

        const [missionProgress, rewardConfig] = await Promise.all([
            getOrCreateGameProgress(user._id),
            getGameRewardsConfig()
        ]);
        const taskPayload = buildTaskPayloadForPersistence(user, aboutUser, coinHistory, missionProgress, rewardConfig);
        await syncCoinBalance(user, coinHistory, missionProgress);

        return res.json({
            success: true,
            data: taskPayload
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to load task hub"
        });
    }
});

router.get("/leaderboard", async (req, res) => {
    try {
        const coinHistories = await GameCoinHistory.find({})
            .sort({ coins: -1, createdAt: 1 })
            .limit(100);

        const userIds = coinHistories.map((entry) => entry.userId).filter(Boolean);
        const todayKey = getDateKey();
        const [users, aboutUsers, missionProgressDocs, legacyUserDocs] = await Promise.all([
            GameUser.find({ _id: { $in: userIds } }),
            GameAboutUser.find({ userId: { $in: userIds } }),
            GameDailyRewards.find({ userId: { $in: userIds } }).lean(),
            GameUser.collection.find(
                { _id: { $in: userIds } },
                {
                    projection: {
                        dailyRewardClaimDates: 1,
                        claimedMissionNames: 1,
                        claimedWeeklyMissionKeys: 1
                    }
                }
            ).toArray()
        ]);
        const userById = new Map(users.map((entry) => [String(entry._id), entry]));
        const aboutUserById = new Map(aboutUsers.map((entry) => [String(entry.userId), entry]));
        const coinHistoryByUserId = new Map(coinHistories.map((entry) => [String(entry.userId), entry]));

        const missionProgressByUserId = new Map(
            missionProgressDocs.map((entry) => [String(entry.userId), entry])
        );
        const legacyProgressByUserId = new Map(
            legacyUserDocs.map((entry) => [String(entry._id), entry])
        );

        const players = coinHistories
            .map((coinHistory) => {
                const user = userById.get(String(coinHistory.userId));

                if (!user) {
                    return null;
                }

                return buildLeaderboardPlayer(
                    user,
                    aboutUserById.get(String(user._id)),
                    coinHistoryByUserId.get(String(user._id)),
                    missionProgressByUserId.get(String(user._id)) || legacyProgressByUserId.get(String(user._id)),
                    0,
                    todayKey
                );
            })
            .filter(Boolean)
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));
        const preview = players.slice(0, 5);
        const gameUserId = req.session[SESSION_KEY] ? String(req.session[SESSION_KEY]) : "";
        const currentUser = gameUserId
            ? players.find((player) => player.userId === gameUserId) || null
            : null;

        return res.json({
            success: true,
            data: {
                preview,
                players,
                currentUser,
                totalPlayers: players.length
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to load leaderboard"
        });
    }
});

router.post("/claim-daily-reward", async (req, res) => {
    try {
        const gameContext = await getAuthenticatedGameUser(req, res);

        if (!gameContext) {
            return;
        }

        const { user, aboutUser, coinHistory } = gameContext;

        const missionProgress = await getOrCreateGameProgress(user._id);
        const rewardConfig = await getGameRewardsConfig();
        const todayKey = getDateKey();
        const claimDates = normalizeClaimDates(missionProgress);

        if (claimDates.includes(todayKey)) {
            return res.status(400).json({
                success: false,
                message: "Daily reward already claimed today"
            });
        }

        const currentStreak = getCurrentStreak(claimDates, todayKey);
        const rewardCycle = rewardConfig.dailyLoginRewards;
        const rewardIndex = currentStreak % rewardCycle.length;
        const claimedReward = rewardCycle[rewardIndex];

        missionProgress.dailyRewards.dailyRewardClaimDates = [...claimDates, todayKey];
        coinHistory.coins = Number(coinHistory.coins || 0) + claimedReward;
        missionProgress.dailyRewards.dailyRewardCoinsEarned =
            Number(missionProgress.dailyRewards.dailyRewardCoinsEarned || 0) + claimedReward;
        syncUserFieldsToGameDocs(user, missionProgress, coinHistory);
        appendCoinEarningHistory(coinHistory, {
            rewardType: "daily_login_reward",
            coinsEarned: claimedReward,
            source: "daily_rewards"
        });
        const taskPayload = buildTaskPayloadForPersistence(user, aboutUser, coinHistory, missionProgress, rewardConfig);
        await Promise.all([missionProgress.dailyRewards.save(), coinHistory.save()]);

        return res.json({
            success: true,
            message: `Daily reward claimed: +${claimedReward} coins`,
            claimedReward,
            data: taskPayload
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to claim daily reward"
        });
    }
});

router.post("/claim-mission", async (req, res) => {
    try {
        const missionName = typeof req.body?.missionName === "string" ? req.body.missionName.trim() : "";
        const missionType = typeof req.body?.type === "string" ? req.body.type.trim() : "";
        const gameContext = await getAuthenticatedGameUser(req, res);

        if (!gameContext) {
            return;
        }

        const { user, aboutUser, coinHistory } = gameContext;

        const missionProgress = await getOrCreateGameProgress(user._id);
        const rewardConfig = await getGameRewardsConfig();
        const missionPool = missionType === "Weekly"
            ? rewardConfig.weeklyMissions
            : rewardConfig.dailyMissions;
        const mission = missionPool.find((entry) => entry.mission_name === missionName);

        if (!mission) {
            return res.status(404).json({
                success: false,
                message: "Mission not found"
            });
        }

        const payload = buildTaskPayloadForPersistence(user, aboutUser, coinHistory, missionProgress, rewardConfig);
        const missionState = payload.missions[missionType === "Weekly" ? "weekly" : "daily"]
            .find((entry) => entry.mission_name === missionName);

        if (!missionState?.completed) {
            return res.status(400).json({
                success: false,
                message: "Mission is not complete yet"
            });
        }

        if (missionState.claimed) {
            return res.status(400).json({
                success: false,
                message: "Mission reward already claimed"
            });
        }

        if (missionType === "Weekly") {
            missionProgress.weeklyMissions.claimedWeeklyMissionKeys = [
                ...getClaimedWeeklyMissionKeys(missionProgress),
                missionState.claimKey
            ];
        } else {
            missionProgress.dailyMissions.claimedMissionNames = [
                ...getClaimedMissionNames(missionProgress),
                missionName
            ];
        }

        coinHistory.coins = Number(coinHistory.coins || 0) + Number(mission.reward || 0);
        if (missionType === "Weekly") {
            missionProgress.weeklyMissions.weeklyMissionCoinsEarned =
                Number(missionProgress.weeklyMissions.weeklyMissionCoinsEarned || 0) + Number(mission.reward || 0);
        } else {
            missionProgress.dailyMissions.dailyMissionCoinsEarned =
                Number(missionProgress.dailyMissions.dailyMissionCoinsEarned || 0) + Number(mission.reward || 0);
        }
        syncUserFieldsToGameDocs(user, missionProgress, coinHistory);
        appendCoinEarningHistory(coinHistory, {
            rewardType: missionType === "Weekly" ? "weekly_mission_reward" : "daily_mission_reward",
            coinsEarned: Number(mission.reward || 0),
            source: missionType === "Weekly" ? "weekly_mission" : "daily_mission"
        });
        const taskPayload = buildTaskPayloadForPersistence(user, aboutUser, coinHistory, missionProgress, rewardConfig);
        await Promise.all([
            (missionType === "Weekly" ? missionProgress.weeklyMissions : missionProgress.dailyMissions).save(),
            coinHistory.save()
        ]);

        return res.json({
            success: true,
            message: `Mission claimed: +${mission.reward} coins`,
            data: taskPayload
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to claim mission reward"
        });
    }
});

router.post("/spin-wheel", async (req, res) => {
    try {
        const gameContext = await getAuthenticatedGameUser(req, res);

        if (!gameContext) {
            return;
        }

        const { user, aboutUser, coinHistory } = gameContext;

        const [rewardConfig, missionProgress] = await Promise.all([
            getGameRewardsConfig(),
            getOrCreateGameProgress(user._id)
        ]);
        const todayKey = getDateKey();
        const spinClaimDates = normalizeSpinClaimDates(missionProgress);
        const todaySpinCount = spinClaimDates.filter((dateKey) => dateKey === todayKey).length;

        if (todaySpinCount >= rewardConfig.dailySpinLimit) {
            return res.status(400).json({
                success: false,
                message: "Daily spin limit reached"
            });
        }

        const spinWheelRewards = rewardConfig.spinWheelRewards;
        const rewardIndex = Math.floor(Math.random() * spinWheelRewards.length);
        const reward = spinWheelRewards[rewardIndex];

        coinHistory.coins = Number(coinHistory.coins || 0) + reward;

        missionProgress.spinWheelRewards.spinWheelClaimDates = [...spinClaimDates, todayKey];
        missionProgress.spinWheelRewards.spinWheelCoinsEarned = getSpinWheelCoinsEarned(missionProgress) + reward;
        syncUserFieldsToGameDocs(user, missionProgress, coinHistory);
        appendCoinEarningHistory(coinHistory, {
            rewardType: "spin_wheel_reward",
            coinsEarned: reward,
            source: "spin_wheel"
        });
        const taskPayload = buildTaskPayloadForPersistence(user, aboutUser, coinHistory, missionProgress, rewardConfig);
        await Promise.all([missionProgress.spinWheelRewards.save(), coinHistory.save()]);

        return res.json({
            success: true,
            message: `Spin complete: +${reward} coins`,
            reward,
            rewardIndex,
            rewards: spinWheelRewards,
            data: taskPayload
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to spin reward wheel"
        });
    }
});

router.post("/submit-game-score", async (req, res) => {
    try {
        const gameContext = await getAuthenticatedGameUser(req, res);

        if (!gameContext) {
            return;
        }

        const { user, aboutUser, coinHistory } = gameContext;

        const game = typeof req.body?.game === "string" ? req.body.game.trim().toLowerCase() : "";
        const score = normalizeNonNegativeNumber(req.body?.score);

        if (!score) {
            return res.status(400).json({
                success: false,
                message: "Score must be greater than zero"
            });
        }

        const [missionProgress, rewardConfig] = await Promise.all([
            getOrCreateGameProgress(user._id),
            getGameRewardsConfig()
        ]);

        const resolvedGameConfig = rewardConfig.miniGameRewards.find((entry) => entry.game === game);

        if (!resolvedGameConfig) {
            return res.status(400).json({
                success: false,
                message: "Unsupported game type"
            });
        }

        const missionKey = resolvedGameConfig.missionKey;
        const existingStats = getMiniGameScores(missionProgress)?.[missionKey] || {};
        const awardedCoins = calculateMiniGameCoins(resolvedGameConfig, score);

        if (!awardedCoins) {
            return res.status(400).json({
                success: false,
                message: `${resolvedGameConfig.label} score is too low to convert into coins`
            });
        }

        missionProgress.miniGames.gameScores = missionProgress.miniGames.gameScores || {};
        missionProgress.miniGames.gameScores[missionKey] = {
            bestScore: Math.max(Number(existingStats.bestScore || 0), score),
            totalSubmittedScore: Number(existingStats.totalSubmittedScore || 0) + score,
            coinsEarned: Number(existingStats.coinsEarned || 0) + awardedCoins,
            lastScore: score,
            lastSubmittedAt: new Date()
        };

        coinHistory.coins = Number(coinHistory.coins || 0) + awardedCoins;
        missionProgress.miniGames.miniGameCoinsEarned =
            Number(missionProgress.miniGames.miniGameCoinsEarned || 0) + awardedCoins;
        syncUserFieldsToGameDocs(user, missionProgress, coinHistory);
        appendCoinEarningHistory(coinHistory, {
            rewardType: "mini_game_reward",
            coinsEarned: awardedCoins,
            source: "mini_game"
        });
        const taskPayload = buildTaskPayloadForPersistence(user, aboutUser, coinHistory, missionProgress, rewardConfig);
        await Promise.all([missionProgress.miniGames.save(), coinHistory.save()]);

        return res.json({
            success: true,
            message: `${resolvedGameConfig.label} score converted: +${awardedCoins} coins`,
            awardedCoins,
            game,
            score,
            data: taskPayload
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to submit game score"
        });
    }
});

module.exports = router;
