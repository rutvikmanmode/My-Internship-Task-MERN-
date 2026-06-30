const express = require("express");
const cloudinary = require("cloudinary").v2;
const jwt = require("jsonwebtoken");

const GameAboutUser = require("../models/gamemodels/gameaboutuser");
const GameCoinHistory = require("../models/gamemodels/gamecoinhistory");
const GameDailyRewards = require("../models/gamemodels/gamedailyrewads");
const GameMiniGame = require("../models/gamemodels/gameminigame");
const GameUser = require("../models/gamemodels/gameuser");

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIREBASE_AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1";
const SESSION_KEY = "gameUserId";
const JWT_EXPIRES_IN = "7d";

function getJwtSecret() {
    return process.env.JWT_SECRET || "fallback-jwt-secret";
}

function signGameToken(userId) {
    return jwt.sign({ gameUserId: String(userId) }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

function extractGameUserId(req) {
    // Try session first.
    if (req.session && req.session[SESSION_KEY]) {
        return String(req.session[SESSION_KEY]);
    }

    // Fall back to JWT from Authorization header.
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        return decoded.gameUserId || null;
    } catch {
        return null;
    }
}

function getFirebaseApiKey() {
    return (
        process.env.FIREBASE_API_KEY ||
        process.env.VITE_FIREBASE_API_KEY ||
        ""
    ).trim();
}

function sanitizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function sanitizeDisplayName(value, fallbackEmail = "") {
    const name = typeof value === "string" ? value.trim() : "";
    if (name) {
        return name;
    }

    return fallbackEmail ? fallbackEmail.split("@")[0] : "";
}

function sanitizeOptionalText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeEnvValue(value) {
    return typeof value === "string"
        ? value.trim().replace(/^['"]|['"]$/g, "")
        : "";
}

function extractFirebaseErrorMessage(errorCode) {
    switch (errorCode) {
    case "EMAIL_EXISTS":
        return "Email is already registered";
    case "INVALID_EMAIL":
        return "Enter a valid email address";
    case "EMAIL_NOT_FOUND":
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_PASSWORD":
        return "Invalid email or password";
    case "WEAK_PASSWORD : Password should be at least 6 characters":
    case "WEAK_PASSWORD":
        return "Password must be at least 6 characters";
    case "USER_DISABLED":
        return "This account has been disabled";
    case "OPERATION_NOT_ALLOWED":
        return "Firebase email/password sign-in is not enabled";
    case "CONFIGURATION_NOT_FOUND":
        return "Firebase Auth is not enabled for this project. Please enable it in Firebase Console.";
    case "API_KEY_INVALID":
        return "Firebase API Key is invalid. Check your .env configuration.";
    case "MISSING_PASSWORD":
        return "Password is required";
    default:
        return errorCode ? `Firebase authentication failed: ${errorCode}` : "Firebase authentication failed";
    }
}

async function callFirebase(path, payload) {
    const apiKey = getFirebaseApiKey();

    if (!apiKey) {
        const error = new Error("Firebase API key is missing");
        error.status = 500;
        throw error;
    }

    const response = await fetch(`${FIREBASE_AUTH_BASE_URL}${path}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const firebaseCode = data?.error?.message || "";
        const error = new Error(extractFirebaseErrorMessage(firebaseCode));
        error.status = response.status;
        error.firebaseCode = firebaseCode;
        throw error;
    }

    return data;
}

async function lookupFirebaseUser(idToken) {
    return callFirebase("/accounts:lookup", { idToken });
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
        avatarUrl: sanitizeOptionalText(user.avatarUrl),
        about: sanitizeOptionalText(user.about),
        location: sanitizeOptionalText(user.location)
    });
}

async function getOrCreateGameCoinHistory(user, aboutUser) {
    const existingCoinHistory = await GameCoinHistory.findOne({ userId: user._id });

    if (existingCoinHistory) {
        const normalizedEmail = sanitizeEmail(user.email);

        if (existingCoinHistory.email !== normalizedEmail) {
            existingCoinHistory.email = normalizedEmail;
            await existingCoinHistory.save();
        }

        return existingCoinHistory;
    }

    return GameCoinHistory.create({
        userId: user._id,
        email: sanitizeEmail(user.email),
        coins: 0,
        coinEarningHistory: []
    });
}

function buildUserPayload(user, aboutUser, coinHistory) {
    return {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        status: user.status || "active",
        avatarUrl: aboutUser?.avatarUrl || "",
        about: aboutUser?.about || "",
        location: aboutUser?.location || "",
        provider: user.provider,
        coins: Number(coinHistory?.coins || 0),
        lastLoginAt: user.lastLoginAt || null,
        createdAt: user.createdAt || null
    };
}

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

function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
        .filter((value) => typeof value === "string" && value.trim())));
}

function normalizeClaimDates(missionProgress) {
    const uniqueDates = normalizeStringArray(missionProgress?.dailyRewardClaimDates);
    uniqueDates.sort();
    return uniqueDates;
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
        if (diffDays(claimDates[index], claimDates[index - 1]) === 1) {
            streak += 1;
            continue;
        }

        break;
    }

    return streak;
}

function buildGameStatsPayload(user, coinHistory, dailyRewardProgress, miniGameProgress) {
    const todayKey = getDateKey();
    const claimDates = normalizeClaimDates(dailyRewardProgress);
    const streakCount = getCurrentStreak(claimDates, todayKey);
    const zombieRush = miniGameProgress?.gameScores?.zombieRush || {};
    const zombieRun = miniGameProgress?.gameScores?.zombieRun || {};
    const sessionsPlayed = Number(zombieRush.lastScore > 0)
        + Number(zombieRun.lastScore > 0);
    const totalSessions =
        Number(zombieRush.totalSubmittedScore > 0)
        + Number(zombieRun.totalSubmittedScore > 0);

    return {
        profile: {
            userName: dailyRewardProgress?.userName
                || miniGameProgress?.userName
                || user.displayName
                || (user.email ? user.email.split("@")[0] : "")
        },
        wallet: {
            coins: Number(coinHistory?.coins || 0),
            totalCoinsEarned:
                Number(zombieRush.coinsEarned || 0) + Number(zombieRun.coinsEarned || 0),
            rewardStreak: streakCount,
            totalRewardClaims: claimDates.length
        },
        sessions: {
            gamesPlayed: totalSessions,
            activeGamesWithScores: sessionsPlayed,
            lastLoginAt: user.lastLoginAt || null
        },
        gameScores: {
            zombieRush: {
                bestScore: Number(zombieRush.bestScore || 0),
                totalSubmittedScore: Number(zombieRush.totalSubmittedScore || 0),
                coinsEarned: Number(zombieRush.coinsEarned || 0),
                lastScore: Number(zombieRush.lastScore || 0),
                lastSubmittedAt: zombieRush.lastSubmittedAt || null
            },
            zombieRun: {
                bestScore: Number(zombieRun.bestScore || 0),
                totalSubmittedScore: Number(zombieRun.totalSubmittedScore || 0),
                coinsEarned: Number(zombieRun.coinsEarned || 0),
                lastScore: Number(zombieRun.lastScore || 0),
                lastSubmittedAt: zombieRun.lastSubmittedAt || null
            }
        }
    };
}

async function buildFullProfilePayload(user) {
    const [aboutUser, dailyRewardProgress, miniGameProgress] = await Promise.all([
        getOrCreateGameAboutUser(user),
        GameDailyRewards.findOne({ userId: user._id }).lean(),
        GameMiniGame.findOne({ userId: user._id }).lean()
    ]);
    const coinHistory = await getOrCreateGameCoinHistory(user, aboutUser);

    return {
        ...buildUserPayload(user, aboutUser, coinHistory),
        stats: buildGameStatsPayload(user, coinHistory, dailyRewardProgress, miniGameProgress)
    };
}

function isUserBanned(user) {
    return String(user?.status || "active").trim().toLowerCase() === "banned";
}

function clearGameSession(req) {
    delete req.session[SESSION_KEY];
}

function respondBanned(req, res) {
    clearGameSession(req);
    return res.status(403).json({
        success: false,
        message: "You are banned by admin"
    });
}

async function persistGameUser(authData, requestedDisplayName) {
    const email = sanitizeEmail(authData.email);
    const displayName = sanitizeDisplayName(
        requestedDisplayName || authData.displayName,
        email
    );

    const user = await GameUser.findOneAndUpdate(
        { firebaseUid: authData.localId },
        {
            $set: {
                email,
                firebaseUid: authData.localId,
                displayName,
                provider: authData.providerId || "password",
                lastLoginAt: new Date()
            }
        },
        {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    if (!user) {
        throw new Error("Failed to save game user");
    }

    if (isUserBanned(user)) {
        const error = new Error("You are banned by admin");
        error.status = 403;
        throw error;
    }

    const aboutUser = await getOrCreateGameAboutUser(user);
    await getOrCreateGameCoinHistory(user, aboutUser);
    const nextAvatarUrl = sanitizeOptionalText(authData.photoUrl);

    if (nextAvatarUrl && nextAvatarUrl !== aboutUser.avatarUrl) {
        aboutUser.avatarUrl = nextAvatarUrl;
        await aboutUser.save();
    }

    return user;
}

router.post("/signup", async (req, res) => {
    try {
        const email = sanitizeEmail(req.body.email);
        const password = typeof req.body.password === "string" ? req.body.password : "";
        const displayName = sanitizeDisplayName(req.body.displayName, email);

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ success: false, message: "Enter a valid email address" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        const signUpData = await callFirebase("/accounts:signUp", {
            email,
            password,
            returnSecureToken: true
        });

        if (displayName) {
            await callFirebase("/accounts:update", {
                idToken: signUpData.idToken,
                displayName,
                returnSecureToken: false
            });
        }

        const user = await persistGameUser({
            ...signUpData,
            displayName
        }, displayName);

        req.session[SESSION_KEY] = String(user._id);
        const token = signGameToken(user._id);

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user: await buildFullProfilePayload(user)
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Signup failed",
            code: error.firebaseCode || "SIGNUP_FAILED"
        });
    }
});

router.post("/signin", async (req, res) => {
    try {
        const email = sanitizeEmail(req.body.email);
        const password = typeof req.body.password === "string" ? req.body.password : "";

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const signInData = await callFirebase("/accounts:signInWithPassword", {
            email,
            password,
            returnSecureToken: true
        });

        const user = await persistGameUser(signInData);
        req.session[SESSION_KEY] = String(user._id);
        const token = signGameToken(user._id);

        return res.json({
            success: true,
            message: "Signed in successfully",
            token,
            user: await buildFullProfilePayload(user)
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Signin failed",
            code: error.firebaseCode || "SIGNIN_FAILED"
        });
    }
});

router.post("/google", async (req, res) => {
    try {
        const idToken = typeof req.body.idToken === "string" ? req.body.idToken.trim() : "";

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Firebase ID token is required"
            });
        }

        const lookupData = await lookupFirebaseUser(idToken);
        const firebaseUser = Array.isArray(lookupData.users) ? lookupData.users[0] : null;

        if (!firebaseUser || !firebaseUser.localId || !firebaseUser.email) {
            return res.status(401).json({
                success: false,
                message: "Invalid Firebase Google sign-in"
            });
        }

        const user = await persistGameUser({
            localId: firebaseUser.localId,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "",
            photoUrl: firebaseUser.photoUrl || "",
            providerId: "google.com"
        }, firebaseUser.displayName || "");

        req.session[SESSION_KEY] = String(user._id);
        const token = signGameToken(user._id);

        return res.json({
            success: true,
            message: "Signed in with Google successfully",
            token,
            user: await buildFullProfilePayload(user)
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Google sign-in failed",
            code: error.firebaseCode || "GOOGLE_SIGNIN_FAILED"
        });
    }
});

router.get("/me", async (req, res) => {
    try {
        const gameUserId = extractGameUserId(req);

        if (!gameUserId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const user = await GameUser.findById(gameUserId);

        if (!user) {
            clearGameSession(req);
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        if (isUserBanned(user)) {
            return respondBanned(req, res);
        }

        return res.json({
            success: true,
            user: await buildFullProfilePayload(user)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch current user"
        });
    }
});

router.get("/profile", async (req, res) => {
    try {
        const gameUserId = extractGameUserId(req);

        if (!gameUserId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const user = await GameUser.findById(gameUserId);

        if (!user) {
            clearGameSession(req);
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        if (isUserBanned(user)) {
            return respondBanned(req, res);
        }

        return res.json({
            success: true,
            profile: await buildFullProfilePayload(user)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to load profile"
        });
    }
});

router.put("/profile", async (req, res) => {
    try {
        const gameUserId = extractGameUserId(req);

        if (!gameUserId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const user = await GameUser.findById(gameUserId);

        if (!user) {
            clearGameSession(req);
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        if (isUserBanned(user)) {
            return respondBanned(req, res);
        }

        const displayName = sanitizeDisplayName(req.body?.displayName, user.email);
        const about = sanitizeOptionalText(req.body?.about);
        const location = sanitizeOptionalText(req.body?.location);
        const aboutUser = await getOrCreateGameAboutUser(user);

        user.displayName = displayName;
        aboutUser.about = about;
        aboutUser.location = location;
        await Promise.all([user.save(), aboutUser.save()]);

        return res.json({
            success: true,
            message: "Profile updated successfully",
            profile: await buildFullProfilePayload(user)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update profile"
        });
    }
});

router.put("/profile-photo", async (req, res) => {
    try {
        const gameUserId = extractGameUserId(req);

        if (!gameUserId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const user = await GameUser.findById(gameUserId);

        if (!user) {
            clearGameSession(req);
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        if (isUserBanned(user)) {
            return respondBanned(req, res);
        }

        const imageData = sanitizeOptionalText(req.body?.imageData);

        if (!imageData) {
            return res.status(400).json({
                success: false,
                message: "Profile photo is required"
            });
        }

        const cloudConfig = {
            cloud_name: normalizeEnvValue(process.env.CLOUDINARY_CLOUD_NAME),
            api_key: normalizeEnvValue(process.env.CLOUDINARY_API_KEY),
            api_secret: normalizeEnvValue(process.env.CLOUDINARY_API_SECRET)
        };

        if (!cloudConfig.cloud_name || !cloudConfig.api_key || !cloudConfig.api_secret) {
            return res.status(500).json({
                success: false,
                message: "Cloudinary configuration is missing"
            });
        }

        cloudinary.config(cloudConfig);

        const uploadResult = await cloudinary.uploader.upload(imageData, {
            folder: "game-profiles",
            public_id: `game-user-${String(user._id)}`,
            overwrite: true,
            resource_type: "image"
        });

        const aboutUser = await getOrCreateGameAboutUser(user);
        aboutUser.avatarUrl = uploadResult.secure_url || "";
        await aboutUser.save();

        return res.json({
            success: true,
            message: "Profile photo updated successfully",
            profile: await buildFullProfilePayload(user)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to upload profile photo"
        });
    }
});

router.post("/logout", (req, res) => {
    delete req.session[SESSION_KEY];

    return req.session.save((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Logout failed"
            });
        }

        return res.json({
            success: true,
            message: "Logged out successfully"
        });
    });
});

module.exports = router;
