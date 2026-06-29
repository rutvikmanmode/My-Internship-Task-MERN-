import { motion } from "motion/react";
import { Calendar, Gamepad2, ListChecks, Trophy } from "lucide-react";

export function FeaturesSection({ onExplore }) {
  const features = [
    {
      icon: Calendar,
      title: "Daily Login Rewards",
      target: "rewards",
      description:
        "Claim coins every day. Build your streak and unlock bonus multipliers!",
      gradient: "from-[var(--game-accent)] to-[var(--game-secondary)]",
      shadowColor: "shadow-[0_0_24px_rgba(255,223,99,0.2)]",
      iconBg: "bg-[rgba(255,223,99,0.14)]",
      borderColor: "border-[rgba(255,223,99,0.24)]",
    },
    {
      icon: ListChecks,
      title: "Task System",
      target: "tasks",
      description:
        "Complete tasks to earn XP and level up. Track your progress in real-time.",
      gradient: "from-[var(--game-surface-strong)] to-[var(--game-surface)]",
      shadowColor: "shadow-[0_0_24px_rgba(174,0,33,0.18)]",
      iconBg: "bg-[rgba(174,0,33,0.14)]",
      borderColor: "border-[rgba(174,0,33,0.24)]",
    },
    {
      icon: Gamepad2,
      title: "Mini Games",
      target: "games",
      description:
        "Play addictive mini-games and earn bonus rewards. Compete for high scores!",
      gradient: "from-[var(--game-secondary)] to-[var(--game-accent)]",
      shadowColor: "shadow-[0_0_24px_rgba(207,125,59,0.18)]",
      iconBg: "bg-[rgba(207,125,59,0.14)]",
      borderColor: "border-[rgba(207,125,59,0.24)]",
    },
    {
      icon: Trophy,
      title: "Leaderboard",
      target: "leaderboard",
      description:
        "Compete globally. Climb ranks and showcase your achievements to the world.",
      gradient: "from-[var(--game-surface)] to-[var(--game-surface-strong)]",
      shadowColor: "shadow-[0_0_24px_rgba(106,22,70,0.18)]",
      iconBg: "bg-[rgba(106,22,70,0.16)]",
      borderColor: "border-[rgba(106,22,70,0.28)]",
    },
  ];

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2
            className="mb-4 text-[2.2rem] font-black tracking-[0.05em] sm:text-[3rem] md:text-[4.1rem] lg:text-[5.4rem]"
            style={{ fontFamily: "var(--game-font-display)" }}
          >
            <span className="bg-gradient-to-r from-[var(--game-accent)] via-[var(--game-secondary)] to-[var(--game-surface)] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,223,99,0.25)]">
              CORE FEATURES
            </span>
          </h2>

          <p
            className="mx-auto max-w-3xl text-[1rem] font-medium leading-[1.55] text-[var(--game-muted)] sm:text-[1.15rem] md:text-[1.35rem] lg:text-[1.7rem]"
            style={{ fontFamily: "var(--game-font-body)" }}
          >
            Experience productivity like never before with gamified mechanics
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{
                  scale: 1.03,
                  rotateY: 5,
                  rotateX: -5,
                }}
                className="group relative"
                style={{ perspective: "1000px" }}
              >
                <div
                  className={`relative min-h-[220px] overflow-hidden rounded-2xl border ${feature.borderColor} bg-[var(--game-panel)] p-5 shadow-2xl transition-all duration-300 sm:min-h-[260px] sm:p-6 md:min-h-[310px] md:p-8 lg:p-10 ${feature.shadowColor}`}
                >
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
                  />

                  <motion.div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 blur-xl group-hover:opacity-30`}
                    initial={false}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  <div className="relative z-10 flex h-full flex-col">
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className={`mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-xl border sm:mb-6 sm:h-[60px] sm:w-[60px] md:mb-8 md:h-[72px] md:w-[72px] ${feature.borderColor} ${feature.iconBg} backdrop-blur-xl shadow-lg`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-[var(--game-text)] opacity-90 sm:h-7 sm:w-7 md:h-9 md:w-9" />
                      </div>
                    </motion.div>

                    <h3
                      className="mb-3 text-[1.5rem] font-bold leading-[1.05] text-white sm:mb-4 sm:text-[1.85rem] md:mb-5 md:text-[2.35rem] lg:text-[2.7rem]"
                      style={{ fontFamily: "var(--game-font-display)" }}
                    >
                      {feature.title}
                    </h3>

                    <p
                      className="max-w-[28rem] text-[0.95rem] font-medium leading-[1.65] text-[var(--game-muted)] sm:text-[1.05rem] md:text-[1.22rem] md:leading-[1.75] lg:text-[1.35rem]"
                      style={{ fontFamily: "var(--game-font-body)" }}
                    >
                      {feature.description}
                    </p>

                    <motion.button
                      type="button"
                      initial={{ opacity: 1, x: 0 }}
                      whileHover={{ opacity: 1, x: 5 }}
                      onClick={() => onExplore?.(feature.target)}
                      className="mt-auto flex items-center gap-2 pt-5 text-left text-[0.95rem] font-bold text-[var(--game-accent)] sm:pt-6 md:pt-8 md:text-[1.08rem] lg:text-[1.15rem]"
                      style={{ fontFamily: "var(--game-font-body)" }}
                    >
                      <span>Explore</span>
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {"->"}
                      </motion.span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
