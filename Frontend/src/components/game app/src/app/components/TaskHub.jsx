import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  CalendarDays,
  Flame,
  ListTodo,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import currencyImg from "../../../../../assets/leathal currency.png";
import "./TaskHub.css";

const GAME_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

const emptyTaskData = {
  wallet: {
    coins: 0,
    streakCount: 0,
    totalClaimCount: 0,
    weeklyClaimCount: 0,
    hasClaimedToday: false,
    nextRewardAmount: 0,
  },
  rewardTrack: [],
  missions: {
    daily: [],
    weekly: [],
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

export default function TaskHub({ scrollTarget, onScrollHandled }) {
  const [tab, setTab] = useState("daily");
  const [taskData, setTaskData] = useState(emptyTaskData);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [claimingReward, setClaimingReward] = useState(false);
  const [claimingMissionKey, setClaimingMissionKey] = useState("");
  const [feedback, setFeedback] = useState("");
  const rewardTrackRef = useRef(null);
  const missionBoardRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    async function loadTaskHub() {
      setLoading(true);
      setPageError("");

      try {
        const response = await gameRequest("/api/game/tasks");

        if (!ignore) {
          setTaskData(response.data || emptyTaskData);
        }
      } catch (error) {
        if (!ignore) {
          setPageError(error.message || "Failed to load task hub");
          setTaskData(emptyTaskData);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTaskHub();

    return () => {
      ignore = true;
    };
  }, []);

  const missionStats = useMemo(() => {
    const currentMissions = taskData.missions[tab] || [];
    const completedCount = currentMissions.filter(
      (mission) => mission.completed
    ).length;
    const totalReward = currentMissions.reduce(
      (sum, mission) => sum + Number(mission.reward || 0),
      0
    );

    return {
      completedCount,
      totalReward,
      missionCount: currentMissions.length,
    };
  }, [tab, taskData.missions]);

  const handleClaimReward = async () => {
    setFeedback("");
    setClaimingReward(true);

    try {
      const response = await gameRequest("/api/game/tasks/claim-daily-reward", {
        method: "POST",
      });

      setTaskData(response.data || emptyTaskData);
      setFeedback(response.message || "Daily reward claimed");
    } catch (error) {
      setFeedback(error.message || "Failed to claim daily reward");
    } finally {
      setClaimingReward(false);
    }
  };

  const handleClaimMission = async (mission) => {
    setFeedback("");
    setClaimingMissionKey(mission.claimKey);

    try {
      const response = await gameRequest("/api/game/tasks/claim-mission", {
        method: "POST",
        body: JSON.stringify({
          missionName: mission.mission_name,
          type: mission.type,
        }),
      });

      setTaskData(response.data || emptyTaskData);
      setFeedback(response.message || "Mission claimed");
    } catch (error) {
      setFeedback(error.message || "Failed to claim mission");
    } finally {
      setClaimingMissionKey("");
    }
  };

  const currentMissions = taskData.missions[tab] || [];
  const isSignedOut = !loading && pageError.toLowerCase().includes("sign in");

  const handleViewMissions = () => {
    setTab("daily");
    window.requestAnimationFrame(() => {
      missionBoardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  useEffect(() => {
    if (scrollTarget !== "daily-rewards" || loading) {
      return;
    }

    window.requestAnimationFrame(() => {
      rewardTrackRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      onScrollHandled?.();
    });
  }, [loading, onScrollHandled, scrollTarget]);

  return (
    <section className="taskhub-shell">
      <div className="taskhub-backdrop" aria-hidden="true" />

      <div className="taskhub-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="taskhub-hero"
        >
          <div className="taskhub-hero-copy">
            <div className="taskhub-kicker">
              <Sparkles size={18} />
              <span>Task Command Center</span>
            </div>

            <h1>Daily rewards, streaks, and missions in one hub.</h1>

            <p>
              Keep your momentum alive, stack currency, and push through your
              next objective like it is part of the campaign.
            </p>

            <div className="taskhub-hero-actions">
              <button
                type="button"
                className="taskhub-secondary-btn"
                onClick={handleViewMissions}
              >
                View Missions
              </button>
            </div>

            {(feedback || pageError) && (
              <div className="taskhub-notice">
                {feedback || pageError}
              </div>
            )}
          </div>

          <div className="taskhub-hero-panel">
            <div className="taskhub-wallet-card">
              <div className="taskhub-wallet-head">
                <span>Wallet Balance</span>
                <ShieldCheck size={18} />
              </div>

              <div className="taskhub-wallet-value">
                <img src={currencyImg} alt="Lethal currency" />
                <strong>{Number(taskData.wallet.coins || 0).toLocaleString()}</strong>
              </div>

              <div className="taskhub-wallet-meta">
                <div>
                  <Flame size={16} />
                  <span>{taskData.wallet.streakCount} day streak</span>
                </div>
                <div>
                  <TimerReset size={16} />
                  <span>
                    {taskData.wallet.hasClaimedToday
                      ? "Daily reward already claimed today"
                      : `Next reward ready: +${taskData.wallet.nextRewardAmount || 0} coins`}
                  </span>
                </div>
              </div>
            </div>

            <div className="taskhub-stats-grid">
              <div className="taskhub-stat-card">
                <CalendarDays size={20} />
                <strong>{taskData.wallet.totalClaimCount}</strong>
                <span>Total daily claims</span>
              </div>
              <div className="taskhub-stat-card">
                <ListTodo size={20} />
                <strong>{missionStats.missionCount}</strong>
                <span>{tab} missions ready</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          ref={rewardTrackRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="taskhub-section-card"
        >
          <div className="taskhub-section-head">
            <div>
              <span className="taskhub-section-label">Reward Track</span>
              <h2>Weekly Login Chain</h2>
            </div>
            <p>Claim today and keep the multiplier alive.</p>
          </div>

          <div className="taskhub-reward-track">
            {(taskData.rewardTrack || []).map((item) => (
              <button
                key={item.day}
                type="button"
                className={`taskhub-reward-card ${item.status}`}
                disabled={
                  loading ||
                  claimingReward ||
                  isSignedOut ||
                  item.status !== "available"
                }
                onClick={handleClaimReward}
              >
                <span className="taskhub-day-pill">Day {item.day}</span>
                <img src={currencyImg} alt="Lethal currency" />
                <strong>{item.reward}</strong>
                <span className="taskhub-reward-status">
                  {item.status === "claimed"
                    ? "Claimed"
                    : item.status === "available"
                      ? claimingReward
                        ? "Claiming..."
                        : "Claim Reward"
                      : "Locked"}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          ref={missionBoardRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="taskhub-section-card"
        >
          <div className="taskhub-missions-head">
            <div>
              <span className="taskhub-section-label">Mission Board</span>
              <h2>Active Objectives</h2>
            </div>

            <div className="taskhub-tabs" role="tablist" aria-label="Task missions">
              <button
                type="button"
                className={tab === "daily" ? "active" : ""}
                onClick={() => setTab("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                className={tab === "weekly" ? "active" : ""}
                onClick={() => setTab("weekly")}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="taskhub-mission-summary">
            <div>
              <span>Completed</span>
              <strong>{missionStats.completedCount}</strong>
            </div>
            <div>
              <span>Total Reward Pool</span>
              <strong>{missionStats.totalReward}</strong>
            </div>
            <div>
              <span>Mode</span>
              <strong>{tab}</strong>
            </div>
          </div>

          <div className="taskhub-mission-list">
            {currentMissions.map((mission) => {
              const progressPercent = Math.min(
                100,
                ((mission.progress || 0) / (mission.total || 1)) * 100
              );
              const isBusy = claimingMissionKey === mission.claimKey;

              return (
                <div key={mission.claimKey} className="taskhub-mission-card">
                  <div className="taskhub-mission-top">
                    <span className="taskhub-mission-type">{mission.type}</span>
                    <div className="taskhub-mission-reward">
                      <img src={currencyImg} alt="Lethal currency" />
                      <strong>{mission.reward}</strong>
                    </div>
                  </div>

                  <h3>{mission.Mission}</h3>

                  <div className="taskhub-progress-meta">
                    <span>
                      {mission.progress}/{mission.total} complete
                    </span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>

                  <div className="taskhub-progress">
                    <div
                      className="taskhub-progress-bar"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    className={`taskhub-mission-btn ${
                      mission.claimed ? "claimed" : mission.canClaim ? "claimable" : ""
                    }`}
                    disabled={!mission.canClaim || isBusy || isSignedOut}
                    onClick={() => handleClaimMission(mission)}
                  >
                    {mission.claimed
                      ? "Claimed"
                      : isBusy
                        ? "Claiming..."
                        : mission.canClaim
                          ? "Claim Mission"
                          : "In Progress"}
                  </button>
                </div>
              );
            })}
          </div>

          {!loading && currentMissions.length === 0 && (
            <div className="taskhub-empty-state">
              {isSignedOut
                ? "Sign in from the top-right corner to activate your mission board."
                : "No missions available right now."}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
