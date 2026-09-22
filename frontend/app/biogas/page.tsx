"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NotificationSection from "../components/NotificationSection";

const CYCLE_STAGES = [
  {
    icon: "🍎",
    label: "Food Waste",
    desc: "Non-edible surplus and organic discards collected from hostels, mess halls, and markets",
    color: "#e07b54",
    angle: 270,
  },
  {
    icon: "🦠",
    label: "Decomposition & Digestion",
    desc: "Anaerobic microbes break down complex matter to release methane and nutrient broth",
    color: "#8b6b28",
    angle: 0,
  },
  {
    icon: "🌍",
    label: "Rich Compost & Biogas",
    desc: "Produces clean burning renewable fuel and nutrient-dense soil conditioning humus",
    color: "#5a3e28",
    angle: 90,
  },
  {
    icon: "🌱",
    label: "New Life & Energy",
    desc: "Biogas generates green heat and electricity, while organic compost feeds new crops",
    color: "#4a7c59",
    angle: 180,
  },
];

const ACCEPTED = [
  { icon: "🥦", item: "Vegetable scraps" },
  { icon: "🍌", item: "Fruit peels" },
  { icon: "🥚", item: "Egg shells" },
  { icon: "☕", item: "Coffee grounds" },
  { icon: "🍂", item: "Dried leaves" },
  { icon: "🌾", item: "Grain husks" },
  { icon: "🍞", item: "Stale bread" },
  { icon: "🌿", item: "Garden trimmings" },
  { icon: "🫖", item: "Tea bags" },
];

const SOIL_BG = "#1a0f08";
const ACCENT = "#a3b18a";

export default function BiogasPage() {
  // ------------------------------------------------------------
  // FORM STATE (Preserved exact backend integration)
  // ------------------------------------------------------------
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [foodNeeded, setFoodNeeded] = useState("");
  const [quantityNeeded, setQuantityNeeded] = useState("MEDIUM");
  const [available, setAvailable] = useState(true);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------------
  // INTERACTIVE UI STATE (Cycle animation)
  // ------------------------------------------------------------
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setActiveStage((p) => (p + 1) % CYCLE_STAGES.length),
      2800
    );
    return () => clearInterval(timer);
  }, []);

  const stage = CYCLE_STAGES[activeStage];

  // ------------------------------------------------------------
  // FORM SUBMISSION (Preserved exact API payload)
  // ------------------------------------------------------------
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/receivers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          receiverType: "BIOGAS",
          location,
          foodNeeded,
          quantityNeeded,
          available,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register biogas plant");
      }

      setMessage("Biogas plant registered successfully!");

      setName("");
      setLocation("");
      setFoodNeeded("");
      setQuantityNeeded("MEDIUM");
      setAvailable(true);

      console.log("Biogas:", data);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div style={{ background: SOIL_BG, minHeight: "100vh" }} className="text-white">
      {/* ── Top Navigation Bar ── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b px-6 py-3.5 flex items-center justify-between"
        style={{
          background: "rgba(26,15,8,0.92)",
          borderColor: "rgba(58,32,16,1)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all hover:bg-[#a3b18a]/10"
            style={{
              borderColor: "rgba(163,177,138,0.3)",
              color: ACCENT,
            }}
          >
            ← Back to Overview
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
            <span>🌱</span>
            <span>Biogas & Biocompost Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => scrollToSection("cycle")}
            className="px-3 py-1.5 rounded-full transition-all text-stone-300 hover:text-white hover:bg-white/5"
          >
            Cycle
          </button>
          <button
            onClick={() => scrollToSection("accepted")}
            className="px-3 py-1.5 rounded-full transition-all text-stone-300 hover:text-white hover:bg-white/5"
          >
            Accepted Waste
          </button>
          <button
            onClick={() => scrollToSection("register")}
            className="px-3 py-1.5 rounded-full transition-all text-stone-300 hover:text-white hover:bg-white/5"
          >
            Register Plant
          </button>
          <button
            onClick={() => scrollToSection("allocations")}
            className="px-3 py-1.5 rounded-full font-bold transition-all"
            style={{ background: ACCENT, color: SOIL_BG }}
          >
            Live Offers ♻️
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
        {/* Parallax Background */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1618212624319-3cd9681707e2?w=1920&h=1080&fit=crop&auto=format)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(26,15,8,0.85) 0%, rgba(26,15,8,0.6) 45%, rgba(26,15,8,1) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(163,177,138,0.06) 0%, transparent 65%)",
          }}
        />

        {/* Floating Organic Elements */}
        {["6%", "88%", "12%", "82%", "50%"].map((left, i) => (
          <div
            key={i}
            className="absolute pointer-events-none animate-leaf-sway text-2xl opacity-20"
            style={{
              left,
              top: `${14 + i * 14}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            {["🍃", "🌿", "🍂", "🌱", "🍃"][i]}
          </div>
        ))}

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto py-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8"
            style={{
              background: "rgba(163,177,138,0.1)",
              border: "1px solid rgba(163,177,138,0.3)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: ACCENT }}
            />
            <span
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: ACCENT }}
            >
              Biogas & Biocompost Recovery
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-6"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Waste Today.<br />
            <em className="not-italic" style={{ color: ACCENT }}>
              Resource Tomorrow.
            </em>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: "rgba(163,177,138,0.7)" }}
          >
            Food that cannot safely return to people or animals can still become a powerful resource. Discarded organic matter transforms into clean biogas energy and fertile compost — closing the circle of nature.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollToSection("register")}
              className="px-8 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              style={{
                background: ACCENT,
                color: SOIL_BG,
                boxShadow: "0 10px 30px rgba(163,177,138,0.25)",
              }}
            >
              Register Facility ↓
            </button>
            <button
              onClick={() => scrollToSection("allocations")}
              className="px-8 py-4 rounded-full font-medium text-base border transition-all duration-300 hover:bg-white/5"
              style={{
                borderColor: "rgba(163,177,138,0.4)",
                color: ACCENT,
              }}
            >
              View Live Waste Offers ♻️
            </button>
          </div>
        </div>
      </section>

      {/* ── Cycle of Life Visualization ── */}
      <section id="cycle" className="py-24 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(163,177,138,0.03) 0%, transparent 60%)",
          }}
        />

        <div className="max-w-5xl mx-auto relative">
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-3 text-center"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            The Cycle of Life
          </h2>
          <p
            className="text-center mb-16 text-sm"
            style={{ color: "rgba(163,177,138,0.6)" }}
          >
            Nothing is wasted. Everything transforms. Click any stage to explore the organic recovery loop.
          </p>

          {/* Orbital display */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
            {/* Circle diagram */}
            <div className="relative shrink-0" style={{ width: 280, height: 280 }}>
              {/* Outer dashed ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: "1px dashed rgba(163,177,138,0.2)",
                  animation: "orbit 25s linear infinite",
                }}
              />
              {/* Inner ring */}
              <div
                className="absolute rounded-full"
                style={{
                  inset: "28px",
                  border: "1px solid rgba(163,177,138,0.1)",
                }}
              />

              {/* Center ♻️ */}
              <div
                className="absolute rounded-full flex items-center justify-center"
                style={{
                  inset: "80px",
                  background: "rgba(163,177,138,0.06)",
                  border: "1px solid rgba(163,177,138,0.15)",
                }}
              >
                <span className="text-3xl animate-spin-slow" style={{ display: "block" }}>
                  ♻️
                </span>
              </div>

              {/* Stage nodes at cardinal points */}
              {CYCLE_STAGES.map((s, i) => {
                const rad = ((s.angle - 90) * Math.PI) / 180;
                const r = 112;
                const cx = 140;
                const cy = 140;
                const x = cx + r * Math.cos(rad);
                const y = cy + r * Math.sin(rad);
                const isActive = i === activeStage;

                return (
                  <button
                    key={i}
                    onClick={() => setActiveStage(i)}
                    className="absolute transition-all duration-500"
                    style={{
                      left: x,
                      top: y,
                      transform: `translate(-50%, -50%) scale(${isActive ? 1.25 : 1})`,
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500"
                      style={{
                        background: isActive ? `${s.color}35` : "rgba(26,15,8,0.9)",
                        border: `2px solid ${isActive ? s.color : "rgba(163,177,138,0.2)"}`,
                        boxShadow: isActive ? `0 0 24px ${s.color}60` : "none",
                      }}
                    >
                      <span className="text-2xl">{s.icon}</span>
                    </div>
                  </button>
                );
              })}

              {/* Connector lines between stages */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                {CYCLE_STAGES.map((s, i) => {
                  const next = CYCLE_STAGES[(i + 1) % CYCLE_STAGES.length];
                  const r = 112;
                  const cx = 140;
                  const cy = 140;
                  const r1 = ((s.angle - 90) * Math.PI) / 180;
                  const r2 = ((next.angle - 90) * Math.PI) / 180;
                  const x1 = cx + r * Math.cos(r1);
                  const y1 = cy + r * Math.sin(r1);
                  const x2 = cx + r * Math.cos(r2);
                  const y2 = cy + r * Math.sin(r2);
                  const isActive = i === activeStage;

                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isActive ? s.color : "rgba(163,177,138,0.12)"}
                      strokeWidth={isActive ? 1.5 : 1}
                      strokeDasharray="4 4"
                      style={{ transition: "stroke 0.5s ease, stroke-width 0.5s ease" }}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Stage detail panel */}
            <div
              className="flex-1 max-w-sm text-center lg:text-left"
              key={activeStage}
              style={{ animation: "fadeUp 0.5s ease-out forwards" }}
            >
              <div className="text-7xl mb-4 animate-float">{stage.icon}</div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono mb-4"
                style={{
                  background: `${stage.color}20`,
                  border: `1px solid ${stage.color}40`,
                  color: stage.color,
                }}
              >
                Stage {activeStage + 1} of {CYCLE_STAGES.length}
              </div>
              <h3
                className="text-3xl font-bold text-white mb-3"
                style={{ fontFamily: "Fraunces, serif", color: stage.color }}
              >
                {stage.label}
              </h3>
              <p style={{ color: "rgba(163,177,138,0.7)", lineHeight: 1.7 }}>
                {stage.desc}
              </p>

              {/* Progress dots */}
              <div className="flex gap-2 mt-8 justify-center lg:justify-start">
                {CYCLE_STAGES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStage(i)}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: i === activeStage ? 28 : 8,
                      height: 8,
                      background: i === activeStage ? s.color : "rgba(163,177,138,0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Accept ── */}
      <section id="accepted" className="py-20 px-6" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-3 text-center"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            What We Accept
          </h2>
          <p
            className="text-center text-sm mb-12"
            style={{ color: "rgba(163,177,138,0.55)" }}
          >
            Non-hazardous organic surplus and food wastes are routed directly for anaerobic digestion and compost curing.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {ACCEPTED.map((w, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 group"
                style={{
                  background: "rgba(163,177,138,0.04)",
                  border: "1px solid rgba(163,177,138,0.1)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(163,177,138,0.35)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(163,177,138,0.1)")
                }
              >
                <div
                  className="text-3xl mb-2 animate-leaf-sway"
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  {w.icon}
                </div>
                <p className="text-xs leading-tight font-medium" style={{ color: "rgba(163,177,138,0.75)" }}>
                  {w.item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Impact Trio ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { val: "12T+", label: "Organic waste diverted from landfills", icon: "🌍" },
            { val: "340+", label: "Farms & digesters receiving nutrients", icon: "🌾" },
            { val: "100%", label: "Closed-loop biological circularity", icon: "♻️" },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-3xl p-7 text-center hover:-translate-y-1 transition-all duration-400"
              style={{
                background: "rgba(163,177,138,0.04)",
                border: "1px solid rgba(163,177,138,0.12)",
              }}
            >
              <div
                className="text-4xl mb-4 animate-compost-pulse"
                style={{ animationDelay: `${i * 0.6}s` }}
              >
                {s.icon}
              </div>
              <div
                className="text-4xl font-bold mb-2"
                style={{ fontFamily: "Fraunces, serif", color: ACCENT }}
              >
                {s.val}
              </div>
              <div style={{ color: "rgba(163,177,138,0.6)", fontSize: "0.85rem" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Receiver Registration Section ── */}
      <section id="register" className="py-20 px-6 relative">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-10 shadow-2xl border backdrop-blur-md"
            style={{
              background: "rgba(26,15,8,0.85)",
              borderColor: "rgba(163,177,138,0.25)",
            }}
          >
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl mb-3"
                style={{ background: "rgba(163,177,138,0.15)", border: "1px solid rgba(163,177,138,0.3)" }}
              >
                🌱
              </div>
              <h2
                className="text-3xl font-bold text-white mb-2"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Register Biogas Facility
              </h2>
              <p className="text-sm" style={{ color: "rgba(163,177,138,0.65)" }}>
                Register your plant capacity and waste requirements to receive automated organic matter allocations.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: ACCENT }}>
                  Biogas / Compost Plant Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Green Valley Biogas Plant"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: "rgba(163,177,138,0.06)",
                    border: "1px solid rgba(163,177,138,0.25)",
                    color: "white",
                  }}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: ACCENT }}>
                  Facility Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Sector 4 Organic Processing Zone"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: "rgba(163,177,138,0.06)",
                    border: "1px solid rgba(163,177,138,0.25)",
                    color: "white",
                  }}
                />
              </div>

              {/* Food / Waste Needed */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: ACCENT }}>
                  Food Waste Type Needed
                </label>
                <input
                  type="text"
                  value={foodNeeded}
                  onChange={(e) => setFoodNeeded(e.target.value)}
                  placeholder="e.g. kitchen scraps, vegetable peelings, spoiled food"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: "rgba(163,177,138,0.06)",
                    border: "1px solid rgba(163,177,138,0.25)",
                    color: "white",
                  }}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: ACCENT }}>
                  Approximate Quantity Needed
                </label>
                <select
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: "#1a0f08",
                    border: "1px solid rgba(163,177,138,0.25)",
                    color: "white",
                  }}
                >
                  <option value="SMALL">SMALL (Daily batch &lt; 50 kg)</option>
                  <option value="MEDIUM">MEDIUM (Daily batch 50 - 200 kg)</option>
                  <option value="LARGE">LARGE (Daily batch &gt; 200 kg)</option>
                </select>
              </div>

              {/* Available */}
              <div
                className="flex items-center gap-3 p-4 rounded-xl border"
                style={{
                  background: "rgba(163,177,138,0.04)",
                  borderColor: "rgba(163,177,138,0.15)",
                }}
              >
                <input
                  type="checkbox"
                  id="available-check"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-[#a3b18a]"
                />
                <label htmlFor="available-check" className="text-sm font-medium text-stone-200 cursor-pointer select-none">
                  Available to receive food waste batches immediately
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: ACCENT,
                  color: SOIL_BG,
                  boxShadow: "0 8px 24px rgba(163,177,138,0.2)",
                }}
              >
                {loading ? "Registering Plant..." : "Register Biogas Plant →"}
              </button>
            </form>

            {/* Message Alert */}
            {message && (
              <div
                className="mt-6 p-4 rounded-xl text-center text-sm font-medium border"
                style={{
                  background: message.includes("success")
                    ? "rgba(163,177,138,0.15)"
                    : "rgba(248,113,113,0.15)",
                  borderColor: message.includes("success")
                    ? "rgba(163,177,138,0.4)"
                    : "rgba(248,113,113,0.4)",
                  color: message.includes("success") ? ACCENT : "#f87171",
                }}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Live Waste Allocations & Notification Section ── */}
      <section id="allocations" className="py-16 px-6 relative">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono mb-3"
              style={{
                background: "rgba(163,177,138,0.1)",
                border: "1px solid rgba(163,177,138,0.3)",
                color: ACCENT,
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#a3b18a] animate-pulse" />
              Real-time Allocation Stream
            </div>
            <h2
              className="text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Live Available Organic Waste
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(163,177,138,0.65)" }}>
              Direct matched food waste offers routed to your plant. Accept allocations to claim and organize pickup.
            </p>
          </div>

          <NotificationSection receiverType="BIOGAS" theme="compost" />
        </div>
      </section>

      {/* ── CTA Closing Section ── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at bottom, rgba(74,124,89,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="text-6xl mb-8 animate-float">🌿</div>
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Close the loop.<br />
            <em className="not-italic" style={{ color: ACCENT }}>
              Start composting.
            </em>
          </h2>
          <p
            className="text-base md:text-lg mb-10 leading-relaxed"
            style={{ color: "rgba(163,177,138,0.6)" }}
          >
            Transform surplus organic matter into fertile soil and clean energy. Join our regional food recovery network today.
          </p>

          <button
            onClick={() => scrollToSection("register")}
            className="px-10 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105"
            style={{
              background: ACCENT,
              color: SOIL_BG,
              boxShadow: "0 15px 40px rgba(163,177,138,0.25)",
            }}
          >
            Register Your Plant Now →
          </button>
        </div>
      </section>
    </div>
  );
}