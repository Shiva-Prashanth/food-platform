"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReceiverItem {
  id: string;
  name: string;
  receiverType?: string;
}

const DESTINATIONS = [
  {
    id: "human",
    title: "Human Consumption",
    role: "Orphanage & Shelters",
    icon: "👨‍👩‍👧‍👦",
    image: "https://images.unsplash.com/photo-1563263427-708318a97183?w=800&h=500&fit=crop&auto=format",
    desc: "Wholesome, human-grade dining hall meals screened by AI and delivered within rapid 2-hour dispatch windows to provide warm nutrition and dignity for children and residents.",
    accent: "#fbbf24",
    border: "rgba(251, 191, 36, 0.3)",
    bg: "rgba(45, 20, 5, 0.8)",
  },
  {
    id: "animal",
    title: "Animal Nourishment",
    role: "Animal Farm & Sanctuary",
    icon: "🐄",
    image: "https://images.unsplash.com/photo-1777187681600-83c0242b45e0?w=800&h=500&fit=crop&auto=format",
    desc: "Safe, unserved surplus grains, vegetables, and cooked leftovers verified non-toxic and routed directly to regional farm partners to nourish cattle, pigs, poultry, and rescued animals.",
    accent: "#a3e635",
    border: "rgba(163, 230, 53, 0.3)",
    bg: "rgba(28, 25, 23, 0.8)",
  },
  {
    id: "compost",
    title: "Soil & Compost",
    role: "Biocompost Facility",
    icon: "🌱",
    image: "https://images.unsplash.com/photo-1618212624319-3cd9681707e2?w=800&h=500&fit=crop&auto=format",
    desc: "Non-edible vegetable discards and organic scraps undergo high-temperature biological breakdown, returning rich organic matter and microbial nutrients to agricultural soil.",
    accent: "#a3b18a",
    border: "rgba(163, 177, 138, 0.3)",
    bg: "rgba(26, 15, 8, 0.8)",
  },
  {
    id: "energy",
    title: "Circular Energy",
    role: "Biogas Digester",
    icon: "⚡",
    image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&h=500&fit=crop&auto=format",
    desc: "Degraded organic matter is channeled into anaerobic digestion chambers to capture methane, producing clean burning fuel and renewable electricity for regional infrastructure.",
    accent: "#22d3ee",
    border: "rgba(34, 211, 238, 0.3)",
    bg: "rgba(8, 28, 36, 0.8)",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Surplus Logging",
    desc: "Hostel kitchen staff log unserved food batches, capturing preparation time, holding temperature, quantity, and storage condition.",
    icon: "📝",
  },
  {
    step: "02",
    title: "AI Neural Vision",
    desc: "A neural vision model screens food photos to evaluate surface freshness, texture integrity, and degradation markers.",
    icon: "🤖",
  },
  {
    step: "03",
    title: "Safety & Condition Review",
    desc: "Thermal and visual telemetry determine food quality classification (Low, Moderate, High Concern) and animal feed eligibility.",
    icon: "🔬",
  },
  {
    step: "04",
    title: "Smart Multi-Tier Routing",
    desc: "The donor selects optimal destination routes (Orphanage, Animal Farm, Biocompost, or Biogas) based on AI recommendations.",
    icon: "🎯",
  },
  {
    step: "05",
    title: "Live Receiver Dispatch",
    desc: "Instant notifications alert matched partner receivers to accept offers and coordinate immediate, seamless collection.",
    icon: "🚚",
  },
];

const PORTALS = [
  {
    id: "hostel",
    href: "/hostel",
    icon: "🍱",
    title: "Hostel Kitchen & Donor",
    subtitle: "Surplus Intake & AI Freshness Analysis",
    desc: "Log daily dining hall surplus, upload item photos, run neural vision condition screening, and confirm multi-tier recovery routes.",
    accent: "#34d399",
    border: "rgba(52, 211, 153, 0.35)",
    bg: "rgba(6, 36, 25, 0.8)",
    badge: "Food Donor & AI Workspace",
  },
  {
    id: "orphanage",
    href: "/orphanage",
    icon: "❤️",
    title: "Orphanage & Shelters",
    subtitle: "Human Nourishment & Care",
    desc: "Register shelter meal demands, monitor real-time offers of verified human-grade food, and claim nutritious meals for children.",
    accent: "#fbbf24",
    border: "rgba(251, 191, 36, 0.35)",
    bg: "rgba(45, 20, 5, 0.8)",
    badge: "Human Consumption",
  },
  {
    id: "farm",
    href: "/animal-farm",
    icon: "🌿",
    title: "Animal Farm & Sanctuary",
    subtitle: "Livestock Feed & Nutrition",
    desc: "Register farm livestock feed requirements, review approved wholesome food streams, and accept feeds to nourish animals.",
    accent: "#a3e635",
    border: "rgba(163, 230, 53, 0.35)",
    bg: "rgba(28, 25, 23, 0.8)",
    badge: "Animal Feed",
  },
  {
    id: "compost",
    href: "/biogas",
    icon: "🌱",
    title: "Biogas & Biocompost",
    subtitle: "Clean Energy & Soil Humus",
    desc: "Register processing capacity, receive automated organic waste allocations, and transform non-edible scraps into green energy and humus.",
    accent: "#a3b18a",
    border: "rgba(163, 177, 138, 0.35)",
    bg: "rgba(26, 15, 8, 0.8)",
    badge: "Circular Soil & Energy",
  },
];

export default function Home() {
  const [receiverCount, setReceiverCount] = useState<number | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Fetch real platform metrics from existing backend
  useEffect(() => {
    async function loadMetrics() {
      try {
        const response = await fetch("http://localhost:5000/api/receivers");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.receivers)) {
            setReceiverCount(data.receivers.length);
          }
        }
      } catch (error) {
        console.error("Could not fetch platform metrics:", error);
      } finally {
        setLoadingMetrics(false);
      }
    }
    loadMetrics();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 relative overflow-x-hidden selection:bg-emerald-500 selection:text-emerald-950">
      {/* ── Background Ambient Glows ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-10 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-10 w-[600px] h-[600px] bg-lime-500/8 rounded-full blur-3xl" />
      </div>

      {/* ── Sticky Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-spin-slow">♻️</span>
            <div>
              <span className="font-bold text-white tracking-wider uppercase text-xs sm:text-sm">
                Smart Surplus Platform
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono">
                Impact Dashboard
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest font-semibold text-slate-400">
            <button onClick={() => scrollTo("impact")} className="hover:text-emerald-400 transition-colors">
              Impact
            </button>
            <button onClick={() => scrollTo("recovery-loop")} className="hover:text-emerald-400 transition-colors">
              Recovery Loop
            </button>
            <button onClick={() => scrollTo("destinations")} className="hover:text-emerald-400 transition-colors">
              Destinations
            </button>
            <button onClick={() => scrollTo("how-it-works")} className="hover:text-emerald-400 transition-colors">
              How It Works
            </button>
            <button onClick={() => scrollTo("portals")} className="text-emerald-400 hover:text-emerald-300 transition-colors font-bold">
              Portals
            </button>
          </nav>

          <button
            onClick={() => scrollTo("portals")}
            className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all shadow-md shadow-emerald-500/20 hover:scale-105"
          >
            Launch Portals →
          </button>
        </div>
      </header>

      {/* ── Cinematic Hero Section ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Parallax Background */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 pointer-events-none"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&auto=format)`,
          }}
        />
        {/* Dark Vignette & Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.1)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6 py-20">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-emerald-500/15 border border-emerald-500/30 mb-8">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-xs font-semibold tracking-[0.18em] uppercase">
              Intelligent Circular Food Recovery
            </span>
          </div>

          <h1
            className="text-5xl sm:text-7xl md:text-8xl font-bold text-white leading-[0.98] mb-8"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Turning Surplus Food<br />
            <em className="text-emerald-400 not-italic">Into Real Impact.</em>
          </h1>

          <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Smart Surplus connects dining halls with families, farm animals, and renewable energy facilities — using AI condition assessment to ensure every plate finds its highest-value recovery path.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => scrollTo("impact")}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-8 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 shadow-xl shadow-emerald-500/25 flex items-center gap-2"
            >
              <span>Explore Platform Impact</span>
              <span>↓</span>
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="border border-emerald-500/40 text-emerald-300 px-8 py-4 rounded-full font-medium text-base hover:bg-emerald-500/10 transition-all duration-300"
            >
              See How It Works ↓
            </button>
          </div>
        </div>

        {/* Scroll Cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
          <span className="text-emerald-400 text-[10px] uppercase tracking-widest font-mono">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-emerald-400 to-transparent" />
        </div>
      </section>

      {/* ── PHASE 5: Platform Impact & Telemetry Section ── */}
      <section id="impact" className="py-24 px-6 relative border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-3">
              Measurable Platform Capacity
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Our Impact Architecture
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              A verifiable multi-tier recovery network engineered to prevent landfill dumping and prioritize human and biological nourishment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Real Live Network Data */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400/50 transition-all backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">📡</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono uppercase font-bold">
                  Live Network
                </span>
              </div>
              <div
                className="text-4xl sm:text-5xl font-bold text-emerald-400 mb-2"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {loadingMetrics ? "..." : receiverCount !== null ? receiverCount : "Active"}
              </div>
              <h3 className="font-bold text-white text-base mb-1">Connected Receivers</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Registered partner shelters, animal farms, and biogas plants ready to claim surplus.
              </p>
            </div>

            {/* Card 2: 4 Multi-Tier Destinations */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400/50 transition-all backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">🔄</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono uppercase font-bold">
                  Multi-Tier
                </span>
              </div>
              <div
                className="text-4xl sm:text-5xl font-bold text-amber-400 mb-2"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                4 Routes
              </div>
              <h3 className="font-bold text-white text-base mb-1">Recovery Tiers</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Human Meals, Animal Feed, Biocompost, and Clean Biogas energy.
              </p>
            </div>

            {/* Card 3: AI-Assisted Assessment */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400/50 transition-all backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">🤖</span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono uppercase font-bold">
                  Neural Model
                </span>
              </div>
              <div
                className="text-4xl sm:text-5xl font-bold text-cyan-400 mb-2"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                FoodNet-3B
              </div>
              <h3 className="font-bold text-white text-base mb-1">AI Condition Screening</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Automated surface texture, microbial risk assessment, and route recommendations.
              </p>
            </div>

            {/* Card 4: Circular Zero Waste */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-lime-500/30 hover:border-lime-400/50 transition-all backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">🌱</span>
                <span className="px-2.5 py-0.5 rounded-full bg-lime-500/20 text-lime-300 text-[10px] font-mono uppercase font-bold">
                  Zero Waste
                </span>
              </div>
              <div
                className="text-4xl sm:text-5xl font-bold text-lime-400 mb-2"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                100%
              </div>
              <h3 className="font-bold text-white text-base mb-1">Closed-Loop Diversion</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Every calorie is diverted from landfills into biological or energy lifelines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PHASE 6: The Recovery Loop Architecture Diagram ── */}
      <section id="recovery-loop" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-3">
              Platform Architecture
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              The Circular Recovery Loop
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              Surplus dining food is analyzed at source and channeled into four specialized biological and energetic destination tiers.
            </p>
          </div>

          {/* Orbital Recovery Flow Viewport */}
          <div className="relative bg-slate-900/50 border border-emerald-500/20 rounded-3xl p-8 sm:p-12 backdrop-blur-md">
            {/* Ambient center pulse */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center relative z-10">
              {/* Left Column: Input Source */}
              <div className="space-y-4 text-center md:text-left">
                <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-500/30">
                  <div className="text-3xl mb-2">🍱</div>
                  <h3 className="font-bold text-white text-lg" style={{ fontFamily: "Fraunces, serif" }}>
                    Hostel Dining Hall
                  </h3>
                  <p className="text-xs text-emerald-300/70 font-mono mt-1">
                    Source: Surplus meals & preparation discards
                  </p>
                </div>
                <div className="text-xs text-slate-500 font-mono flex items-center justify-center md:justify-start gap-2">
                  <span>↳ Real-time metadata capture</span>
                </div>
              </div>

              {/* Center Column: AI Assessment Core */}
              <div className="text-center p-8 rounded-3xl bg-slate-950 border-2 border-cyan-500/40 shadow-2xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider">
                  Analysis Engine
                </div>
                <div className="text-5xl mb-3 animate-float">🤖</div>
                <h3 className="font-bold text-cyan-300 text-xl mb-1" style={{ fontFamily: "Fraunces, serif" }}>
                  AI-Assisted Food Assessment
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Surface image segmentation, thermal checks, and safety classification.
                </p>
                <div className="mt-4 pt-3 border-t border-cyan-500/20 flex justify-center gap-2 text-[10px] font-mono text-cyan-400">
                  <span>• Visual Integrity</span>
                  <span>• Route Decision</span>
                </div>
              </div>

              {/* Right Column: 4 Recovery Destinations */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center gap-3">
                  <span className="text-2xl">👨‍👩‍👧‍👦</span>
                  <div>
                    <strong className="text-white text-xs block">Orphanage & Shelters</strong>
                    <span className="text-[11px] text-amber-300/70">Human Nourishment • Immediate</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-900/80 border border-lime-500/30 flex items-center gap-3">
                  <span className="text-2xl">🐄</span>
                  <div>
                    <strong className="text-white text-xs block">Animal Farm & Sanctuary</strong>
                    <span className="text-[11px] text-lime-300/70">Livestock Feed • Wholesome scraps</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#1a0f08]/80 border border-[#a3b18a]/30 flex items-center gap-3">
                  <span className="text-2xl">🌱</span>
                  <div>
                    <strong className="text-white text-xs block">Biocompost Facility</strong>
                    <span className="text-[11px] text-[#a3b18a]/80">Soil Humus & Biofertilizer</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <strong className="text-white text-xs block">Biogas Energy Plant</strong>
                    <span className="text-[11px] text-cyan-300/70">Renewable Fuel & Clean Power</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PHASE 7: Where Surplus Becomes Value Section ── */}
      <section id="destinations" className="py-24 px-6 bg-slate-900/30 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-3">
              Target Recovery Tiers
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Where Surplus Becomes Value
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              Every type of surplus food has an optimal second life. Explore the four destinations powered by the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {DESTINATIONS.map((dest) => (
              <div
                key={dest.id}
                className="rounded-3xl border overflow-hidden transition-all duration-400 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between"
                style={{
                  background: dest.bg,
                  borderColor: dest.border,
                }}
              >
                <div className="relative h-48 sm:h-56 overflow-hidden">
                  <img
                    src={dest.image}
                    alt={dest.title}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span
                      className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow-lg"
                      style={{
                        background: `${dest.accent}30`,
                        border: `1px solid ${dest.accent}60`,
                        color: dest.accent,
                      }}
                    >
                      {dest.role}
                    </span>
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{dest.icon}</span>
                      <h3
                        className="text-2xl font-bold text-white"
                        style={{ fontFamily: "Fraunces, serif" }}
                      >
                        {dest.title}
                      </h3>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed mt-3">
                      {dest.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHASE 8: How It Works Journey ── */}
      <section id="how-it-works" className="py-24 px-6 relative border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-3">
              Step-by-Step Workflow
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              How the System Works
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              From the kitchen collection table to verified dispatch in five transparent, automated stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {HOW_IT_WORKS.map((stage, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-mono font-bold text-emerald-400">
                      {stage.step}
                    </span>
                    <span className="text-2xl">{stage.icon}</span>
                  </div>
                  <h3 className="font-bold text-white text-base mb-2" style={{ fontFamily: "Fraunces, serif" }}>
                    {stage.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHASE 10: Operational Portals Entry Section ── */}
      <section id="portals" className="py-24 px-6 bg-slate-900/40 border-t border-slate-800/80 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-3">
              Role Workspaces
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Enter the Platform Workspace
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              Select the workspace that matches your organization’s role in the food recovery chain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PORTALS.map((portal) => (
              <Link key={portal.id} href={portal.href} className="group block">
                <div
                  className="h-full rounded-3xl p-8 border backdrop-blur-md transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between"
                  style={{
                    background: portal.bg,
                    borderColor: portal.border,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {portal.icon}
                      </div>
                      <span
                        className="px-3.5 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider"
                        style={{
                          background: `${portal.accent}20`,
                          border: `1px solid ${portal.accent}40`,
                          color: portal.accent,
                        }}
                      >
                        {portal.badge}
                      </span>
                    </div>

                    <h3
                      className="text-2xl font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors"
                      style={{ fontFamily: "Fraunces, serif" }}
                    >
                      {portal.title}
                    </h3>

                    <p
                      className="text-xs font-mono font-semibold uppercase tracking-wider mb-3"
                      style={{ color: portal.accent }}
                    >
                      {portal.subtitle}
                    </p>

                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                      {portal.desc}
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-2 font-bold text-sm transition-all group-hover:translate-x-1"
                    style={{ color: portal.accent }}
                  >
                    <span>Launch Portal Workspace</span>
                    <span>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing Call to Action ── */}
      <section className="py-28 px-6 text-center relative overflow-hidden border-t border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(52,211,153,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="text-6xl mb-6 animate-float">🌍</div>
          <h2
            className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Surplus is only waste<br />
            <em className="text-emerald-400 not-italic">until we give it a destination.</em>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-10 leading-relaxed max-w-xl mx-auto">
            Every recovery route begins with one decision: don’t throw it away. Join the network today.
          </p>
          <button
            onClick={() => scrollTo("portals")}
            className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 shadow-2xl shadow-emerald-500/30"
          >
            Enter the Platform Now →
          </button>
        </div>
      </section>

      {/* ── Platform Footer ── */}
      <footer className="py-12 px-6 border-t border-slate-800 text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">♻️</span>
            <div>
              <p className="font-bold text-white">Smart Surplus Recovery Platform</p>
              <p className="text-slate-500">Multi-tier AI circular food redistribution.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-slate-400">
            <button onClick={() => scrollTo("impact")} className="hover:text-white">Impact</button>
            <button onClick={() => scrollTo("recovery-loop")} className="hover:text-white">Recovery Loop</button>
            <button onClick={() => scrollTo("destinations")} className="hover:text-white">Destinations</button>
            <button onClick={() => scrollTo("how-it-works")} className="hover:text-white">How It Works</button>
            <button onClick={() => scrollTo("portals")} className="hover:text-white">Portals</button>
          </div>

          <p className="text-slate-600">© 2026 Smart Surplus. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}