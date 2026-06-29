import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatedBackground } from "./game app/src/app/components/animated-background";
import { Navbar } from "./game app/src/app/components/navbar";
import { Footer } from "./game app/src/app/components/footer";
import "./GameApp.css";

const GameDashboard = lazy(() =>
  import("./game app/src/app/components/GameDashboard").then((module) => ({
    default: module.GameDashboard,
  }))
);
const HeroSection = lazy(() =>
  import("./game app/src/app/components/hero-section").then((module) => ({
    default: module.HeroSection,
  }))
);
const FeaturesSection = lazy(() =>
  import("./game app/src/app/components/features-section").then((module) => ({
    default: module.FeaturesSection,
  }))
);
const RewardsSection = lazy(() =>
  import("./game app/src/app/components/rewards-section").then((module) => ({
    default: module.RewardsSection,
  }))
);
const RewardsHub = lazy(() =>
  import("./game app/src/app/components/RewardsHub").then((module) => ({
    default: module.RewardsHub,
  }))
);
const GamesHub = lazy(() =>
  import("./game app/src/app/components/GamesHub").then((module) => ({
    default: module.GamesHub,
  }))
);
const MiniGamesSection = lazy(() =>
  import("./game app/src/app/components/mini-games-section").then((module) => ({
    default: module.MiniGamesSection,
  }))
);
const LeaderboardHub = lazy(() =>
  import("./game app/src/app/components/LeaderboardHub").then((module) => ({
    default: module.LeaderboardHub,
  }))
);
const LeaderboardSection = lazy(() =>
  import("./game app/src/app/components/leaderboard-section").then((module) => ({
    default: module.LeaderboardSection,
  }))
);
const TaskHub = lazy(() => import("./game app/src/app/components/TaskHub"));

function GameSectionFallback() {
  return <div className="min-h-[40vh]" aria-hidden="true" />;
}

export default function GameApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("home");
  const isDashboardRoute = location.pathname === "/game/dashboard";

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeSection, location.pathname]);

  const handleNavChange = (section) => {
    if (section === "dashboard") {
      navigate("/game/dashboard");
      return;
    }

    if (isDashboardRoute) {
      navigate("/game");
    }

    setActiveSection(section);
  };

  const activeNavItem = isDashboardRoute ? "dashboard" : activeSection;

  return (
    <div className="game-app-root relative min-h-screen bg-[var(--game-bg)] text-[var(--game-text)] overflow-x-hidden">
      {/* Background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10">
        <Navbar activeItem={activeNavItem} onNavChange={handleNavChange} />
        <Routes>
          <Route
            index
            element={
              <Suspense fallback={<GameSectionFallback />}>
                {activeSection === "tasks" ? (
                  <TaskHub />
                ) : activeSection === "rewards" ? (
                  <RewardsHub />
                ) : activeSection === "games" ? (
                  <GamesHub />
                ) : activeSection === "leaderboard" ? (
                  <LeaderboardHub />
                ) : (
                  <>
                    <HeroSection
                      onStartQuest={() => setActiveSection("games")}
                      onViewRewards={() => setActiveSection("rewards")}
                    />
                    <FeaturesSection />
                    <RewardsSection />
                    <MiniGamesSection />
                    <LeaderboardSection onViewFull={() => setActiveSection("leaderboard")} />
                  </>
                )}
              </Suspense>
            }
          />
          <Route
            path="dashboard"
            element={
              <Suspense fallback={<GameSectionFallback />}>
                <GameDashboard />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/game" replace />} />
        </Routes>
        <Footer />
      </div>
    </div>
  );
}
