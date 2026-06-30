import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Crown, MapPin, Medal, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import "./LeaderboardHub.css";

const GAME_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

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

function getRankColor(rank) {
  if (rank === 1) return "from-[var(--game-accent)] to-[var(--game-secondary)]";
  if (rank === 2) return "from-[var(--game-secondary)] to-[var(--game-surface)]";
  if (rank === 3) return "from-[var(--game-surface)] to-[var(--game-surface-strong)]";
  return "from-[#8f3d62] to-[#5b1737]";
}

function getBadge(rank) {
  if (rank === 1) return "1";
  if (rank === 2) return "2";
  if (rank === 3) return "3";
  return "P";
}

function getPlayerInitial(name) {
  return (name || "P").trim().charAt(0).toUpperCase() || "P";
}

export function LeaderboardHub() {
  const [players, setPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadLeaderboard() {
      setLoading(true);
      setPageError("");

      try {
        const response = await fetch(buildGameApiUrl("/api/game/tasks/leaderboard"), {
          credentials: "include",
          headers: getAuthHeaders(),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to load leaderboard");
        }

        if (!ignore) {
          setPlayers(data.data?.players || []);
          setCurrentUser(data.data?.currentUser || null);
          setTotalPlayers(data.data?.totalPlayers || 0);
        }
      } catch (error) {
        if (!ignore) {
          setPageError(error.message || "Failed to load leaderboard");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="leaderhub-shell">
      <div className="leaderhub-backdrop" aria-hidden="true" />

      <div className="leaderhub-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="leaderhub-hero"
        >
          <div className="leaderhub-copy">
            <div className="leaderhub-kicker">
              <Sparkles size={18} />
              <span>Global Ranking Grid</span>
            </div>

            <h1>Live leaderboard powered by real player wallets.</h1>

            <p>
              Rankings now come from backend game accounts, so coins earned from
              missions and the spin wheel actually move players up the board.
            </p>
          </div>

          <div className="leaderhub-stats">
            <div className="leaderhub-stat-card">
              <div className="leaderhub-stat-head">
                <Crown size={20} />
                <span>Total Players</span>
              </div>
              <strong>{totalPlayers}</strong>
            </div>

            <div className="leaderhub-stat-card">
              <div className="leaderhub-stat-head">
                <Target size={20} />
                <span>Your Rank</span>
              </div>
              <strong>{currentUser ? `#${currentUser.rank}` : "--"}</strong>
            </div>

            <div className="leaderhub-stat-card">
              <div className="leaderhub-stat-head">
                <ShieldCheck size={20} />
                <span>Your Coins</span>
              </div>
              <strong>
                {currentUser ? currentUser.coins.toLocaleString() : "--"}
              </strong>
            </div>
          </div>
        </motion.div>

        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="leaderhub-usercard"
          >
            <span className="leaderhub-section-label">Your Position</span>
            <div className="leaderhub-usergrid">
              <div>
                <strong>#{currentUser.rank}</strong>
                <span>Current rank</span>
              </div>
              <div>
                <strong>{currentUser.coins.toLocaleString()}</strong>
                <span>Coins</span>
              </div>
              <div>
                <strong>{currentUser.level}</strong>
                <span>Level</span>
              </div>
              <div>
                <strong>{currentUser.streak}</strong>
                <span>Streak</span>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="leaderhub-board"
        >
          <div className="leaderhub-head">
            <div>
              <span className="leaderhub-section-label">Leaderboard</span>
              <h2>Top Ranked Players</h2>
            </div>
            <p>
              {pageError
                ? pageError
                : loading
                  ? "Loading rankings..."
                  : "Live standings sorted by coin balance."}
            </p>
          </div>

          <div className="leaderhub-list">
            {players.map((player) => (
              <div
                key={player.userId}
                className={`leaderhub-row ${
                  currentUser?.userId === player.userId ? "is-current-user" : ""
                }`}
              >
                <button
                  type="button"
                  className="leaderhub-avatar-button"
                  onClick={() => setSelectedPlayer(player)}
                  aria-label={`Open ${player.name} profile`}
                >
                  <div
                    className={`leaderhub-rank-badge bg-gradient-to-br ${getRankColor(
                      player.rank
                    )}`}
                  >
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="leaderhub-rank-avatar"
                      />
                    ) : (
                      <span>{getBadge(player.rank) || getPlayerInitial(player.name)}</span>
                    )}
                  </div>
                </button>

                <div className="leaderhub-player-main">
                  <div className="leaderhub-player-name">
                    <h3>{player.name}</h3>
                    {player.rank <= 3 && <Medal className="w-5 h-5" />}
                  </div>
                  <p>
                    Level {player.level} • {player.streak} day streak
                  </p>
                </div>

                <div className="leaderhub-player-score">
                  <strong>{player.coins.toLocaleString()}</strong>
                  <span>coins</span>
                </div>

                <div className="leaderhub-player-rank">#{player.rank}</div>
              </div>
            ))}
          </div>

          {!loading && !players.length && (
            <div className="leaderhub-empty-state">
              No ranked players yet. Create an account and earn coins to appear here.
            </div>
          )}
        </motion.div>
      </div>

      {selectedPlayer && (
        <div
          className="leaderhub-modal-overlay"
          onClick={() => setSelectedPlayer(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="leaderhub-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="leaderhub-modal-close"
              onClick={() => setSelectedPlayer(null)}
              aria-label="Close player profile"
            >
              <X size={18} />
            </button>

            <div className="leaderhub-modal-top">
              <div className="leaderhub-modal-avatar">
                {selectedPlayer.avatarUrl ? (
                  <img src={selectedPlayer.avatarUrl} alt={selectedPlayer.name} />
                ) : (
                  <span>{getPlayerInitial(selectedPlayer.name)}</span>
                )}
              </div>

              <div className="leaderhub-modal-heading">
                <h3>{selectedPlayer.name}</h3>
                <p>Rank #{selectedPlayer.rank}</p>
              </div>
            </div>

            <div className="leaderhub-modal-stats">
              <div>
                <span>Coins</span>
                <strong>{selectedPlayer.coins.toLocaleString()}</strong>
              </div>
              <div>
                <span>Level</span>
                <strong>{selectedPlayer.level}</strong>
              </div>
              <div>
                <span>Streak</span>
                <strong>{selectedPlayer.streak} days</strong>
              </div>
            </div>

            {(selectedPlayer.location || selectedPlayer.about || selectedPlayer.email) && (
              <div className="leaderhub-modal-details">
                {selectedPlayer.location && (
                  <p className="leaderhub-modal-location">
                    <MapPin size={16} />
                    <span>{selectedPlayer.location}</span>
                  </p>
                )}
                {selectedPlayer.about && <p>{selectedPlayer.about}</p>}
                {!selectedPlayer.about && selectedPlayer.email && <p>{selectedPlayer.email}</p>}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </section>
  );
}
