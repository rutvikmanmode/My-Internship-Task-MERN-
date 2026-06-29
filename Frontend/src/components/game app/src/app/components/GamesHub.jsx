import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Coins, Gamepad2, Shield, Trophy, Zap } from "lucide-react";
import zombieRushImg from "../../../../../assets/zombie rush icon.png";
import zombieRunImg from "../../../../../assets/zombie run icon.png";
import "./GamesHub.css";

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

const games = [
  {
    title: "Zombie Rush",
    image: zombieRushImg,
    description:
      "Enter a high-pressure survival arena, blast through swarming zombies, and chase a bigger score every round.",
    reward: "Score-driven action",
    bonus: "Earn up to 500 coins",
    href: "/zombie-game/index.html",
    gradient: "from-[var(--game-accent)] to-[var(--game-secondary)]",
    borderColor: "border-[rgba(255,223,99,0.24)]",
    shadowColor: "shadow-[0_0_26px_rgba(255,223,99,0.16)]",
    icon: Coins,
  },
  {
    title: "Zombie Run",
    image: zombieRunImg,
    description:
      "Sprint through a haunted side-scrolling run, dodge danger, and stay alive long enough to turn your run into coin progress.",
    reward: "Platform survival",
    bonus: "Earn up to 1000 coins",
    href: "/zombie-run/index.html",
    gradient: "from-[var(--game-surface)] to-[var(--game-surface-strong)]",
    borderColor: "border-[rgba(174,0,33,0.24)]",
    shadowColor: "shadow-[0_0_26px_rgba(174,0,33,0.16)]",
    icon: Zap,
  },
];

export function GamesHub() {
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const stats = authUser?.stats;
  const zombieRushBestScore = Number(stats?.gameScores?.zombieRush?.bestScore || 0);
  const zombieRunBestScore = Number(stats?.gameScores?.zombieRun?.bestScore || 0);

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch(buildGameAuthUrl("/api/game/auth/profile"), {
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));

        if (!ignore && response.ok && data?.success) {
          setAuthUser(data.profile || null);
        }
      } catch {
        // Keep hub rendering even if auth lookup fails.
      } finally {
        if (!ignore) {
          setAuthChecked(true);
        }
      }
    }

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  const buildGameHref = (href) => {
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}apiBaseUrl=${encodeURIComponent(GAME_API_BASE_URL)}`;
  };

  return (
    <section className="gameshub-shell">
      <div className="gameshub-backdrop" aria-hidden="true" />

      <div className="gameshub-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="gameshub-hero"
        >
          <div className="gameshub-copy">
            <div className="gameshub-kicker">
              <Gamepad2 size={18} />
              <span>Game Vault</span>
            </div>

            <h1>Pick your mode and drop straight into the action.</h1>

            <p>
              Two zombie-themed games, one shared universe. Jump into a survival
              shooter or a fast platform run without leaving the game app style.
            </p>
            {!authUser && authChecked ? (
              <p>Sign in from the game app navigation before launching any game.</p>
            ) : null}
          </div>

          <div className="gameshub-summary">
            <div className="gameshub-summary-card">
              <Shield size={20} />
              <strong>{zombieRushBestScore.toLocaleString()}</strong>
              <span>Zombie Rush High Score</span>
            </div>
            <div className="gameshub-summary-card">
              <Trophy size={20} />
              <strong>{zombieRunBestScore.toLocaleString()}</strong>
              <span>Zombie Run High Score</span>
            </div>
          </div>
        </motion.div>

        <div className="gameshub-grid">
          {games.map((game, index) => {
            const Icon = game.icon;

            return (
              <motion.article
                key={game.title}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ y: -8 }}
                className={`gameshub-card ${game.borderColor} ${game.shadowColor}`}
              >
                <div className="gameshub-image-wrap">
                  <img src={game.image} alt={game.title} className="gameshub-image" />
                  <div className={`gameshub-image-glow bg-gradient-to-br ${game.gradient}`} />
                </div>

                <div className="gameshub-card-body">
                  <div className="gameshub-card-top">
                    <div className={`gameshub-icon bg-gradient-to-br ${game.gradient}`}>
                      <Icon className="h-5 w-5 text-[var(--game-bg)]" />
                    </div>
                    <span className="gameshub-pill">{game.reward}</span>
                  </div>

                  <h2>{game.title}</h2>
                  <p>{game.description}</p>

                  <div className="gameshub-card-footer">
                    <div className="gameshub-bonus">{game.bonus}</div>
                    <motion.a
                      whileHover={{
                        scale: authUser ? 1.04 : 1,
                        boxShadow: authUser ? "0 0 26px rgba(255,223,99,0.22)" : "none",
                      }}
                      whileTap={{ scale: authUser ? 0.97 : 1 }}
                      href={authUser ? buildGameHref(game.href) : undefined}
                      onClick={() => {
                        if (!authUser) {
                          return;
                        }

                        if (typeof window !== "undefined") {
                          window.localStorage.setItem("gameApiBaseUrl", GAME_API_BASE_URL);
                        }
                      }}
                      target={authUser ? "_blank" : undefined}
                      rel={authUser ? "noreferrer" : undefined}
                      aria-disabled={!authUser}
                      style={{
                        opacity: authUser ? 1 : 0.55,
                        pointerEvents: authUser ? "auto" : "none",
                      }}
                      className={`gameshub-play-btn bg-gradient-to-r ${game.gradient}`}
                    >
                      {authUser ? "Play Now" : "Sign In Required"}
                    </motion.a>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
