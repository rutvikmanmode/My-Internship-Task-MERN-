import { motion } from "motion/react";
import { Coins, Flame, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const GAME_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

const emptyRewardData = {
  wallet: {
    coins: 0,
    level: 1,
    levelProgressPercent: 0,
    levelProgressCoins: 0,
    levelProgressTotal: 1000,
    streakCount: 0,
    hasClaimedToday: false,
    nextRewardAmount: 0,
  },
  streakMeta: {
    nextTarget: 0,
    nextReward: 0,
    remainingDays: 0,
    hasMaxMilestone: false,
  },
  rewardTrack: [],
};

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
    const error = new Error(data?.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}

export function RewardsSection() {
  const [rewardData, setRewardData] = useState(emptyRewardData);
  const [displayCoins, setDisplayCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadRewardsPreview() {
      setLoading(true);
      setPageError("");

      try {
        const response = await gameRequest("/api/game/tasks");

        if (!ignore) {
          setRewardData(response.data || emptyRewardData);
        }
      } catch (error) {
        if (!ignore) {
          setRewardData(emptyRewardData);
          setPageError(error.message || "Failed to load rewards preview");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadRewardsPreview();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const targetCoins = Number(rewardData.wallet?.coins || 0);
    let frameId = 0;

    const animateCoins = () => {
      setDisplayCoins((currentValue) => {
        if (currentValue === targetCoins) {
          return currentValue;
        }

        const difference = targetCoins - currentValue;
        const step = Math.max(1, Math.ceil(Math.abs(difference) / 14));
        const nextValue =
          difference > 0
            ? Math.min(targetCoins, currentValue + step)
            : Math.max(targetCoins, currentValue - step);

        if (nextValue !== targetCoins) {
          frameId = window.requestAnimationFrame(animateCoins);
        }

        return nextValue;
      });
    };

    frameId = window.requestAnimationFrame(animateCoins);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [rewardData.wallet?.coins]);

  const isSignedOut = !loading && pageError.toLowerCase().includes("sign in");
  const rewardTrack = rewardData.rewardTrack || [];
  const wallet = rewardData.wallet || emptyRewardData.wallet;
  const streakMeta = rewardData.streakMeta || emptyRewardData.streakMeta;

  const streakMessage = useMemo(() => {
    if (streakMeta.hasMaxMilestone) {
      return "Top streak milestone reached. Keep claiming daily to hold the run.";
    }

    if (streakMeta.nextTarget > 0) {
      return `Next milestone: ${streakMeta.nextTarget} days (+${streakMeta.nextReward} coins)`;
    }

    return `Next daily reward: +${wallet.nextRewardAmount || 0} coins`;
  }, [streakMeta, wallet.nextRewardAmount]);

  const handleClaimDaily = async () => {
    if (claimingDaily || isSignedOut || wallet.hasClaimedToday) {
      return;
    }

    setClaimingDaily(true);
    setFeedback("");
    setPageError("");

    try {
      const response = await gameRequest("/api/game/tasks/claim-daily-reward", {
        method: "POST",
      });

      setRewardData(response.data || emptyRewardData);
      setFeedback(response.message || "Daily reward claimed");
    } catch (error) {
      setPageError(error.message || "Failed to claim daily bonus");
    } finally {
      setClaimingDaily(false);
    }
  };

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-[2rem] font-black tracking-wider sm:text-[2.8rem] md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-[var(--game-accent)] via-[var(--game-secondary)] to-[var(--game-surface-strong)] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,223,99,0.24)]">
              REWARDS SYSTEM
            </span>
          </h2>

          <p className="mx-auto max-w-2xl text-[0.95rem] font-medium text-[var(--game-muted)] sm:text-[1.1rem] md:text-xl">
            Earn coins, level up, and unlock exclusive rewards
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-[rgba(255,223,99,0.24)] bg-[var(--game-panel)] p-5 shadow-2xl shadow-[0_0_24px_rgba(255,223,99,0.18)] backdrop-blur-xl sm:p-6 md:p-8"
          >
            <div className="mb-6 flex items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--game-accent)] to-[var(--game-secondary)]"
              >
                <Coins className="h-8 w-8 text-[var(--game-bg)]" />
              </motion.div>

              <div>
                <h3 className="text-2xl font-bold text-white">Your Coins</h3>
                <p className="text-[var(--game-subtle)]">
                  {isSignedOut ? "Sign in to sync your wallet" : "Universal currency"}
                </p>
              </div>
            </div>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                className="mb-4 bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] bg-clip-text text-[2.5rem] font-black text-transparent sm:text-5xl md:text-6xl"
              >
                {displayCoins.toLocaleString()}
              </motion.div>

              <div className="relative my-8 h-32">
                {[...Array(5)].map((_, index) => (
                  <motion.div
                    key={index}
                    animate={{ y: [-20, -80], opacity: [0, 1, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.3,
                    }}
                    className="absolute left-1/2 h-8 w-8 -translate-x-1/2 rounded-full bg-gradient-to-br from-[var(--game-accent)] to-[var(--game-secondary)]"
                    style={{ bottom: 0, marginLeft: `${(index - 2) * 20}px` }}
                  />
                ))}
              </div>

              <motion.button
                whileHover={{
                  scale: wallet.hasClaimedToday || isSignedOut ? 1 : 1.05,
                  boxShadow:
                    wallet.hasClaimedToday || isSignedOut
                      ? "none"
                      : "0 0 30px rgba(223, 229, 0, 0.6)",
                }}
                whileTap={{ scale: wallet.hasClaimedToday || isSignedOut ? 1 : 0.95 }}
                onClick={handleClaimDaily}
                disabled={claimingDaily || wallet.hasClaimedToday || isSignedOut}
                className="w-full rounded-xl bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] px-6 py-3 font-bold text-[var(--game-bg)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {claimingDaily
                  ? "Claiming..."
                  : isSignedOut
                    ? "Sign In To Claim"
                    : wallet.hasClaimedToday
                      ? "Daily Bonus Claimed"
                      : "Claim Daily Bonus"}
              </motion.button>

              {(feedback || pageError) && (
                <p className="mt-4 text-sm text-[var(--game-muted)]">
                  {feedback || pageError}
                </p>
              )}
            </div>
          </motion.div>

          <div className="space-y-8">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border border-[rgba(174,0,33,0.24)] bg-[var(--game-panel)] p-5 backdrop-blur-xl sm:p-6 md:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Level {wallet.level || 1}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--game-subtle)]">
                    {wallet.levelProgressCoins || 0} / {wallet.levelProgressTotal || 1000} coins to this level band
                  </p>
                </div>
                <div className="text-2xl font-black text-[var(--game-secondary)] sm:text-3xl md:text-4xl">
                  {wallet.levelProgressPercent || 0}%
                </div>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-[rgba(61,20,38,0.8)]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${wallet.levelProgressPercent || 0}%` }}
                  className="h-full bg-gradient-to-r from-[var(--game-secondary)] to-[var(--game-surface-strong)]"
                />
              </div>

              <div className="mt-5 flex items-center gap-3 text-sm text-[var(--game-muted)]">
                <TrendingUp className="h-4 w-4 text-[var(--game-accent)]" />
                <span>
                  Reach {wallet.nextLevelFloor?.toLocaleString?.() || "1,000"} coins for the next level.
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border border-[rgba(207,125,59,0.24)] bg-[var(--game-panel)] p-5 backdrop-blur-xl sm:p-6 md:p-8"
            >
              <div className="mb-6 flex items-center gap-4">
                <Flame className="h-8 w-8 text-[var(--game-accent)]" />
                <h3 className="text-2xl font-bold text-white">Daily Streak</h3>
              </div>

              <div className="text-center">
                <div className="mb-4 text-[2.5rem] font-black text-[var(--game-accent)] sm:text-5xl md:text-6xl">
                  {wallet.streakCount || 0} Days
                </div>

                <p className="mb-4 text-[var(--game-subtle)]">{streakMessage}</p>

                <div className="flex flex-wrap justify-center gap-2">
                  {rewardTrack.length ? (
                    rewardTrack.map((item) => (
                      <div
                        key={item.day}
                        title={`Day ${item.day}: ${item.reward} coins`}
                        className={`h-8 w-8 rounded-lg ${
                          item.status === "claimed"
                            ? "bg-gradient-to-br from-[var(--game-accent)] to-[var(--game-secondary)]"
                            : item.status === "available"
                              ? "border border-[rgba(255,223,99,0.45)] bg-[rgba(255,223,99,0.18)]"
                              : "bg-[rgba(61,20,38,0.82)]"
                        }`}
                      />
                    ))
                  ) : (
                    [...Array(7)].map((_, index) => (
                      <div
                        key={index}
                        className="h-8 w-8 rounded-lg bg-[rgba(61,20,38,0.82)]"
                      />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
