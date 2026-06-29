import { useRef, useState } from "react";
import { AnimatedBackground } from "./components/animated-background";
import { Navbar } from "./components/navbar";
import { HeroSection } from "./components/hero-section";
import { FeaturesSection } from "./components/features-section";
import { RewardsSection } from "./components/rewards-section";
import { MiniGamesSection } from "./components/mini-games-section";
import { LeaderboardSection } from "./components/leaderboard-section";
import TaskHub from "./components/TaskHub";
import { Footer } from "./components/footer";

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [taskScrollTarget, setTaskScrollTarget] = useState(null);
  const rewardsSectionRef = useRef(null);
  const gamesSectionRef = useRef(null);
  const leaderboardSectionRef = useRef(null);

  const scrollToSection = (sectionRef) => {
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleFeatureExplore = (target) => {
    if (target === "rewards") {
      setTaskScrollTarget("daily-rewards");
      setActiveSection("tasks");
      return;
    }

    if (target === "tasks") {
      setTaskScrollTarget(null);
      setActiveSection("tasks");
      return;
    }

    setTaskScrollTarget(null);
    setActiveSection("home");

    window.requestAnimationFrame(() => {
      if (target === "games") {
        scrollToSection(gamesSectionRef);
      } else if (target === "leaderboard") {
        scrollToSection(leaderboardSectionRef);
      }
    });
  };

  return (
    <div className="relative min-h-screen bg-[#272932] text-white overflow-x-hidden">
      
      {/* Background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10">
        <Navbar activeItem={activeSection} onNavChange={setActiveSection} />
        {activeSection === "tasks" ? (
          <TaskHub
            scrollTarget={taskScrollTarget}
            onScrollHandled={() => setTaskScrollTarget(null)}
          />
        ) : (
          <>
            <HeroSection
              onStartQuest={() => setActiveSection("games")}
              onViewRewards={() => setActiveSection("rewards")}
            />
            <FeaturesSection onExplore={handleFeatureExplore} />
            <div ref={rewardsSectionRef}>
              <RewardsSection />
            </div>
            <div ref={gamesSectionRef}>
              <MiniGamesSection />
            </div>
            <div ref={leaderboardSectionRef}>
              <LeaderboardSection />
            </div>
          </>
        )}
        <Footer />
      </div>
    </div>
  );
}
