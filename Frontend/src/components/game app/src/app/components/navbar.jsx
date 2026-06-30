import { motion } from "motion/react";
import { Home, Trophy, Gamepad2, Crown, Target, Mail, Lock, Menu, X, User, Shield, Camera, Coins, Flame, MapPin, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImg from "../../../../../assets/task abomination.png";

const GAME_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};
const FIREBASE_CONFIG_ENV_KEYS = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  appId: "VITE_FIREBASE_APP_ID",
};
const FIREBASE_APP_SCRIPT = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
const FIREBASE_AUTH_SCRIPT = "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js";

function buildGameAuthUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${GAME_API_BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function hasFirebaseClientConfig() {
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.authDomain &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.appId
  );
}

function getMissingFirebaseConfigKeys() {
  return Object.entries(FIREBASE_CONFIG)
    .filter(([, value]) => !value)
    .map(([key]) => FIREBASE_CONFIG_ENV_KEYS[key]);
}

function getFirebaseAuthErrorMessage(error) {
  switch (error?.code) {
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase. Add localhost to Firebase Auth authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled in Firebase Authentication.";
    case "auth/popup-blocked":
      return "The Google sign-in popup was blocked by the browser.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished.";
    case "auth/cancelled-popup-request":
      return "Another Google sign-in popup is already open.";
    case "auth/network-request-failed":
      return "Firebase could not reach Google sign-in. Check your network connection.";
    default:
      return error?.message || "Google sign-in failed";
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function getFirebaseAuthSdk() {
  await loadScript(FIREBASE_APP_SCRIPT);
  await loadScript(FIREBASE_AUTH_SCRIPT);

  const firebaseSdk = window.firebase;

  if (!firebaseSdk?.apps?.length) {
    firebaseSdk.initializeApp(FIREBASE_CONFIG);
  }

  return firebaseSdk;
}

export function Navbar({ activeItem = "home", onNavChange }) {
  const navigate = useNavigate();
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    about: "",
    location: "",
  });
  const [authError, setAuthError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: User },
    { id: "home", label: "Home", icon: Home },
    { id: "tasks", label: "Tasks", icon: Target },
    { id: "rewards", label: "Rewards", icon: Trophy },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "leaderboard", label: "Leaderboard", icon: Crown },
  ];

  const closeSignIn = () => {
    setIsSignInOpen(false);
    setAuthError("");
  };

  const closeLogoutConfirm = () => {
    if (!logoutLoading) {
      setIsLogoutConfirmOpen(false);
    }
  };

  const closeProfile = () => {
    if (!profileLoading && !photoUploading) {
      setIsProfileOpen(false);
      setProfileError("");
      setProfileNotice("");
    }
  };

  const openSignIn = () => {
    setAuthMode("signin");
    setAuthError("");
    setIsMobileMenuOpen(false);
    setIsSignInOpen(true);
  };

  const openCreateAccount = () => {
    setAuthMode("signup");
    setAuthError("");
    setIsMobileMenuOpen(false);
    setIsSignInOpen(true);
  };

  const handleNavClick = (itemId) => {
    setIsMobileMenuOpen(false);

    if (onNavChange) {
      onNavChange(itemId);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch(buildGameAuthUrl("/api/game/auth/profile"), {
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.success) {
          return;
        }

        if (!ignore) {
          const profile = data.profile;
          setAuthUser(profile);
          setProfileForm({
            displayName: profile?.displayName || "",
            about: profile?.about || "",
            location: profile?.location || "",
          });
        }
      } catch {
        // Keep the game navbar usable even if auth is unavailable.
      }
    }

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  const syncProfileState = (profile) => {
    setAuthUser(profile);
    setProfileForm({
      displayName: profile?.displayName || "",
      about: profile?.about || "",
      location: profile?.location || "",
    });
  };

  const resetAuthForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");

    if (!email.trim() || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    if (authMode === "signup") {
      if (!displayName.trim()) {
        setAuthError("Display name is required.");
        return;
      }

      if (password !== confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
    }

    setAuthLoading(true);

    try {
      const endpoint = authMode === "signin" ? "/api/game/auth/signin" : "/api/game/auth/signup";
      const payload = {
        email: email.trim(),
        password,
      };

      if (authMode === "signup") {
        payload.displayName = displayName.trim();
      }

      const response = await fetch(buildGameAuthUrl(endpoint), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Authentication failed");
      }

      syncProfileState(data.user);
      resetAuthForm();
      setIsSignInOpen(false);
      navigate("/game/dashboard");
    } catch (error) {
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError("");

    if (!hasFirebaseClientConfig()) {
      const missingConfigKeys = getMissingFirebaseConfigKeys();
      setAuthError(`Missing Firebase frontend config: ${missingConfigKeys.join(", ")}.`);
      return;
    }

    setGoogleLoading(true);

    try {
      const firebaseSdk = await getFirebaseAuthSdk();
      const provider = new firebaseSdk.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const popupResult = await firebaseSdk.auth().signInWithPopup(provider);
      const idToken = await popupResult.user.getIdToken();

      const response = await fetch(buildGameAuthUrl("/api/game/auth/google"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || `Google sign-in failed on backend (${response.status})`);
      }

      syncProfileState(data.user);
      resetAuthForm();
      setIsSignInOpen(false);
      navigate("/game/dashboard");
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setAuthError(getFirebaseAuthErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);

    try {
      await fetch(buildGameAuthUrl("/api/game/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Keep UI responsive even if the request fails.
    }

    try {
      const firebaseSdk = window.firebase;
      if (firebaseSdk?.auth) {
        await firebaseSdk.auth().signOut();
      }
    } catch {
      // Ignore client-side Firebase logout issues.
    }

    setAuthUser(null);
    setProfileForm({
      displayName: "",
      about: "",
      location: "",
    });
    resetAuthForm();
    setAuthError("");
    setProfileError("");
    setProfileNotice("");
    setIsProfileOpen(false);
    setIsLogoutConfirmOpen(false);
    setLogoutLoading(false);
    navigate("/game");
  };

  const handleProfileFieldChange = (field, value) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileNotice("");
    setProfileLoading(true);

    try {
      const response = await fetch(buildGameAuthUrl("/api/game/auth/profile"), {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update profile");
      }

      syncProfileState(data.profile);
      setProfileNotice(data.message || "Profile updated");
    } catch (error) {
      setProfileError(error.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfilePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setProfileError("");
    setProfileNotice("");
    setPhotoUploading(true);

    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
      });

      const response = await fetch(buildGameAuthUrl("/api/game/auth/profile-photo"), {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to upload profile photo");
      }

      syncProfileState(data.profile);
      setProfileNotice(data.message || "Profile photo updated");
    } catch (error) {
      setProfileError(error.message || "Failed to upload profile photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const avatarLabel = authUser?.displayName || authUser?.email || "Player";
  const avatarInitial = avatarLabel.charAt(0).toUpperCase() || "P";
  const stats = authUser?.stats;
  const statCards = [
    {
      label: "Coins",
      value: Number(stats?.wallet?.coins || 0).toLocaleString(),
      icon: Coins,
    },
    {
      label: "Coins Earned",
      value: Number(stats?.wallet?.totalCoinsEarned || 0).toLocaleString(),
      icon: Trophy,
    },
    {
      label: "Reward Streak",
      value: `${stats?.wallet?.rewardStreak || 0} days`,
      icon: Flame,
    },
    {
      label: "Game Sessions",
      value: `${stats?.sessions?.gamesPlayed || 0}`,
      icon: TimerReset,
    },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 px-3 py-3 sm:px-4 sm:py-4 lg:px-6"
      >
        <div className="max-w-[1400px] mx-auto">
          <div className="backdrop-blur-xl bg-[var(--game-panel-strong)] border border-[color:var(--game-border)] rounded-2xl px-3 py-3 sm:px-5 lg:px-6 shadow-lg shadow-[0_0_30px_rgba(255,223,99,0.08)]">
            <div className="flex items-center justify-between gap-3 sm:gap-6">

              {/* Logo */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex shrink-0 items-center"
              >
                <img
                  src={logoImg}
                  alt="Task Abomination"
                  className="h-8 w-auto max-w-[132px] object-contain drop-shadow-[0_0_18px_rgba(255,223,99,0.2)] sm:h-10 sm:max-w-[180px] lg:h-12 lg:max-w-[220px]"
                />
              </motion.div>

              {/* Nav Items */}
              <div className="hidden lg:flex flex-1 items-center justify-center gap-6 lg:gap-8 xl:gap-10 min-w-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative group px-2 py-2"
                    >
                      <div className="flex items-center gap-2 lg:gap-2.5">
                        <Icon
                          className={`h-[18px] w-[18px] lg:h-5 lg:w-5 shrink-0 transition-colors ${isActive ? "text-[var(--game-accent)]" : "text-[var(--game-muted)]"
                            } group-hover:text-[var(--game-accent)]`}
                        />

                        <span
                          className={`text-[0.9rem] lg:text-[1rem] font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors ${isActive ? "text-[var(--game-accent)]" : "text-[var(--game-muted)]"
                            } group-hover:text-[var(--game-accent)]`}
                          style={{ fontFamily: "var(--game-font-body)" }}
                        >
                          {item.label}
                        </span>
                      </div>

                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] rounded-full shadow-lg shadow-[0_0_16px_rgba(255,223,99,0.35)]"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="hidden lg:flex shrink-0 items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="game-signin-button-wrap"
                >
                  <button
                    type="button"
                    onClick={authUser ? () => setIsLogoutConfirmOpen(true) : openSignIn}
                    className="spiderverse-button game-signin-button"
                  >
                    <span className="glitch-text">{authUser ? "Log Out" : "Sign In"}</span>
                    <div className="glitch-layers" aria-hidden="true">
                      <div className="glitch-layer layer-1">{authUser ? "Log Out" : "Sign In"}</div>
                      <div className="glitch-layer layer-2">{authUser ? "Log Out" : "Sign In"}</div>
                    </div>
                    <div className="noise" aria-hidden="true" />
                    <div className="glitch-slice" aria-hidden="true" />
                  </button>
                </motion.div>

                {authUser && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsProfileOpen(true)}
                    className="game-profile-trigger"
                    aria-label="Open game profile"
                  >
                    {authUser.avatarUrl ? (
                      <img
                        src={authUser.avatarUrl}
                        alt={avatarLabel}
                        className="game-profile-trigger__image"
                      />
                    ) : (
                      <span className="game-profile-trigger__fallback">{avatarInitial}</span>
                    )}
                  </motion.button>
                )}
              </div>
            </div>

            <div className="mt-3 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((current) => !current)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,223,99,0.22)] bg-[rgba(39,10,23,0.72)] text-[var(--game-accent)] transition-colors hover:bg-[rgba(255,223,99,0.08)]"
                  aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="game-mobile-nav"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <div className="min-w-0 flex-1 rounded-xl border border-[rgba(255,223,99,0.12)] bg-[rgba(39,10,23,0.58)] px-3 py-2 text-center">
                  <span
                    className="block truncate text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[var(--game-muted)]"
                    style={{ fontFamily: "var(--game-font-body)" }}
                  >
                    {navItems.find((item) => item.id === activeItem)?.label || "Home"}
                  </span>
                </div>

                {authUser ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="game-profile-trigger h-11 w-11 shrink-0"
                    aria-label="Open game profile"
                  >
                    {authUser.avatarUrl ? (
                      <img
                        src={authUser.avatarUrl}
                        alt={avatarLabel}
                        className="game-profile-trigger__image"
                      />
                    ) : (
                      <span className="game-profile-trigger__fallback">{avatarInitial}</span>
                    )}
                  </motion.button>
                ) : (
                  <button
                    type="button"
                    onClick={openSignIn}
                    className="shrink-0 rounded-xl border border-[rgba(255,223,99,0.22)] bg-[rgba(255,247,239,0.95)] px-3 py-2.5 text-[0.72rem] font-black uppercase tracking-[0.08em] text-[var(--game-bg)] shadow-[0_0_16px_rgba(255,247,239,0.14)]"
                    style={{ fontFamily: "var(--game-font-display)" }}
                  >
                    Sign In
                  </button>
                )}
              </div>

              {isMobileMenuOpen && (
                <motion.div
                  id="game-mobile-nav"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="mt-3 overflow-hidden rounded-2xl border border-[rgba(255,223,99,0.16)] bg-[rgba(39,10,23,0.84)] p-2 shadow-[0_18px_40px_rgba(24,4,10,0.35)] backdrop-blur-xl"
                >
                  <div className="grid gap-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeItem === item.id;

                      return (
                        <motion.button
                          key={`mobile-${item.id}`}
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          whileTap={{ scale: 0.98 }}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                            isActive
                              ? "border-[rgba(255,223,99,0.3)] bg-[rgba(255,223,99,0.14)] text-[var(--game-accent)]"
                              : "border-[rgba(255,223,99,0.12)] bg-[rgba(39,10,23,0.58)] text-[var(--game-muted)]"
                          }`}
                          style={{ fontFamily: "var(--game-font-body)" }}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-[0.8rem] font-semibold uppercase tracking-[0.08em]">
                              {item.label}
                            </span>
                          </span>
                          {isActive ? (
                            <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em]">
                              Active
                            </span>
                          ) : null}
                        </motion.button>
                      );
                    })}

                    {authUser ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsLogoutConfirmOpen(true);
                        }}
                        className="mt-1 rounded-xl border border-[rgba(255,223,99,0.16)] bg-[rgba(255,223,99,0.08)] px-4 py-3 text-left text-[0.8rem] font-bold uppercase tracking-[0.1em] text-[var(--game-accent)] transition-colors hover:bg-[rgba(255,223,99,0.12)]"
                        style={{ fontFamily: "var(--game-font-body)" }}
                      >
                        Log Out
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {isSignInOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-24 pb-10"
          onClick={closeSignIn}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,223,99,0.08),transparent_28%),rgba(20,6,12,0.82)] backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-[rgba(255,223,99,0.22)] bg-[linear-gradient(180deg,rgba(106,22,70,0.98)_0%,rgba(61,20,38,0.96)_100%)] p-5 shadow-[0_28px_80px_rgba(24,4,10,0.55)]"
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(255,223,99,0.10)] via-[rgba(207,125,59,0.06)] to-transparent pointer-events-none" />
            <div className="absolute -left-16 top-12 h-32 w-32 rounded-full bg-[rgba(174,0,33,0.18)] blur-3xl pointer-events-none" />
            <div className="absolute -right-12 bottom-8 h-28 w-28 rounded-full bg-[rgba(255,223,99,0.10)] blur-3xl pointer-events-none" />

            {/* Close button */}
            <div className="relative flex justify-end mb-2">
              <button
                type="button"
                onClick={closeSignIn}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,223,99,0.18)] bg-[rgba(61,20,38,0.72)] text-[var(--game-accent)] transition-colors hover:bg-[rgba(255,223,99,0.12)]"
                aria-label="Close sign in popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab toggles */}
            <div className="relative grid grid-cols-2 gap-1.5 rounded-xl border border-[rgba(255,223,99,0.14)] bg-[rgba(39,10,23,0.68)] p-1">
              <button
                type="button"
                onClick={openSignIn}
                className={`rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-[0.1em] transition-all ${authMode === "signin"
                  ? "bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] text-[var(--game-bg)] shadow-[0_0_14px_rgba(255,223,99,0.18)]"
                  : "text-[var(--game-muted)] hover:text-[var(--game-text)]"
                  }`}
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={openCreateAccount}
                className={`rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-[0.1em] transition-all ${authMode === "signup"
                  ? "bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] text-[var(--game-bg)] shadow-[0_0_14px_rgba(255,223,99,0.18)]"
                  : "text-[var(--game-muted)] hover:text-[var(--game-text)]"
                  }`}
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                Sign Up
              </button>
            </div>

            <form className="relative mt-4 space-y-3" onSubmit={handleAuthSubmit}>
              <label className="block">
                <span
                  className="mb-1 block text-left text-xs font-semibold uppercase tracking-[0.1em] text-[var(--game-muted)]"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Email Address
                </span>
                <div className="group flex items-center gap-2.5 rounded-xl border border-[rgba(207,125,59,0.24)] bg-[linear-gradient(180deg,rgba(61,20,38,0.84)_0%,rgba(49,13,28,0.9)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all focus-within:border-[rgba(255,223,99,0.34)] focus-within:shadow-[0_0_0_1px_rgba(255,223,99,0.16)]">
                  <Mail className="h-4 w-4 shrink-0 text-[var(--game-secondary)] transition-colors group-focus-within:text-[var(--game-accent)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full bg-transparent text-[var(--game-text)] outline-none placeholder:text-[var(--game-subtle)]"
                  />
                </div>
              </label>

              {authMode === "signup" && (
                <label className="block">
                  <span
                    className="mb-1 block text-left text-xs font-semibold uppercase tracking-[0.1em] text-[var(--game-muted)]"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    Display Name
                  </span>
                  <div className="group flex items-center gap-2.5 rounded-xl border border-[rgba(207,125,59,0.24)] bg-[linear-gradient(180deg,rgba(61,20,38,0.84)_0%,rgba(49,13,28,0.9)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all focus-within:border-[rgba(255,223,99,0.34)] focus-within:shadow-[0_0_0_1px_rgba(255,223,99,0.16)]">
                    <User className="h-4 w-4 shrink-0 text-[var(--game-secondary)] transition-colors group-focus-within:text-[var(--game-accent)]" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Your display name"
                      autoComplete="nickname"
                      className="w-full bg-transparent text-[var(--game-text)] outline-none placeholder:text-[var(--game-subtle)]"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span
                  className="mb-1 block text-left text-xs font-semibold uppercase tracking-[0.1em] text-[var(--game-muted)]"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Password
                </span>
                <div className="group flex items-center gap-2.5 rounded-xl border border-[rgba(207,125,59,0.24)] bg-[linear-gradient(180deg,rgba(61,20,38,0.84)_0%,rgba(49,13,28,0.9)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all focus-within:border-[rgba(255,223,99,0.34)] focus-within:shadow-[0_0_0_1px_rgba(255,223,99,0.16)]">
                  <Lock className="h-4 w-4 shrink-0 text-[var(--game-secondary)] transition-colors group-focus-within:text-[var(--game-accent)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                    className="w-full bg-transparent text-[var(--game-text)] outline-none placeholder:text-[var(--game-subtle)]"
                  />
                </div>
              </label>

              {authMode === "signup" && (
                <label className="block">
                  <span
                    className="mb-1 block text-left text-xs font-semibold uppercase tracking-[0.1em] text-[var(--game-muted)]"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    Confirm Password
                  </span>
                  <div className="group flex items-center gap-2.5 rounded-xl border border-[rgba(207,125,59,0.24)] bg-[linear-gradient(180deg,rgba(61,20,38,0.84)_0%,rgba(49,13,28,0.9)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all focus-within:border-[rgba(255,223,99,0.34)] focus-within:shadow-[0_0_0_1px_rgba(255,223,99,0.16)]">
                    <Lock className="h-4 w-4 shrink-0 text-[var(--game-secondary)] transition-colors group-focus-within:text-[var(--game-accent)]" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      className="w-full bg-transparent text-[var(--game-text)] outline-none placeholder:text-[var(--game-subtle)]"
                    />
                  </div>
                </label>
              )}

              {authError && (
                <p
                  className="rounded-xl border border-[rgba(255,120,120,0.25)] bg-[rgba(120,16,24,0.35)] px-3 py-2 text-sm text-[#ffd6d6]"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="mt-1 w-full rounded-xl bg-gradient-to-r from-[var(--game-accent)] via-[#f0a93e] to-[var(--game-secondary)] px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-[var(--game-bg)] shadow-[0_0_20px_rgba(255,223,99,0.18)] transition-all hover:shadow-[0_0_28px_rgba(255,223,99,0.3)] hover:brightness-105"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                {authLoading ? "Please Wait..." : authMode === "signin" ? "Sign In" : "Create Account"}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(255,223,99,0.14)] to-transparent" />
                <span
                  className="text-xs uppercase tracking-[0.15em] text-[var(--game-subtle)]"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Or
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(255,223,99,0.14)] to-transparent" />
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[rgba(255,223,99,0.18)] bg-[linear-gradient(180deg,rgba(106,22,70,0.42)_0%,rgba(61,20,38,0.58)_100%)] px-4 py-3 text-sm font-semibold text-[var(--game-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-[rgba(255,223,99,0.28)] hover:bg-[rgba(106,22,70,0.5)]"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#db4437] text-sm font-bold shadow-md">
                  G
                </span>
                {googleLoading
                  ? "Opening Google..."
                  : authMode === "signin"
                    ? "Sign In with Google"
                    : "Sign Up with Google"}
              </button>

              <p
                className="pt-1 text-center text-sm text-[var(--game-muted)]"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                {authMode === "signin" ? "New here? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={authMode === "signin" ? openCreateAccount : openSignIn}
                  className="font-bold uppercase tracking-[0.06em] text-[var(--game-accent)] hover:underline"
                >
                  {authMode === "signin" ? "Create account" : "Sign in"}
                </button>
              </p>
            </form>
          </motion.div>
        </div>
      )}

      {isProfileOpen && authUser && (
        <div
          className="fixed inset-0 z-[71] flex items-center justify-center overflow-y-auto px-3 py-6 sm:px-4 sm:py-10 lg:px-6"
          onClick={closeProfile}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,223,99,0.08),transparent_28%),rgba(20,6,12,0.84)] backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
            className="relative z-10 my-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[rgba(255,223,99,0.22)] bg-[linear-gradient(180deg,rgba(106,22,70,0.98)_0%,rgba(61,20,38,0.96)_100%)] p-4 shadow-[0_28px_80px_rgba(24,4,10,0.55)] sm:p-6 lg:p-7"
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(255,223,99,0.10)] via-[rgba(207,125,59,0.06)] to-transparent pointer-events-none" />
            <div className="absolute -left-20 top-20 h-44 w-44 rounded-full bg-[rgba(255,223,99,0.08)] blur-3xl pointer-events-none" />
            <div className="absolute -right-16 bottom-12 h-40 w-40 rounded-full bg-[rgba(174,0,33,0.16)] blur-3xl pointer-events-none" />

            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={closeProfile}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,223,99,0.18)] bg-[rgba(61,20,38,0.72)] text-[var(--game-accent)] transition-colors hover:bg-[rgba(255,223,99,0.12)]"
                aria-label="Close profile popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative grid items-start gap-5 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:gap-6">
              <div className="rounded-[1.8rem] border border-[rgba(255,223,99,0.16)] bg-[rgba(39,10,23,0.5)] p-5 sm:p-6">
                <div className="mx-auto flex w-full max-w-[18rem] flex-col items-center text-center">
                  <div className="game-profile-photo">
                    {authUser.avatarUrl ? (
                      <img src={authUser.avatarUrl} alt={avatarLabel} className="game-profile-photo__image" />
                    ) : (
                      <span className="game-profile-photo__fallback">{avatarInitial}</span>
                    )}
                    <label className="game-profile-photo__upload">
                      <Camera className="h-4 w-4" />
                      <span>{photoUploading ? "Uploading..." : "Upload"}</span>
                      <input type="file" accept="image/*" onChange={handleProfilePhotoChange} hidden />
                    </label>
                  </div>

                  <h3
                    className="mt-4 text-center text-2xl font-black uppercase tracking-[0.08em] text-[var(--game-text)] sm:text-3xl"
                    style={{ fontFamily: "var(--game-font-display)" }}
                  >
                    {authUser.displayName || "Player"}
                  </h3>
                  <p className="mt-2 max-w-full break-all text-sm leading-6 text-[var(--game-muted)]">{authUser.email}</p>
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(255,223,99,0.15)] bg-[rgba(255,223,99,0.08)] px-3 py-1 text-xs uppercase tracking-[0.1em] text-[var(--game-accent)]">
                    <Shield className="h-4 w-4" />
                    {authUser.provider === "google.com" ? "Google Player" : "Email Player"}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsLogoutConfirmOpen(true);
                    }}
                    className="mt-4 inline-flex items-center justify-center rounded-xl border border-[rgba(255,223,99,0.18)] bg-[rgba(39,10,23,0.72)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--game-text)] transition-all hover:bg-[rgba(255,223,99,0.08)]"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    Log Out
                  </button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="flex min-h-[84px] items-center justify-between gap-3 rounded-2xl border border-[rgba(255,223,99,0.12)] bg-[rgba(61,20,38,0.68)] px-4 py-3.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(255,223,99,0.1)] text-[var(--game-accent)]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <span className="block text-[11px] uppercase tracking-[0.14em] text-[var(--game-subtle)]">
                              {card.label}
                            </span>
                            <strong className="mt-1 block text-lg leading-none text-[var(--game-text)]">
                              {card.value}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.6rem] border border-[rgba(255,223,99,0.12)] bg-[rgba(39,10,23,0.52)] p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--game-subtle)]">Zombie Rush</p>
                    <strong className="mt-3 block text-2xl leading-none text-[var(--game-text)] sm:text-[2rem]">
                      {Number(stats?.gameScores?.zombieRush?.coinsEarned || 0).toLocaleString()} coins
                    </strong>
                    <div className="mt-4 grid gap-2 text-sm text-[var(--game-muted)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="uppercase tracking-[0.08em] text-[var(--game-subtle)]">Best score</span>
                        <span className="text-[var(--game-text)]">
                          {Number(stats?.gameScores?.zombieRush?.bestScore || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="uppercase tracking-[0.08em] text-[var(--game-subtle)]">Last score</span>
                        <span className="text-[var(--game-text)]">
                          {Number(stats?.gameScores?.zombieRush?.lastScore || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.6rem] border border-[rgba(255,223,99,0.12)] bg-[rgba(39,10,23,0.52)] p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--game-subtle)]">Zombie Run</p>
                    <strong className="mt-3 block text-2xl leading-none text-[var(--game-text)] sm:text-[2rem]">
                      {Number(stats?.gameScores?.zombieRun?.coinsEarned || 0).toLocaleString()} coins
                    </strong>
                    <div className="mt-4 grid gap-2 text-sm text-[var(--game-muted)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="uppercase tracking-[0.08em] text-[var(--game-subtle)]">Best score</span>
                        <span className="text-[var(--game-text)]">
                          {Number(stats?.gameScores?.zombieRun?.bestScore || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="uppercase tracking-[0.08em] text-[var(--game-subtle)]">Last score</span>
                        <span className="text-[var(--game-text)]">
                          {Number(stats?.gameScores?.zombieRun?.lastScore || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-5 rounded-[1.8rem] border border-[rgba(255,223,99,0.16)] bg-[rgba(39,10,23,0.5)] p-5 sm:p-6">
                  <div className="space-y-2">
                    <h3
                      className="text-2xl font-black uppercase tracking-[0.08em] text-[var(--game-text)] sm:text-[2rem]"
                      style={{ fontFamily: "var(--game-font-display)" }}
                    >
                      Edit Profile
                    </h3>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--game-muted)]">
                      Update your player card details and keep your profile ready for the leaderboard.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--game-muted)]">
                        Display Name
                      </span>
                      <div className="group flex items-center gap-2.5 rounded-xl border border-[rgba(207,125,59,0.24)] bg-[linear-gradient(180deg,rgba(61,20,38,0.84)_0%,rgba(49,13,28,0.9)_100%)] px-3 py-3 transition-colors focus-within:border-[rgba(255,223,99,0.45)]">
                        <User className="h-4 w-4 shrink-0 text-[var(--game-secondary)]" />
                        <input
                          type="text"
                          value={profileForm.displayName}
                          onChange={(event) => handleProfileFieldChange("displayName", event.target.value)}
                          placeholder="Your display name"
                          className="w-full bg-transparent text-[var(--game-text)] outline-none placeholder:text-[var(--game-subtle)]"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--game-muted)]">
                        Location
                      </span>
                      <div className="group flex items-center gap-2.5 rounded-xl border border-[rgba(207,125,59,0.24)] bg-[linear-gradient(180deg,rgba(61,20,38,0.84)_0%,rgba(49,13,28,0.9)_100%)] px-3 py-3 transition-colors focus-within:border-[rgba(255,223,99,0.45)]">
                        <MapPin className="h-4 w-4 shrink-0 text-[var(--game-secondary)]" />
                        <input
                          type="text"
                          value={profileForm.location}
                          onChange={(event) => handleProfileFieldChange("location", event.target.value)}
                          placeholder="Your city or region"
                          className="w-full bg-transparent text-[var(--game-text)] outline-none placeholder:text-[var(--game-subtle)]"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--game-muted)]">
                      About
                    </span>
                    <div className="rounded-xl border border-[rgba(207,125,59,0.24)] bg-[linear-gradient(180deg,rgba(61,20,38,0.84)_0%,rgba(49,13,28,0.9)_100%)] px-3 py-3 transition-colors focus-within:border-[rgba(255,223,99,0.45)]">
                      <textarea
                        value={profileForm.about}
                        onChange={(event) => handleProfileFieldChange("about", event.target.value)}
                        placeholder="Tell other players a bit about yourself"
                        rows={5}
                        className="min-h-[140px] w-full resize-none bg-transparent text-[var(--game-text)] outline-none placeholder:text-[var(--game-subtle)]"
                      />
                    </div>
                  </label>

                  {(profileError || profileNotice) && (
                    <p className={`rounded-xl px-3 py-2 text-sm ${profileError ? "border border-[rgba(255,120,120,0.25)] bg-[rgba(120,16,24,0.35)] text-[#ffd6d6]" : "border border-[rgba(255,223,99,0.25)] bg-[rgba(255,223,99,0.12)] text-[var(--game-text)]"}`}>
                      {profileError || profileNotice}
                    </p>
                  )}

                  <div className="flex flex-col gap-3 border-t border-[rgba(255,223,99,0.1)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-[var(--game-muted)]">
                      Last login: {authUser.lastLoginAt ? new Date(authUser.lastLoginAt).toLocaleString() : "No recent session"}
                    </p>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--game-accent)] via-[#f0a93e] to-[var(--game-secondary)] px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-[var(--game-bg)] shadow-[0_0_20px_rgba(255,223,99,0.18)] transition-all hover:brightness-105 disabled:opacity-60"
                    >
                      {profileLoading ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {isLogoutConfirmOpen && (
        <div
          className="fixed inset-0 z-[72] flex items-start justify-center px-4 pt-24 pb-10"
          onClick={closeLogoutConfirm}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,223,99,0.08),transparent_28%),rgba(20,6,12,0.84)] backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-[rgba(255,223,99,0.22)] bg-[linear-gradient(180deg,rgba(106,22,70,0.98)_0%,rgba(61,20,38,0.96)_100%)] p-5 shadow-[0_28px_80px_rgba(24,4,10,0.55)]"
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(255,223,99,0.10)] via-[rgba(207,125,59,0.06)] to-transparent pointer-events-none" />
            <div className="absolute -left-16 top-12 h-32 w-32 rounded-full bg-[rgba(174,0,33,0.18)] blur-3xl pointer-events-none" />
            <div className="absolute -right-12 bottom-8 h-28 w-28 rounded-full bg-[rgba(255,223,99,0.10)] blur-3xl pointer-events-none" />

            <div className="relative flex justify-end mb-2">
              <button
                type="button"
                onClick={closeLogoutConfirm}
                disabled={logoutLoading}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,223,99,0.18)] bg-[rgba(61,20,38,0.72)] text-[var(--game-accent)] transition-colors hover:bg-[rgba(255,223,99,0.12)] disabled:opacity-60"
                aria-label="Close logout confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative space-y-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,223,99,0.16)] bg-[rgba(39,10,23,0.56)] px-4 py-2 text-[var(--game-accent)]">
                <Shield className="h-4 w-4" />
                <span
                  className="text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Logout Confirmation
                </span>
              </div>

              <div>
                <h3
                  className="text-3xl font-black uppercase tracking-[0.08em] text-[var(--game-text)]"
                  style={{ fontFamily: "var(--game-font-display)" }}
                >
                  Are You Sure?
                </h3>
                <p
                  className="mt-3 text-sm text-[var(--game-muted)]"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Your current game session will close on this device.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeLogoutConfirm}
                  disabled={logoutLoading}
                  className="rounded-xl border border-[rgba(255,223,99,0.16)] bg-[rgba(39,10,23,0.72)] px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--game-text)] transition-all hover:bg-[rgba(255,223,99,0.08)] disabled:opacity-60"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="rounded-xl bg-gradient-to-r from-[var(--game-accent)] via-[#f0a93e] to-[var(--game-secondary)] px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-[var(--game-bg)] shadow-[0_0_20px_rgba(255,223,99,0.18)] transition-all hover:brightness-105 disabled:opacity-60"
                  style={{ fontFamily: "'Rajdhani', sans-serif" }}
                >
                  {logoutLoading ? "Logging Out..." : "Yes"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
