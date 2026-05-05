import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores";
import WavyBackgroundDemo from "@/components/wavy-background-demo";
import { Meteors } from "@/components/ui/meteors";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { CometCard } from "@/components/ui/comet-card";
import { Button } from "@/components/ui/moving-border";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const TypewriterText = ({ text, className }: { text: string; className?: string }) => {
  const words = text.split(" ");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const child = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2 },
    },
  };

  return (
    <motion.p
      ref={ref}
      className={className}
      variants={container}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {words.map((word, index) => (
        <motion.span key={index} variants={child} className="inline-block mr-[0.25em]">
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
};

const baseImages = [
  "/images/crypto_bitcoin_3d.png",
  "/images/crypto_dashboard_iso.png",
  "/images/crypto_blockchain_nodes.png",
  "/images/crypto_ethereum_glass.png",
  "/images/crypto_candlestick_neon.png",
  "/images/crypto_ai_brain.png",
];

// Repeat the images to fill the 3D Marquee grid (4 columns)
const marqueeImages = [
  ...baseImages, ...baseImages, ...baseImages, ...baseImages, ...baseImages
];
import {
  ChevronRight,
  Radar,
  Zap,
  BrainCircuit,
  Shield,
  BarChart3,
  Target,
  Activity,
  Globe,
  Cpu,
  Lock,
  ArrowRight,
  LineChart,
  Wallet,
  LogIn,
} from "lucide-react";

const HomePage = () => {

  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#0a0e17] text-[#dee2f5] relative">
      {/* Top Nav (Floating) */}
      <div className="absolute top-0 left-0 right-0 z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00d4ff] flex items-center justify-center">
              <Radar className="w-5 h-5 text-[#0a0e17]" />
            </div>
            <span className="font-bold text-xl text-[#dee2f5]">EdgeIQ</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                onClick={() => navigate("/markets")}
                borderRadius="0.5rem"
                className="px-4 py-2 text-sm bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
              >
                Dashboard
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                borderRadius="0.5rem"
                className="px-4 py-2 text-sm bg-[#00d4ff] text-[#0a0e17] font-medium hover:brightness-110 transition-all gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>
        </nav>
      </div>
      {/* Hero Section with Wavy Background */}
      <WavyBackgroundDemo />

      {/* Stats Banner */}
      <div className="border-y border-[#1a2030] bg-[#0f1420] py-8">
        <InfiniteMovingCards
          items={[
            { title: "Live", subtitle: "Prediction Markets", color: "#00d4ff" },
            { title: "4", subtitle: "AI Agents", color: "#00ff88" },
            { title: "<12s", subtitle: "Analysis Pipeline", color: "#ffa502" },
            { title: "Real-time", subtitle: "Price Data", color: "#ff6b81" },
          ]}
          direction="right"
          speed="normal"
        />
      </div>

      {/* What is Quant Finance */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-[#dee2f5] mb-4">
              What is <span className="text-[#00d4ff]">Quantitative Finance?</span>
            </h2>
            <TypewriterText 
              className="text-[#8b92a8] leading-relaxed mb-4"
              text="Quantitative finance uses statistical models and algorithms to identify market inefficiencies — exploiting the gap between implied odds and true probabilities."
            />
            <TypewriterText 
              className="text-[#8b92a8] leading-relaxed mb-4"
              text="EdgeIQ automates your edge. We scan Bayse prediction markets, leverage Gemini AI for real-time research, and deliver actionable trade signals with optimal Kelly Criterion sizing."
            />
            <div className="flex items-center gap-2 text-sm text-[#00d4ff]">
              <LineChart className="w-4 h-4" />
              <span>Expected Value · Sharpe Ratio · Kelly Criterion</span>
            </div>
          </div>
          <div className="bg-black rounded-xl border border-[#1a2030] p-6 relative overflow-hidden group">
            <Meteors number={15} />
            <h3 className="relative z-10 text-sm font-semibold text-[#dee2f5] mb-4">The Edge Equation</h3>
            <div className="relative z-10 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#00d4ff]">1</span>
                </div>
                <div>
                  <p className="text-sm text-[#dee2f5] font-medium">Market Scanner</p>
                  <p className="text-xs text-[#8b92a8]">Discover active prediction markets with volume & liquidity</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#00ff88]">2</span>
                </div>
                <div>
                  <p className="text-sm text-[#dee2f5] font-medium">Quant Analyzer</p>
                  <p className="text-xs text-[#8b92a8]">Calculate momentum, volume acceleration, and order book bias</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#ffa502]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#ffa502]">3</span>
                </div>
                <div>
                  <p className="text-sm text-[#dee2f5] font-medium">AI Probability</p>
                  <p className="text-xs text-[#8b92a8]">Gemini researches events and estimates true probabilities</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#ff6b81]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#ff6b81]">4</span>
                </div>
                <div>
                  <p className="text-sm text-[#dee2f5] font-medium">Signal Generator</p>
                  <p className="text-xs text-[#8b92a8]">Compute edge, expected value, and optimal stake size</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Features Grid */}
      <div className="relative overflow-hidden border-t border-[#1a2030]">
        {/* Background 3D Marquee */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none skew-y-3 scale-110">
          <ThreeDMarquee images={marqueeImages} className="h-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h2 className="text-2xl md:text-4xl font-bold text-[#dee2f5] text-center mb-16">
            Built for <span className="text-[#00d4ff]">Serious Traders</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-5 h-5 text-[#00d4ff]" />}
              title="4-Agent Pipeline"
              description="Market scanning, quant analysis, AI probability estimation, and signal generation — all automated in 8-12 seconds."
              color="#00d4ff"
            />
            <FeatureCard
              icon={<BrainCircuit className="w-5 h-5 text-[#00ff88]" />}
              title="Gemini-Powered AI"
              description="Google Gemini 1.5 Flash with Search Grounding researches events, news, and historical precedent for accurate probability estimates."
              color="#00ff88"
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5 text-[#ffa502]" />}
              title="Kelly Criterion Sizing"
              description="Optimal stake sizing with conservative, balanced, and aggressive risk profiles. Never over-stake again."
              color="#ffa502"
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5 text-[#00d4ff]" />}
              title="Real-time Charts"
              description="Price history with implied probability overlays, order book depth visualization, and momentum indicators."
              color="#00d4ff"
            />
            <FeatureCard
              icon={<Target className="w-5 h-5 text-[#00ff88]" />}
              title="Calibration Dashboard"
              description="Track how well the AI's probability estimates match actual outcomes. Improve with Brier scores and accuracy metrics."
              color="#00ff88"
            />
            <FeatureCard
              icon={<Wallet className="w-5 h-5 text-[#ffa502]" />}
              title="Portfolio Analytics"
              description="Track open positions, PnL, win rates, Sharpe ratio, and Quant Performance Index (QPI) scores."
              color="#ffa502"
            />
            <FeatureCard
              icon={<Cpu className="w-5 h-5 text-[#ff6b81]" />}
              title="Backtest Engine"
              description="Run historical simulations with different strategies and bankroll sizes to validate your edge."
              color="#ff6b81"
            />
            <FeatureCard
              icon={<Globe className="w-5 h-5 text-[#00d4ff]" />}
              title="Live Markets"
              description="Crypto, sports, politics, entertainment, and more — all synced live from Bayse prediction markets."
              color="#00d4ff"
            />
            <FeatureCard
              icon={<Lock className="w-5 h-5 text-[#00ff88]" />}
              title="Firebase Auth"
              description="Secure authentication with Firebase. Your data stays protected and your sessions are encrypted."
              color="#00ff88"
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1a2030]">
        <div className="bg-[#131a2b] rounded-xl border border-[#1a2030] p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#dee2f5] mb-4">
            Ready to Find Your <span className="text-[#00d4ff]">Edge?</span>
          </h2>
          <p className="text-[#8b92a8] mb-8 max-w-xl mx-auto">
            Start exploring markets, analyze signals, and build a data-driven trading strategy 
            with EdgeIQ's AI-powered quant tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Button
                onClick={() => navigate("/markets")}
                borderRadius="0.75rem"
                className="px-8 py-4 bg-[#00d4ff] text-[#0a0e17] font-bold text-base hover:brightness-110 transition-all gap-2"
              >
                Launch Markets Explorer
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                borderRadius="0.75rem"
                className="px-8 py-4 bg-[#00d4ff] text-[#0a0e17] font-bold text-base hover:brightness-110 transition-all gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-[#1a2030] text-center">
        <p className="text-xs text-[#5a6070]">
          EdgeIQ — AI Quant Intelligence for Prediction Markets · Built with React, Django & Gemini
        </p>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const FeatureCard = ({ icon, title, description, color }: FeatureCardProps) => (
  <CometCard>
    <div className="bg-black rounded-xl border border-[#1a2030] p-6 hover:border-white/30 transition-all group h-full">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}25` }}
      >
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2" style={{ textShadow: "0 0 10px rgba(255,255,255,0.3)" }}>{title}</h3>
      <p className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">{description}</p>
    </div>
  </CometCard>
);

export default HomePage;

