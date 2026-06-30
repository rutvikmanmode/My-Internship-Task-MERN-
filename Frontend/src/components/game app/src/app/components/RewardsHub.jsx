import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import "./RewardsHub.css";

const GAME_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
const DEFAULT_REWARDS = [10, 20, 50, 100, 200, 500, 5, 75];

const emptyTaskData = {
  wallet: {
    coins: 0,
    totalScore: 0,
    streakCount: 0,
    totalClaimCount: 0,
    weeklyClaimCount: 0,
    spinLimitPerDay: 2,
    todaySpinCount: 0,
    spinsRemaining: 2,
    spinWheelCoinsEarned: 0,
    hasClaimedToday: false,
    nextRewardAmount: 0,
  },
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

export function RewardsHub() {
  const [taskData, setTaskData] = useState(emptyTaskData);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [pageError, setPageError] = useState("");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [wheelRewards, setWheelRewards] = useState(DEFAULT_REWARDS);

  useEffect(() => {
    let ignore = false;

    async function loadRewardsHub() {
      setLoading(true);
      setPageError("");

      try {
        const response = await gameRequest("/api/game/tasks");

        if (!ignore) {
          setTaskData(response.data || emptyTaskData);
        }
      } catch (error) {
        if (!ignore) {
          setTaskData(emptyTaskData);
          setPageError(error.message || "Failed to load rewards");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadRewardsHub();

    return () => {
      ignore = true;
    };
  }, []);

  const isSignedOut = !loading && pageError.toLowerCase().includes("sign in");
  const segmentAngle = 360 / wheelRewards.length;
  const wheelLabels = useMemo(
    () =>
      wheelRewards.map((reward, index) => ({
        reward,
        angle: index * segmentAngle,
      })),
    [segmentAngle, wheelRewards]
  );

  const handleSpin = async () => {
    if (spinning || isSignedOut) {
      return;
    }

    setFeedback("");
    setResult(null);
    setSpinning(true);

    try {
      const response = await gameRequest("/api/game/tasks/spin-wheel", {
        method: "POST",
      });
      const rewards = response.rewards || DEFAULT_REWARDS;
      const landedIndex =
        typeof response.rewardIndex === "number"
          ? response.rewardIndex
          : rewards.indexOf(response.reward);
      const landedReward =
        typeof response.reward === "number"
          ? response.reward
          : rewards[Math.max(landedIndex, 0)];
      const nextSegmentAngle = 360 / rewards.length;
      const nextRotation =
        360 * 6 +
        (360 - landedIndex * nextSegmentAngle - nextSegmentAngle / 2);

      setWheelRewards(rewards);
      setRotation((prev) => prev + nextRotation);

      window.setTimeout(() => {
        setResult(landedReward);
        setSpinning(false);
      }, 4000);

      setTaskData(response.data || emptyTaskData);
      setFeedback(response.message || "Spin complete");
    } catch (error) {
      setSpinning(false);
      setFeedback(error.message || "Failed to spin reward wheel");
    }
  };

  return (
    <section className="rewardshub-shell">
      <div className="rewardshub-backdrop" aria-hidden="true" />

      <div className="rewardshub-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rewardshub-board"
        >
          <div className="rewardshub-wheel-wrap">
            <div className="rewardshub-pointer" aria-hidden="true" />

            <div style={{ position: "relative" }}>
              <div
                className="rewardshub-wheel"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  background: `conic-gradient(
                    from -22.5deg,
                    rgba(255,223,99,0.95) 0deg 45deg,
                    rgba(207,125,59,0.95) 45deg 90deg,
                    rgba(174,0,33,0.95) 90deg 135deg,
                    rgba(106,22,70,0.95) 135deg 180deg,
                    rgba(255,223,99,0.95) 180deg 225deg,
                    rgba(207,125,59,0.95) 225deg 270deg,
                    rgba(174,0,33,0.95) 270deg 315deg,
                    rgba(106,22,70,0.95) 315deg 360deg
                  )`,
                }}
              >
                {wheelLabels.map((item, index) => (
                  <div
                    key={`${item.reward}-${index}`}
                    className="rewardshub-wheel-label"
                    style={{ transform: `rotate(${item.angle}deg)` }}
                  >
                    <span>+{item.reward}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="rewardshub-wheel-core"
                onClick={handleSpin}
                disabled={spinning || isSignedOut || Number(taskData.wallet.spinsRemaining || 0) <= 0}
                aria-label="Spin wheel"
              >
                <span>{spinning ? "..." : "SPIN"}</span>
              </button>
            </div>
          </div>

          <div className="rewardshub-sidepanel">
            {(feedback || pageError) && (
              <div className="rewardshub-notice">{feedback || pageError}</div>
            )}

            <div className="rewardshub-sidecard">
              <span className="rewardshub-side-label">Spins Left Today</span>
              <strong>
                {Number(taskData.wallet.spinsRemaining || 0)} / {Number(taskData.wallet.spinLimitPerDay || 2)}
              </strong>
              <p>
                {isSignedOut
                  ? "Sign in from the navigation bar to start spinning."
                  : Number(taskData.wallet.spinsRemaining || 0) > 0
                    ? `You have used ${Number(taskData.wallet.todaySpinCount || 0)} of ${Number(taskData.wallet.spinLimitPerDay || 2)} daily spins.`
                    : "Daily spin limit reached. More spins unlock tomorrow."}
              </p>
            </div>

            <div className="rewardshub-sidecard">
              <span className="rewardshub-side-label">Wheel Coins Earned</span>
              <strong>+{Number(taskData.wallet.spinWheelCoinsEarned || 0).toLocaleString()} coins</strong>
              <p>
                {result
                  ? `Latest wheel result: +${result} coins.`
                  : "All wheel rewards are added directly to your game wallet."}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
