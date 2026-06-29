import { motion } from "motion/react";
import { Zap, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import heroVideoOne from "../../../../../assets/vid 1.mp4";
import heroVideoTwo from "../../../../../assets/vid 2.mp4";
import heroVideoThree from "../../../../../assets/vid 3.mp4";
import logoImg from "../../../../../assets/task abomination.png";

const HERO_VIDEOS = [heroVideoOne, heroVideoTwo, heroVideoThree];
const HERO_STATS = [
  { label: "Active Users", value: "50K+" },
  { label: "Tasks Completed", value: "1M+" },
  { label: "Coins Earned", value: "10M+" },
];

export function HeroSection({ onStartQuest, onViewRewards }) {
  const [coins, setCoins] = useState([]);
  const [isVideoVisible] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const videoRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCoins((prev) => {
        const newCoins = [
          ...prev,
          {
            id: Date.now(),
            x: Math.random() * 100,
            y: Math.random() * 100,
          },
        ];
        return newCoins.slice(-4);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((videoElement, index) => {
      if (!videoElement) {
        return;
      }

      if (index === activeVideoIndex) {
        videoElement.currentTime = 0;
        const playPromise = videoElement.play();

        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => { });
        }
      } else {
        videoElement.pause();
        videoElement.currentTime = 0;
      }
    });
  }, [activeVideoIndex]);

  const handleVideoEnded = () => {
    setActiveVideoIndex((currentIndex) => (currentIndex + 1) % HERO_VIDEOS.length);
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:pt-20">
      <div
        className={`absolute left-0 right-0 top-20 bottom-8 w-full overflow-hidden border-y border-[color:var(--game-border)] bg-[var(--game-panel-soft)] shadow-[0_35px_120px_rgba(35,7,16,0.48)] transition-all duration-700 sm:top-24 sm:bottom-16 ${isVideoVisible
            ? "opacity-100 scale-100"
            : "pointer-events-none opacity-0 scale-[1.04]"
          }`}
      >
        <div className="absolute inset-0 bg-[rgba(61,20,38,0.18)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(61,20,38,0.56)] via-[rgba(61,20,38,0.12)] to-[rgba(106,22,70,0.12)]" />
        {HERO_VIDEOS.map((videoSrc, index) => (
          <video
            key={videoSrc}
            ref={(element) => {
              videoRefs.current[index] = element;
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${activeVideoIndex === index ? "opacity-100" : "opacity-0"
              }`}
            src={videoSrc}
            muted
            playsInline
            preload={index === activeVideoIndex ? "auto" : "metadata"}
            onEnded={activeVideoIndex === index ? handleVideoEnded : undefined}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(223, 229, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(223, 229, 0, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            animation: "gridMove 20s linear infinite",
          }}
        />
      </div>

      {/* Floating Coins */}
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          initial={{ opacity: 0, y: "100%", x: `${coin.x}%` }}
          animate={{ opacity: [0, 1, 0], y: "-100%" }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute h-5 w-5 rounded-full bg-gradient-to-br from-[var(--game-accent)] to-[var(--game-secondary)] shadow-lg shadow-[0_0_18px_rgba(255,223,99,0.3)] sm:h-8 sm:w-8"
          style={{ left: `${coin.x}%` }}
        />
      ))}

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-6xl text-center">

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-5 flex justify-center sm:mb-6"
        >
          <img
            src={logoImg}
            alt="Task Abomination"
            className="h-auto w-[220px] max-w-full object-contain drop-shadow-[0_0_30px_rgba(255,223,99,0.28)] transition-all duration-500 hover:scale-105 sm:w-[340px] md:w-[500px] lg:w-[700px]"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mx-auto mb-10 max-w-3xl text-[1.05rem] font-medium leading-[1.55] text-[var(--game-muted)] sm:text-[1.3rem] md:mb-12 md:text-[1.95rem]"
          style={{ fontFamily: "var(--game-font-body)" }}
        >
          Turn Your Daily Grind Into a{" "}
          <span className="text-[var(--game-accent)] font-bold">Game</span>
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-6"
        >
          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 40px rgba(223, 229, 0, 0.8)",
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartQuest}
            className="group relative min-h-[58px] w-full overflow-hidden rounded-xl border-2 border-[rgba(255,223,99,0.38)] bg-gradient-to-r from-[var(--game-accent)] via-[var(--game-secondary)] to-[var(--game-surface-strong)] px-5 py-3.5 text-[1rem] font-bold text-[var(--game-bg)] shadow-2xl shadow-[0_0_24px_rgba(255,223,99,0.28)] sm:min-h-[64px] sm:w-auto sm:px-6 sm:py-4 sm:text-[1.12rem]"
            style={{ fontFamily: "var(--game-font-body)" }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-[var(--game-surface-strong)] to-[var(--game-surface)]"
              initial={{ x: "-100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3 }}
            />

            <span className="relative flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Start Quest
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>

          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 30px rgba(226, 69, 174, 0.5)",
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onViewRewards}
            className="min-h-[58px] w-full rounded-xl border-2 border-[rgba(207,125,59,0.34)] bg-[var(--game-panel)] px-5 py-3.5 text-[1rem] font-bold text-[var(--game-secondary)] shadow-lg shadow-[0_0_22px_rgba(207,125,59,0.12)] backdrop-blur-xl sm:min-h-[64px] sm:w-auto sm:px-6 sm:py-4 sm:text-[1.12rem]"
            style={{ fontFamily: "var(--game-font-body)" }}
          >
            View Rewards
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-16 lg:grid-cols-3 lg:gap-8"
        >
          {HERO_STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="rounded-xl border border-[rgba(255,223,99,0.16)] bg-[var(--game-panel)] p-5 shadow-lg backdrop-blur-xl sm:p-6"
            >
              <div
                className="mb-2 bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] bg-clip-text text-[2rem] font-black text-transparent sm:text-[2.2rem] lg:text-[2.5rem]"
                style={{ fontFamily: "var(--game-font-display)" }}
              >
                {stat.value}
              </div>

              <div
                className="text-[0.9rem] font-medium text-[var(--game-subtle)] sm:text-[0.98rem]"
                style={{ fontFamily: "var(--game-font-body)" }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
      `}</style>
    </section>
  );
}

