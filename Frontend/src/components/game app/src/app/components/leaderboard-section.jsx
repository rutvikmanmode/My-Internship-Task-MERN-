import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Crown, Medal, TrendingUp } from "lucide-react";

const GAME_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

function buildGameApiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${GAME_API_BASE_URL}${path}`;
}

function getRankColor(rank) {
  if (rank === 1) return "from-[var(--game-accent)] to-[var(--game-secondary)]";
  if (rank === 2) return "from-[var(--game-secondary)] to-[var(--game-surface)]";
  if (rank === 3) return "from-[var(--game-surface)] to-[var(--game-surface-strong)]";
  return "from-[#8f3d62] to-[#5b1737]";
}

function getRankBorder(rank) {
  if (rank === 1) return "border-[rgba(255,223,99,0.28)]";
  if (rank === 2) return "border-[rgba(207,125,59,0.24)]";
  if (rank === 3) return "border-[rgba(174,0,33,0.24)]";
  return "border-[rgba(255,223,99,0.12)]";
}

function getBadge(rank) {
  if (rank === 1) return "👑";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "⚔";
}

export function LeaderboardSection({ onViewFull }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadPreview() {
      try {
        const response = await fetch(buildGameApiUrl("/api/game/tasks/leaderboard"), {
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.success) {
          return;
        }

        if (!ignore) {
          setPlayers(data.data?.preview || []);
        }
      } catch {
        // Keep the homepage usable if leaderboard is unavailable.
      }
    }

    loadPreview();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="relative py-16 px-4 overflow-hidden sm:px-6 sm:py-24 lg:py-32">
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 backdrop-blur-xl bg-[rgba(106,22,70,0.16)] border border-[rgba(255,223,99,0.2)] rounded-full">
            <Crown className="w-4 h-4 text-[var(--game-accent)]" />
            <span
              className="text-[0.95rem] text-[var(--game-accent)] font-semibold"
              style={{ fontFamily: "var(--game-font-body)" }}
            >
              Top Players
            </span>
          </div>

          <h2
            className="text-[2.2rem] sm:text-[3rem] md:text-[4.1rem] lg:text-[5.4rem] font-black tracking-[0.05em] mb-4"
            style={{ fontFamily: "var(--game-font-display)" }}
          >
            <span className="bg-gradient-to-r from-[var(--game-accent)] via-[var(--game-secondary)] to-[var(--game-surface-strong)] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,223,99,0.24)]">
              LEADERBOARD
            </span>
          </h2>

          <p
            className="text-[1rem] sm:text-[1.15rem] md:text-[1.35rem] lg:text-[1.7rem] text-[var(--game-muted)] max-w-3xl mx-auto font-medium leading-[1.55]"
            style={{ fontFamily: "var(--game-font-body)" }}
          >
            Compete globally and climb the ranks to earn exclusive rewards
          </p>
        </motion.div>

        <div className="space-y-3 sm:space-y-4">
          {players.map((player, index) => (
            <motion.div
              key={player.userId || player.rank}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, x: 10 }}
              className={`backdrop-blur-xl bg-[var(--game-panel)] border ${getRankBorder(
                player.rank
              )} rounded-xl p-4 shadow-xl transition-all duration-300 sm:rounded-2xl sm:p-6 ${
                player.rank === 1 ? "shadow-[0_0_22px_rgba(255,223,99,0.16)]" : ""
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className={`w-10 h-10 bg-gradient-to-br ${getRankColor(
                    player.rank
                  )} rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 sm:w-14 sm:h-14 sm:rounded-xl`}
                >
                  <span className="text-lg sm:text-2xl">{getBadge(player.rank)}</span>
                </motion.div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3
                      className="text-[1.15rem] font-bold text-white truncate sm:text-[1.35rem] md:text-[1.65rem]"
                      style={{ fontFamily: "var(--game-font-display)" }}
                    >
                      {player.name}
                    </h3>
                    {player.rank <= 3 && (
                      <Medal
                        className={`w-5 h-5 flex-shrink-0 ${
                          player.rank === 1
                            ? "text-[var(--game-accent)]"
                            : player.rank === 2
                              ? "text-[var(--game-secondary)]"
                              : "text-[var(--game-surface)]"
                        }`}
                      />
                    )}
                  </div>

                  <p
                    className="text-[0.88rem] text-[var(--game-subtle)] font-medium sm:text-[1rem]"
                    style={{ fontFamily: "var(--game-font-body)" }}
                  >
                    Level {player.level} • {player.streak} day streak
                  </p>
                </div>

                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div
                    className="text-[1.3rem] font-black bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] bg-clip-text text-transparent sm:text-[1.5rem] md:text-[1.9rem]"
                    style={{ fontFamily: "var(--game-font-display)" }}
                  >
                    {player.coins.toLocaleString()}
                  </div>

                  <p
                    className="text-[1rem] text-[var(--game-subtle)] font-medium"
                    style={{ fontFamily: "var(--game-font-body)" }}
                  >
                    coins
                  </p>
                </div>

                <div
                  className={`w-10 h-10 bg-gradient-to-br ${getRankColor(
                    player.rank
                  )} rounded-lg flex items-center justify-center flex-shrink-0`}
                >
                  <span
                    className="text-[1rem] font-black text-[var(--game-bg)] sm:text-[1.4rem]"
                    style={{ fontFamily: "var(--game-font-display)" }}
                  >
                    #{player.rank}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 30px rgba(223, 229, 0, 0.5)",
            }}
            whileTap={{ scale: 0.95 }}
            className="min-h-[60px] px-6 py-4 bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] rounded-xl font-bold text-[1.05rem] text-[var(--game-bg)] shadow-lg shadow-[0_0_24px_rgba(255,223,99,0.18)] inline-flex items-center gap-2"
            style={{ fontFamily: "var(--game-font-body)" }}
            onClick={onViewFull}
            type="button"
          >
            <TrendingUp className="w-5 h-5" />
            View Full Leaderboard
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
