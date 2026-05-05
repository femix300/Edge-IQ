"use client";
import React from "react";
import { WavyBackground } from "@/components/ui/wavy-background";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { Button } from "@/components/ui/moving-border";
import { Activity, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores";

export default function WavyBackgroundDemo() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <WavyBackground 
      className="max-w-4xl mx-auto pb-40 px-4 sm:px-6"
      backgroundFill="#0a0e17"
      waveOpacity={0.4}
    >
      <div className="flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-xs sm:text-sm text-[#00d4ff] mb-8 backdrop-blur-sm text-center">
          <Activity className="w-4 h-4 flex-shrink-0" />
          <span>AI-Powered Quant Intelligence Platform</span>
        </div>

        <div className="flex justify-center w-full">
          <TypewriterEffect 
            className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-center"
            cursorClassName="bg-[#00d4ff]"
            words={[
              { text: "Find", className: "text-white" },
              { text: "Your", className: "text-white" },
              { text: "Edge", className: "text-white" },
              { text: "in", className: "text-white" },
              { text: "Prediction", className: "text-[#00d4ff]" },
              { text: "Markets", className: "text-[#00d4ff]" }
            ]} 
          />
        </div>
        
        <p className="text-base sm:text-lg text-white mb-10 leading-relaxed max-w-2xl text-center">
          EdgeIQ combines quantitative finance, machine learning, and real-time market data 
          to identify mispriced probabilities across Bayse prediction markets. 
          Our 4-agent AI pipeline scans, analyzes, estimates, and generates signals 
          in under 12 seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-md sm:max-w-none">
          <Button
            onClick={() => navigate(isAuthenticated ? "/markets" : "/auth")}
            borderRadius="0.75rem"
            className="px-10 py-4 bg-[#00d4ff] text-[#0a0e17] font-bold text-lg hover:brightness-110 transition-all gap-2 shadow-[0_0_20px_rgba(0,212,255,0.3)]"
          >
            Explore Markets
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => navigate(isAuthenticated ? "/signals" : "/auth")}
            borderRadius="0.75rem"
            className="px-10 py-4 bg-[#131a2b] text-[#dee2f5] font-bold text-lg hover:border-[#00d4ff]/30 transition-all"
          >
            View Signals
          </Button>
        </div>
      </div>
    </WavyBackground>
  );
}
