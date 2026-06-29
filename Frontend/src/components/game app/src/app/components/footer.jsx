import { motion } from "motion/react";
import { Bird, FolderGit2, MessageCircle, Mail } from "lucide-react";
import logoImg from "../../../../../assets/task abomination.png";

export function Footer() {
  const socialLinks = [
    { icon: Bird, label: "Twitter", href: "#" },
    { icon: FolderGit2, label: "GitHub", href: "#" },
    { icon: MessageCircle, label: "Discord", href: "#" },
    { icon: Mail, label: "Email", href: "#" },
  ];

  return (
    <footer className="relative py-10 px-4 overflow-hidden border-t border-[rgba(255,223,99,0.18)] sm:py-12 sm:px-6 lg:py-16">
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(106,22,70,0.18)] to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 gap-8 mb-8 sm:grid-cols-2 sm:gap-10 sm:mb-10 md:grid-cols-3 lg:gap-12 lg:mb-12">
          
          {/* Brand */}
          <div>
            <div className="mb-4">
              <img 
                src={logoImg} 
                alt="Task Abomination" 
                className="h-12 w-auto object-contain"
              />
            </div>

            <p
              className="text-[var(--game-muted)] mb-6 font-medium"
              style={{ fontFamily: "var(--game-font-body)" }}
            >
              Level up your routine with quests, rewards, and progress you can actually feel.
            </p>

            <div className="flex gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;

                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 backdrop-blur-xl bg-[var(--game-panel)] border border-[rgba(207,125,59,0.24)] rounded-lg flex items-center justify-center text-[var(--game-secondary)] hover:text-[var(--game-accent)] transition-colors shadow-lg"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-lg font-bold text-white mb-4"
              style={{ fontFamily: "var(--game-font-display)" }}
            >
              Quick Links
            </h4>

            <ul className="space-y-2">
              {["About", "Features", "Pricing", "FAQ", "Contact"].map((link) => (
                <motion.li key={link} whileHover={{ x: 5 }}>
                  <a
                    href="#"
                    className="text-[var(--game-muted)] hover:text-[var(--game-accent)] transition-colors font-medium"
                    style={{ fontFamily: "var(--game-font-body)" }}
                  >
                    {link}
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4
              className="text-lg font-bold text-white mb-4"
              style={{ fontFamily: "var(--game-font-display)" }}
            >
              Stay Updated
            </h4>

            <p
              className="text-[var(--game-muted)] mb-4 font-medium"
              style={{ fontFamily: "var(--game-font-body)" }}
            >
              Get the latest updates on new features and events.
            </p>

            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-grow px-4 py-2 backdrop-blur-xl bg-[var(--game-panel)] border border-[rgba(207,125,59,0.24)] rounded-lg text-[var(--game-text)] placeholder-[var(--game-subtle)] focus:outline-none focus:border-[rgba(255,223,99,0.3)] font-medium"
                style={{ fontFamily: "var(--game-font-body)" }}
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-gradient-to-r from-[var(--game-accent)] to-[var(--game-secondary)] rounded-lg font-bold text-[var(--game-bg)] shadow-lg"
              >
                →
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[rgba(255,223,99,0.18)] flex flex-col items-center justify-between gap-4 sm:pt-8 md:flex-row">
          <p
            className="text-[var(--game-subtle)] text-sm font-medium"
            style={{ fontFamily: "var(--game-font-body)" }}
          >
            © 2026 Task Abomination. All rights reserved.
          </p>

          <div className="flex gap-6 text-sm">
            {["Privacy Policy", "Terms of Service", "Cookies"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-[var(--game-subtle)] hover:text-[var(--game-secondary)] transition-colors font-medium"
                style={{ fontFamily: "var(--game-font-body)" }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

