import { motion } from "motion/react";
import { Gamepad2 } from "lucide-react";
import zombieRushIcon from "../../../../../assets/zombie rush icon.png";
import zombieRunIcon from "../../../../../assets/zombie run icon.png";

export function MiniGamesSection() {
  const games = [
    {
      cardIcon: zombieRushIcon,
      title: "Zombie Rush",
      description:
        "Fight through waves of zombies in a crimson survival arena. Move with WASD, aim fast, and rack up a massive score.",
      gradient: "from-[var(--game-accent)] to-[var(--game-secondary)]",
      shadowColor: "shadow-[0_0_22px_rgba(255,223,99,0.18)]",
      borderColor: "border-[rgba(255,223,99,0.24)]",
      reward: "Up to 500 coins",
      href: "/zombie-game/index.html",
    },
    {
      cardIcon: zombieRunIcon,
      title: "Zombie Run",
      description:
        "Dash through a zombie-filled platform run, dodge danger, and survive each stretch to stack up high coin rewards.",
      gradient: "from-[var(--game-surface)] to-[var(--game-surface-strong)]",
      shadowColor: "shadow-[0_0_22px_rgba(174,0,33,0.18)]",
      borderColor: "border-[rgba(174,0,33,0.24)]",
      reward: "Up to 1000 coins",
      href: "/zombie-run/index.html",
    },
  ];

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center sm:mb-16"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(207,125,59,0.24)] bg-[rgba(106,22,70,0.18)] px-4 py-2 backdrop-blur-xl">
            <Gamepad2 className="h-4 w-4 text-[var(--game-secondary)]" />
            <span
              className="text-[0.95rem] font-semibold text-[var(--game-secondary)]"
              style={{ fontFamily: "var(--game-font-body)" }}
            >
              Play & Earn
            </span>
          </div>

          <h2
            className="mb-4 text-[2.4rem] font-black tracking-[0.05em] sm:text-[3.3rem] md:text-[4.5rem] lg:text-[5.4rem]"
            style={{ fontFamily: "var(--game-font-display)" }}
          >
            <span className="bg-gradient-to-r from-[var(--game-surface)] via-[var(--game-surface-strong)] to-[var(--game-secondary)] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(174,0,33,0.24)]">
              MINI GAMES
            </span>
          </h2>

          <p
            className="mx-auto max-w-3xl text-[1rem] font-medium leading-[1.55] text-[var(--game-muted)] sm:text-[1.2rem] md:text-[1.5rem] lg:text-[1.7rem]"
            style={{ fontFamily: "var(--game-font-body)" }}
          >
            Take a break and earn bonus rewards with our addictive mini-games
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {games.map((game, index) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              whileHover={{ scale: 1.02, y: -8 }}
              className="group relative"
            >
              <div
                className={`relative h-full overflow-hidden rounded-2xl border ${game.borderColor} bg-[var(--game-panel)] p-5 shadow-2xl transition-all duration-300 ${game.shadowColor} backdrop-blur-xl sm:p-6 lg:p-8`}
              >
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
                />

                <div className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[rgba(255,255,255,0.06)] p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md sm:right-5 sm:top-5 sm:h-12 sm:w-12">
                  <img
                    src={game.cardIcon}
                    alt={`${game.title} icon`}
                    className="h-full w-full rounded-md object-cover"
                  />
                </div>

                <div className="relative z-10 flex h-full flex-col">
                  <h3
                    className="mb-4 pr-12 text-[1.55rem] font-bold text-white sm:pr-14 sm:text-[1.75rem] lg:text-[2rem]"
                    style={{ fontFamily: "var(--game-font-display)" }}
                  >
                    {game.title}
                  </h3>

                  <p
                    className="mb-6 flex-grow text-[0.98rem] font-medium leading-[1.65] text-[var(--game-subtle)] sm:text-[1.02rem] lg:text-[1.08rem]"
                    style={{ fontFamily: "var(--game-font-body)" }}
                  >
                    {game.description}
                  </p>

                  <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                    <span
                      className="text-[0.98rem] font-bold text-[var(--game-accent)] sm:text-[1rem]"
                      style={{ fontFamily: "var(--game-font-body)" }}
                    >
                      Reward: {game.reward}
                    </span>

                    <motion.a
                      whileHover={{
                        scale: 1.04,
                        boxShadow: "0 0 20px rgba(223, 229, 0, 0.5)",
                      }}
                      whileTap={{ scale: 0.97 }}
                      href={game.href || undefined}
                      target={game.href ? "_blank" : undefined}
                      rel={game.href ? "noreferrer" : undefined}
                      aria-disabled={!game.href}
                      className={`rounded-lg bg-gradient-to-r px-5 py-3 text-center text-[0.95rem] font-bold text-[var(--game-bg)] shadow-lg sm:text-[0.98rem] ${game.gradient} ${game.href ? "cursor-pointer" : "pointer-events-none opacity-70"}`}
                      style={{ fontFamily: "var(--game-font-body)" }}
                    >
                      Play Now
                    </motion.a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
