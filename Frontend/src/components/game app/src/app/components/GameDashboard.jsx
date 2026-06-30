import { motion } from "motion/react";
import { CalendarDays, CheckCircle2, Clock3, Coins, Flame, Gamepad2, Gift, Mail, MapPin, Shield, Sparkles, Star, Trophy, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import currencyImg from "../../../../../assets/leathal currency.png";
import "./GameDashboard.css";

function getDefaultGameApiBaseUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return "http://localhost:5000";
}

const GAME_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || getDefaultGameApiBaseUrl();

function buildGameAuthUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${GAME_API_BASE_URL}${path}`;
}

function buildGameApiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${GAME_API_BASE_URL}${path}`;
}

function getAuthHeaders(extra = {}) {
  const token = (() => { try { return localStorage.getItem("gameAuthToken") || ""; } catch { return ""; } })();
  const headers = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function gameRequest(path, options = {}) {
  const response = await fetch(buildGameApiUrl(path), {
    credentials: "include",
    ...options,
    headers: getAuthHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.success) {
    const requestError = new Error(data?.message || "Request failed");
    requestError.status = response.status;
    throw requestError;
  }

  return data;
}

const emptyRewardPreview = {
  wallet: {
    coins: 0,
    streakCount: 0,
    totalClaimCount: 0,
    weeklyClaimCount: 0,
    hasClaimedToday: true,
    nextRewardAmount: 0,
  },
  streakMeta: {
    nextTarget: 0,
    nextReward: 0,
    remainingDays: 0,
    hasMaxMilestone: false,
  },
  rewardTrack: [],
  gameScores: {
    zombieRush: {},
    zombieRun: {},
  },
};

function getRewardDismissKey(email) {
  if (typeof window === "undefined") {
    return "";
  }

  const now = new Date();
  const dateKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return `game-dashboard-daily-reward:${email || "player"}:${dateKey}`;
}

function mergeProfileWithRewardData(currentProfile, rewardData) {
  if (!currentProfile || !rewardData) {
    return currentProfile;
  }

  const rewardWallet = rewardData.wallet || emptyRewardPreview.wallet;
  const rewardScores = rewardData.gameScores || emptyRewardPreview.gameScores;
  const nextStats = currentProfile.stats || {};
  const nextWallet = nextStats.wallet || {};
  const rushStats = nextStats.gameScores?.zombieRush || {};
  const runStats = nextStats.gameScores?.zombieRun || {};

  return {
    ...currentProfile,
    stats: {
      ...nextStats,
      wallet: {
        ...nextWallet,
        coins: Number(rewardWallet.coins || 0),
        rewardStreak: Number(rewardWallet.streakCount || 0),
        totalRewardClaims: Number(rewardWallet.totalClaimCount || 0),
      },
      gameScores: {
        ...nextStats.gameScores,
        zombieRush: {
          ...rushStats,
          ...rewardScores.zombieRush,
          lastSubmittedAt: rushStats.lastSubmittedAt || null,
        },
        zombieRun: {
          ...runStats,
          ...rewardScores.zombieRun,
          lastSubmittedAt: runStats.lastSubmittedAt || null,
        },
      },
    },
  };
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
}

function getFavoriteGame(stats) {
  const rush = stats?.gameScores?.zombieRush || {};
  const run = stats?.gameScores?.zombieRun || {};
  const gameSummaries = [
    {
      label: "Zombie Rush",
      score: Number(rush.totalSubmittedScore || 0) + Number(rush.coinsEarned || 0),
      bestScore: Number(rush.bestScore || 0),
      coinsEarned: Number(rush.coinsEarned || 0),
      lastPlayedAt: rush.lastSubmittedAt || null,
    },
    {
      label: "Zombie Run",
      score: Number(run.totalSubmittedScore || 0) + Number(run.coinsEarned || 0),
      bestScore: Number(run.bestScore || 0),
      coinsEarned: Number(run.coinsEarned || 0),
      lastPlayedAt: run.lastSubmittedAt || null,
    },
  ];

  const sortedGames = [...gameSummaries].sort((left, right) => right.score - left.score);
  return sortedGames[0]?.score > 0 ? sortedGames[0] : null;
}

export function GameDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rewardPreview, setRewardPreview] = useState(emptyRewardPreview);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardModalLoading, setRewardModalLoading] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardModalNotice, setRewardModalNotice] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const response = await fetch(buildGameAuthUrl("/api/game/auth/profile"), {
          credentials: "include",
          headers: getAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Please sign in to view your dashboard.");
        }

        if (!ignore) {
          setProfile(data.profile || null);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError.message || "Failed to load dashboard.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (loading || error || !profile?.email) {
      return undefined;
    }

    let ignore = false;
    const dismissKey = getRewardDismissKey(profile.email);

    async function loadRewardPreview() {
      setRewardModalLoading(true);
      setRewardModalNotice("");

      try {
        const response = await gameRequest("/api/game/tasks");
        const nextRewardData = response.data || emptyRewardPreview;

        if (ignore) {
          return;
        }

        setRewardPreview(nextRewardData);
        const shouldShow =
          !nextRewardData.wallet?.hasClaimedToday &&
          !(dismissKey && window.sessionStorage.getItem(dismissKey));
        setShowRewardModal(shouldShow);
      } catch {
        if (!ignore) {
          setShowRewardModal(false);
        }
      } finally {
        if (!ignore) {
          setRewardModalLoading(false);
        }
      }
    }

    loadRewardPreview();

    return () => {
      ignore = true;
    };
  }, [error, loading, profile?.email]);

  const dismissRewardModal = () => {
    const dismissKey = getRewardDismissKey(profile?.email);

    if (dismissKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(dismissKey, "dismissed");
    }

    setShowRewardModal(false);
  };

  const handleClaimReward = async () => {
    if (claimingReward || rewardPreview.wallet?.hasClaimedToday) {
      return;
    }

    setClaimingReward(true);
    setRewardModalNotice("");

    try {
      const response = await gameRequest("/api/game/tasks/claim-daily-reward", {
        method: "POST",
      });
      const nextRewardData = response.data || emptyRewardPreview;

      setRewardPreview(nextRewardData);
      setProfile((currentProfile) => mergeProfileWithRewardData(currentProfile, nextRewardData));
      setRewardModalNotice(response.message || "Daily reward claimed");
      window.setTimeout(() => {
        dismissRewardModal();
      }, 900);
    } catch (claimError) {
      setRewardModalNotice(claimError.message || "Failed to claim daily reward");
    } finally {
      setClaimingReward(false);
    }
  };

  const avatarLabel = profile?.displayName || profile?.email || "Player";
  const avatarInitial = avatarLabel.charAt(0).toUpperCase() || "P";
  const stats = profile?.stats;
  const favoriteGame = useMemo(() => getFavoriteGame(stats), [stats]);
  const totalSessions = Number(stats?.sessions?.gamesPlayed || 0);
  const activeGames = Number(stats?.sessions?.activeGamesWithScores || 0);
  const totalCoins = Number(stats?.wallet?.coins || 0);
  const totalCoinsEarned = Number(stats?.wallet?.totalCoinsEarned || 0);
  const rewardStreak = Number(stats?.wallet?.rewardStreak || 0);
  const totalRewardClaims = Number(stats?.wallet?.totalRewardClaims || 0);
  const zombieRush = stats?.gameScores?.zombieRush || {};
  const zombieRun = stats?.gameScores?.zombieRun || {};
  const rewardWallet = rewardPreview.wallet || emptyRewardPreview.wallet;
  const rewardTrack = rewardPreview.rewardTrack || [];
  const streakMeta = rewardPreview.streakMeta || emptyRewardPreview.streakMeta;
  const rewardNoticeIsError = /failed|already claimed/i.test(rewardModalNotice);
  const nextMilestoneCopy = streakMeta.hasMaxMilestone
    ? "Top streak milestone reached. Keep the streak alive tomorrow."
    : streakMeta.nextTarget > 0
      ? `${streakMeta.remainingDays} more day${streakMeta.remainingDays === 1 ? "" : "s"} until ${streakMeta.nextTarget}-day milestone`
      : "Claim today to keep your streak moving.";

  const statCards = [
    {
      label: "Wallet Coins",
      value: totalCoins.toLocaleString(),
      detail: "Current balance",
      icon: Coins,
    },
    {
      label: "Coins Earned",
      value: totalCoinsEarned.toLocaleString(),
      detail: "Across all games",
      icon: Trophy,
    },
    {
      label: "Reward Streak",
      value: `${rewardStreak} days`,
      detail: `${totalRewardClaims} reward claims`,
      icon: Flame,
    },
    {
      label: "Play Sessions",
      value: `${totalSessions}`,
      detail: `${activeGames} active games recorded`,
      icon: Clock3,
    },
  ];

  const infoRows = [
    { label: "Email", value: profile?.email || "Not available", icon: Mail },
    { label: "Location", value: profile?.location || "Location not added", icon: MapPin },
    { label: "Joined", value: formatDateTime(profile?.createdAt), icon: CalendarDays },
    { label: "Last Login", value: formatDateTime(profile?.lastLoginAt), icon: Clock3 },
  ];

  const activityRows = [
    { label: "Total sessions", value: `${totalSessions}` },
    { label: "Games with scores", value: `${activeGames}` },
    { label: "Reward claims", value: `${totalRewardClaims}` },
    { label: "Player tag", value: stats?.profile?.userName || profile?.displayName || "Player" },
  ];

  const gameCards = [
    {
      title: "Zombie Rush",
      accent: "gamedashboard-gamecard--rush",
      values: [
        { label: "Best Score", value: Number(zombieRush.bestScore || 0).toLocaleString() },
        { label: "Last Score", value: Number(zombieRush.lastScore || 0).toLocaleString() },
        { label: "Total Score", value: Number(zombieRush.totalSubmittedScore || 0).toLocaleString() },
        { label: "Coins Earned", value: Number(zombieRush.coinsEarned || 0).toLocaleString() },
      ],
      lastPlayedAt: zombieRush.lastSubmittedAt,
    },
    {
      title: "Zombie Run",
      accent: "gamedashboard-gamecard--run",
      values: [
        { label: "Best Score", value: Number(zombieRun.bestScore || 0).toLocaleString() },
        { label: "Last Score", value: Number(zombieRun.lastScore || 0).toLocaleString() },
        { label: "Total Score", value: Number(zombieRun.totalSubmittedScore || 0).toLocaleString() },
        { label: "Coins Earned", value: Number(zombieRun.coinsEarned || 0).toLocaleString() },
      ],
      lastPlayedAt: zombieRun.lastSubmittedAt,
    },
  ];

  return (
    <section className="gamedashboard-shell">
      <div className="gamedashboard-backdrop" aria-hidden="true" />

      {showRewardModal ? (
        <div className="gamedashboard-rewardmodal__backdrop">
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="gamedashboard-rewardmodal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-reward-title"
          >
            <button
              type="button"
              className="gamedashboard-rewardmodal__close"
              onClick={dismissRewardModal}
              aria-label="Close daily reward popup"
            >
              <X size={18} />
            </button>

            <div className="gamedashboard-rewardmodal__hero">
              <div className="gamedashboard-rewardmodal__copy">
                <div className="gamedashboard-kicker">
                  <Gift size={16} />
                  <span>Daily rewards ready</span>
                </div>

                <h2 id="daily-reward-title">Claim Today&apos;s Lethal Currency Drop</h2>
                <p>
                  Your next login reward is ready now. Claim it fast and jump back into the run.
                </p>

                <div className="gamedashboard-rewardmodal__actions">
                  <button
                    type="button"
                    className="gamedashboard-rewardmodal__claimbtn"
                    onClick={handleClaimReward}
                    disabled={claimingReward || rewardModalLoading}
                  >
                    {claimingReward ? "Claiming..." : "Claim reward"}
                  </button>

                  <button
                    type="button"
                    className="gamedashboard-rewardmodal__laterbtn"
                    onClick={dismissRewardModal}
                    disabled={claimingReward}
                  >
                    Maybe later
                  </button>
                </div>

                <div className="gamedashboard-rewardmodal__stats">
                  <div>
                    <span>Today&apos;s drop</span>
                    <strong>+{Number(rewardWallet.nextRewardAmount || 0)}</strong>
                  </div>
                  <div>
                    <span>Current streak</span>
                    <strong>{Number(rewardWallet.streakCount || 0)} days</strong>
                  </div>
                  <div>
                    <span>Total claims</span>
                    <strong>{Number(rewardWallet.totalClaimCount || 0)}</strong>
                  </div>
                </div>

                {rewardModalNotice ? (
                  <div
                    className={`gamedashboard-rewardmodal__notice ${rewardNoticeIsError ? "gamedashboard-rewardmodal__notice--error" : ""}`}
                  >
                    <CheckCircle2 size={16} />
                    <span>{rewardModalNotice}</span>
                  </div>
                ) : null}
              </div>

              <div className="gamedashboard-rewardmodal__visual" aria-hidden="true">
                <div className="gamedashboard-rewardmodal__coinhalo" />
                <img src={currencyImg} alt="" className="gamedashboard-rewardmodal__coin" />

                <div className="gamedashboard-rewardmodal__wallet">
                  <span>Wallet balance</span>
                  <strong>{Number(rewardWallet.coins || 0).toLocaleString()}</strong>
                </div>

                <div className="gamedashboard-rewardmodal__milestone">
                  <span>Next streak goal</span>
                  <strong>
                    {streakMeta.nextTarget > 0 ? `${streakMeta.nextTarget} days` : "Locked in"}
                  </strong>
                  <p>{nextMilestoneCopy}</p>
                </div>
              </div>
            </div>

            <div className="gamedashboard-rewardmodal__track">
              {rewardTrack.map((rewardDay) => (
                <article
                  key={rewardDay.day}
                  className={`gamedashboard-rewardcard gamedashboard-rewardcard--${rewardDay.status}`}
                >
                  <span className="gamedashboard-rewardcard__day">Day {rewardDay.day}</span>
                  <img src={currencyImg} alt="" />
                  <strong>+{Number(rewardDay.reward || 0)}</strong>
                  <small>
                    {rewardDay.status === "available"
                      ? "Ready now"
                      : rewardDay.status === "claimed"
                        ? "Claimed"
                        : "Locked"}
                  </small>
                </article>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}

      <div className="gamedashboard-container">
        {loading ? (
          <div className="gamedashboard-status">Loading dashboard...</div>
        ) : error ? (
          <div className="gamedashboard-status gamedashboard-status--error">
            {error}
          </div>
        ) : profile ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="gamedashboard-spotlight"
            >
              <div className="gamedashboard-spotlight__profile">
                <div className="gamedashboard-avatar">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={avatarLabel} className="gamedashboard-avatar__image" />
                  ) : (
                    <span className="gamedashboard-avatar__fallback">{avatarInitial}</span>
                  )}
                </div>

                <div className="gamedashboard-spotlight__identity">
                  <div className="gamedashboard-kicker gamedashboard-kicker--compact">
                    <Shield size={16} />
                    <span>{profile.provider === "google.com" ? "Google Player" : "Email Player"}</span>
                  </div>
                  <h2>{profile.displayName || "Player"}</h2>
                  <p>{profile.email}</p>
                </div>

                <div className="gamedashboard-badges gamedashboard-badges--left">
                  <span className="gamedashboard-badge">
                    <Gamepad2 size={14} />
                    {favoriteGame?.label || "No favorite game yet"}
                  </span>
                  <span className="gamedashboard-badge">
                    <Flame size={14} />
                    {rewardStreak} day streak
                  </span>
                </div>

                <div className="gamedashboard-about">
                  <h3>Player Story</h3>
                  <p>{profile.about || "Add a player bio to turn this dashboard into a real identity card."}</p>
                </div>
              </div>

              <div className="gamedashboard-spotlight__mission">
                <div className="gamedashboard-kicker gamedashboard-kicker--compact">
                  <Sparkles size={16} />
                  <span>Command Center</span>
                </div>
                <h3>Dashboard</h3>
                <p>
                  A cleaner read on who the player is, how they perform, and which
                  game mode is carrying the account right now.
                </p>

                <div className="gamedashboard-featured">
                  <div className="gamedashboard-featured__label">
                    <Star size={16} />
                    <span>Favorite Mode</span>
                  </div>
                  <strong>{favoriteGame?.label || "No favorite game yet"}</strong>
                  <p>
                    {favoriteGame
                      ? "Calculated from submitted score and earned coins."
                      : "Play a few rounds to unlock a favorite mode summary."}
                  </p>
                  {favoriteGame ? (
                    <div className="gamedashboard-featured__stats">
                      <div>
                        <span>Best score</span>
                        <b>{favoriteGame.bestScore.toLocaleString()}</b>
                      </div>
                      <div>
                        <span>Coins earned</span>
                        <b>{favoriteGame.coinsEarned.toLocaleString()}</b>
                      </div>
                      <div>
                        <span>Last played</span>
                        <b>{formatDateTime(favoriteGame.lastPlayedAt)}</b>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.section>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="gamedashboard-stats"
            >
              {statCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article key={card.label} className="gamedashboard-statcard">
                    <span className="gamedashboard-statcard__icon">
                      <Icon size={18} />
                    </span>
                    <div className="gamedashboard-statcard__copy">
                      <span className="gamedashboard-statcard__label">{card.label}</span>
                      <strong>{card.value}</strong>
                      <p>{card.detail}</p>
                    </div>
                  </article>
                );
              })}
            </motion.div>

            <div className="gamedashboard-board">
              <motion.aside
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="gamedashboard-sidebar"
              >
                <article className="gamedashboard-panel gamedashboard-panel--info">
                  <div className="gamedashboard-panel__heading">
                    <User size={18} />
                    <h3>Player Details</h3>
                  </div>
                  <div className="gamedashboard-infoList">
                    {infoRows.map((row) => {
                      const Icon = row.icon;
                      return (
                        <div key={row.label} className="gamedashboard-infoRow">
                          <span className="gamedashboard-infoRow__icon">
                            <Icon size={16} />
                          </span>
                          <div>
                            <small>{row.label}</small>
                            <strong>{row.value}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="gamedashboard-panel gamedashboard-panel--activity">
                  <div className="gamedashboard-panel__heading">
                    <Clock3 size={18} />
                    <h3>Activity Snapshot</h3>
                  </div>
                  <div className="gamedashboard-activityList">
                    {activityRows.map((row) => (
                      <div key={row.label} className="gamedashboard-activityRow">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              </motion.aside>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="gamedashboard-performance"
              >
                <div className="gamedashboard-performance__header">
                  <div>
                    <div className="gamedashboard-kicker gamedashboard-kicker--compact">
                      <Trophy size={16} />
                      <span>Performance Board</span>
                    </div>
                    <h3>Game Performance</h3>
                  </div>
                  <p>
                    Each card tracks your recorded results for the current mini-games.
                  </p>
                </div>

                <div className="gamedashboard-games">
                  {gameCards.map((game) => (
                    <article key={game.title} className={`gamedashboard-gamecard ${game.accent}`}>
                      <div className="gamedashboard-gamecard__header">
                        <div className="gamedashboard-scorecard__title">
                          <Gamepad2 size={18} />
                          <h3>{game.title}</h3>
                        </div>
                        <span className="gamedashboard-gamecard__last">
                          Last played {formatDateTime(game.lastPlayedAt)}
                        </span>
                      </div>

                      <div className="gamedashboard-scorecard__grid">
                        {game.values.map((item) => (
                          <div key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
