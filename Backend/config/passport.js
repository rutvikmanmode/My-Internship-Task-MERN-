const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");
const ChatUser = require("../models/chatmodels/ChatUser");

function hasUsableGoogleConfig() {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
    const placeholderValues = new Set([
        "",
        "YOUR_GOOGLE_CLIENT_ID_HERE",
        "YOUR_GOOGLE_CLIENT_SECRET_HERE"
    ]);

    return !placeholderValues.has(clientId) && !placeholderValues.has(clientSecret);
}

// Serialize user ID into session.
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session by ID.
passport.deserializeUser(async (id, done) => {
    try {
        const user = await ChatUser.findById(id).select("-password");
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Local Strategy — email + password login.
passport.use(new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
        try {
            const user = await ChatUser.findOne({ email: email.trim().toLowerCase() });

            if (!user) {
                return done(null, false, { message: "No account found with this email" });
            }

            if (!user.password) {
                return done(null, false, { message: "This account uses Google sign-in" });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return done(null, false, { message: "Invalid password" });
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

// Google OAuth Strategy.
if (hasUsableGoogleConfig()) {
    passport.use(new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/chat/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists by googleId.
                let user = await ChatUser.findOne({ googleId: profile.id });

                if (user) {
                    return done(null, user);
                }

                // Check if user exists by email.
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : "";

                if (email) {
                    user = await ChatUser.findOne({ email: email.toLowerCase() });

                    if (user) {
                        // Link Google account to existing user.
                        user.googleId = profile.id;

                        if (!user.displayName && profile.displayName) {
                            user.displayName = profile.displayName;
                        }

                        if (!user.avatarUrl && profile.photos && profile.photos[0]) {
                            user.avatarUrl = profile.photos[0].value;
                        }

                        await user.save();
                        return done(null, user);
                    }
                }

                // Create new user from Google profile.
                const newUser = await ChatUser.create({
                    email: email.toLowerCase(),
                    googleId: profile.id,
                    displayName: profile.displayName || "",
                    avatarUrl: (profile.photos && profile.photos[0]) ? profile.photos[0].value : ""
                });

                return done(null, newUser);
            } catch (error) {
                return done(error);
            }
        }
    ));
}

passport.hasUsableGoogleConfig = hasUsableGoogleConfig;

module.exports = passport;
