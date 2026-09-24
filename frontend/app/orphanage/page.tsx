"use client";

import { useState, useEffect, type MouseEvent } from "react";
import Link from "next/link";
import NotificationSection from "../components/NotificationSection";

type FloatingHeart = { id: number; x: number; y: number };

const QUALITY_FEATURES = [
  {
    icon: "🍲",
    title: "Cooked & Warm",
    desc: "Wholesome, human-grade meals prepared fresh by verified partner kitchens.",
  },
  {
    icon: "🌡️",
    title: "Temperature Monitored",
    desc: "Strict thermal tracking ensures food safety from donor kitchen to doorstep.",
  },
  {
    icon: "⏱️",
    title: "Rapid Dispatch",
    desc: "Surplus meals are allocated and claimed within an urgent 2-hour window.",
  },
  {
    icon: "🔬",
    title: "AI Safety Verified",
    desc: "Computer vision and freshness algorithms screen every batch before routing.",
  },
];

const BG_COLOR = "#FFF8EC";
const CARD_BG = "#FFFFFF";
const PRIMARY = "#B86B00";
const ACCENT = "#F5B82E";
const MAIN_TEXT = "#3B2A20";
const SECONDARY_TEXT = "#765F50";
const BORDER = "#E9DCCB";
const LIGHT_ACCENT = "#FFF0C9";

export default function OrphanagePage() {
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
  // INTERACTION STATE (Floating hearts animation)
  // ------------------------------------------------------------
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  const triggerHeart = (e: MouseEvent) => {
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x: e.clientX,
      y: e.clientY,
    };
    setHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1400);
  };

  useEffect(() => {
    if (hearts.length > 8) {
      setHearts((prev) => prev.slice(-8));
    }
  }, [hearts]);

  // ------------------------------------------------------------
  // FORM SUBMISSION (Preserved exact API payload)
  // ------------------------------------------------------------
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/receivers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          receiverType: "ORPHANAGE",
          location,
          foodNeeded,
          quantityNeeded,
          available,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save receiver");
      }

      setMessage("Orphanage registered successfully!");

      setName("");
      setLocation("");
      setFoodNeeded("");
      setQuantityNeeded("MEDIUM");
      setAvailable(true);

      console.log("Receiver created:", data);
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
    <div
      style={{ background: BG_COLOR, minHeight: "100vh", color: MAIN_TEXT }}
      className="relative overflow-x-hidden selection:bg-[#F5B82E] selection:text-[#3B2A20]"
    >
      {/* ── Floating Heart Particles ── */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="fixed pointer-events-none z-[9990] text-3xl select-none"
          style={{
            left: h.x,
            top: h.y,
            animation: "heartFloat 1.4s ease-out forwards",
            transform: "translate(-50%, -50%)",
          }}
        >
          ❤️
        </div>
      ))}

      {/* ── Top Navigation Bar ── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b px-6 py-3.5 flex items-center justify-between"
        style={{
          background: "rgba(255, 248, 236, 0.92)",
          borderColor: BORDER,
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all hover:bg-[#FFF0C9]"
            style={{
              borderColor: BORDER,
              color: PRIMARY,
            }}
          >
            ← Back to Overview
          </Link>
          <div
            className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: PRIMARY }}
          >
            <span>❤️</span>
            <span>Orphanage Food Support</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => scrollToSection("quality")}
            className="px-3 py-1.5 rounded-full transition-all text-[#765F50] hover:text-[#3B2A20] hover:bg-[#FFF0C9]"
          >
            Standards
          </button>
          <button
            onClick={() => scrollToSection("register")}
            className="px-3 py-1.5 rounded-full transition-all text-[#765F50] hover:text-[#3B2A20] hover:bg-[#FFF0C9]"
          >
            Register Shelter
          </button>
          <button
            onClick={() => scrollToSection("allocations")}
            className="px-3.5 py-1.5 rounded-full font-bold transition-all shadow-sm"
            style={{ background: PRIMARY, color: "#FFFFFF" }}
          >
            Live Meals ❤️
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
        {/* Parallax Background */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1563263427-708318a97183?w=1920&h=1080&fit=crop&auto=format)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,248,236,0.92) 0%, rgba(255,248,236,0.75) 45%, rgba(255,248,236,1) 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(245,184,46,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Floating Background Hearts */}
        {["10%", "85%", "20%", "75%"].map((left, i) => (
          <div
            key={i}
            className="absolute text-2xl pointer-events-none animate-float opacity-30"
            style={{
              left,
              top: `${20 + i * 15}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            ❤️
          </div>
        ))}

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto py-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8"
            style={{
              background: LIGHT_ACCENT,
              border: `1px solid ${BORDER}`,
            }}
          >
            <span className="text-xl animate-heartbeat">❤️</span>
            <span
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: PRIMARY }}
            >
              Orphanage Food Programme
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6"
            style={{ fontFamily: "Fraunces, serif", color: MAIN_TEXT }}
          >
            Good Food.<br />
            <em className="not-italic" style={{ color: PRIMARY }}>
              Real Meals.
            </em><br />
            Real Impact.
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: SECONDARY_TEXT }}
          >
            Every rescued meal feeds children and families who would otherwise go hungry. These aren&apos;t charity leftovers — they are moments of dignity, warmth, and nourishment.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={(e) => {
                triggerHeart(e);
                scrollToSection("register");
              }}
              className="px-8 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 hover:shadow-xl"
              style={{
                background: PRIMARY,
                color: "#FFFFFF",
                boxShadow: "0 10px 30px rgba(184,107,0,0.25)",
              }}
            >
              Register Orphanage ↓
            </button>
            <button
              onClick={(e) => {
                triggerHeart(e);
                scrollToSection("allocations");
              }}
              className="px-8 py-4 rounded-full font-medium text-base border transition-all duration-300 hover:bg-[#FFF0C9]"
              style={{
                borderColor: BORDER,
                color: PRIMARY,
                background: CARD_BG,
              }}
            >
              Live Available Meals ❤️
            </button>
          </div>
        </div>
      </section>

      {/* ── Impact Banner ── */}
      <section
        className="py-6 px-6 shadow-sm border-y"
        style={{ background: LIGHT_ACCENT, borderColor: BORDER }}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap justify-around gap-8 text-center">
          {[
            { val: "240+", label: "Children & Residents Nourished Daily", icon: "👶" },
            { val: "100%", label: "Verified Safe Human-Grade Food", icon: "🍽️" },
            { val: "3.2T", label: "Edible Surplus Meals Rescued This Month", icon: "♻️" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-3xl">{s.icon}</span>
              <div className="text-left">
                <div
                  className="font-bold text-2xl md:text-3xl leading-none"
                  style={{ color: PRIMARY }}
                >
                  {s.val}
                </div>
                <div
                  className="text-xs mt-1 font-semibold"
                  style={{ color: SECONDARY_TEXT }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quality Standards Section ── */}
      <section id="quality" className="py-20 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "Fraunces, serif", color: MAIN_TEXT }}
            >
              Safe, Warm, and Dignified Food
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: SECONDARY_TEXT }}>
              We uphold strict food hygiene and rapid logistics to ensure all surplus food routed to orphanages is wholesome and safe.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {QUALITY_FEATURES.map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 shadow-sm hover:shadow-md"
                style={{
                  background: CARD_BG,
                  borderColor: BORDER,
                }}
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: MAIN_TEXT }}
                >
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: SECONDARY_TEXT }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Receiver Registration Section ── */}
      <section id="register" className="py-20 px-6 relative">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-10 shadow-xl border backdrop-blur-md"
            style={{
              background: CARD_BG,
              borderColor: BORDER,
            }}
          >
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl mb-3"
                style={{
                  background: LIGHT_ACCENT,
                  border: `1px solid ${BORDER}`,
                }}
              >
                🏠
              </div>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "Fraunces, serif", color: MAIN_TEXT }}
              >
                Register Orphanage or Shelter
              </h2>
              <p className="text-sm" style={{ color: SECONDARY_TEXT }}>
                Register your organization and meal requirements to receive direct human-grade food allocations.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: PRIMARY }}
                >
                  Orphanage / Organization Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. St. Jude Children's Home"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#B86B00]"
                  style={{
                    background: BG_COLOR,
                    border: `1px solid ${BORDER}`,
                    color: MAIN_TEXT,
                  }}
                />
              </div>

              {/* Location */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: PRIMARY }}
                >
                  Location / Address
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Area 1, City Center"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#B86B00]"
                  style={{
                    background: BG_COLOR,
                    border: `1px solid ${BORDER}`,
                    color: MAIN_TEXT,
                  }}
                />
              </div>

              {/* Food Needed */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: PRIMARY }}
                >
                  Food Requirements
                </label>
                <input
                  type="text"
                  value={foodNeeded}
                  onChange={(e) => setFoodNeeded(e.target.value)}
                  placeholder="e.g. cooked rice, lentils, bread, fresh fruits"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#B86B00]"
                  style={{
                    background: BG_COLOR,
                    border: `1px solid ${BORDER}`,
                    color: MAIN_TEXT,
                  }}
                />
              </div>

              {/* Quantity */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: PRIMARY }}
                >
                  Approximate Quantity Needed
                </label>
                <select
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#B86B00]"
                  style={{
                    background: BG_COLOR,
                    border: `1px solid ${BORDER}`,
                    color: MAIN_TEXT,
                  }}
                >
                  <option value="SMALL">SMALL (10 - 30 portions)</option>
                  <option value="MEDIUM">MEDIUM (30 - 100 portions)</option>
                  <option value="LARGE">LARGE (100+ portions)</option>
                </select>
              </div>

              {/* Available */}
              <div
                className="flex items-center gap-3 p-4 rounded-xl border"
                style={{
                  background: BG_COLOR,
                  borderColor: BORDER,
                }}
              >
                <input
                  type="checkbox"
                  id="available-check"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-[#B86B00]"
                />
                <label
                  htmlFor="available-check"
                  className="text-sm font-medium cursor-pointer select-none"
                  style={{ color: MAIN_TEXT }}
                >
                  Available to receive meal deliveries / pickups today
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: PRIMARY,
                  color: "#FFFFFF",
                  boxShadow: "0 8px 24px rgba(184,107,0,0.25)",
                }}
              >
                {loading ? "Registering Orphanage..." : "Register Orphanage →"}
              </button>
            </form>

            {/* Message Alert */}
            {message && (
              <div
                className="mt-6 p-4 rounded-xl text-center text-sm font-medium border"
                style={{
                  background: message.includes("success")
                    ? LIGHT_ACCENT
                    : "#fee2e2",
                  borderColor: message.includes("success")
                    ? ACCENT
                    : "#fca5a5",
                  color: message.includes("success") ? PRIMARY : "#b91c1c",
                }}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Live Available Meals & Notifications Section ── */}
      <section id="allocations" className="py-16 px-6 relative">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono mb-3"
              style={{
                background: LIGHT_ACCENT,
                border: `1px solid ${BORDER}`,
                color: PRIMARY,
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#B86B00] animate-pulse" />
              Live Human Consumption Stream
            </div>
            <h2
              className="text-3xl font-bold mb-2"
              style={{ fontFamily: "Fraunces, serif", color: MAIN_TEXT }}
            >
              Food Ready for Collection
            </h2>
            <p
              className="text-sm max-w-md mx-auto"
              style={{ color: SECONDARY_TEXT }}
            >
              Fresh, inspected surplus meals matched to your organization. Click accept to claim and coordinate pickup.
            </p>
          </div>

          <NotificationSection receiverType="ORPHANAGE" theme="amber" />
        </div>
      </section>

      {/* ── Heartwarming Closing CTA Section ── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at bottom, rgba(245,184,46,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="text-6xl mb-8 animate-heartbeat">❤️</div>
          <h2
            className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
            style={{ fontFamily: "Fraunces, serif", color: MAIN_TEXT }}
          >
            Food is love.<br />
            <em className="not-italic" style={{ color: PRIMARY }}>
              Share it.
            </em>
          </h2>
          <p
            className="text-base md:text-lg mb-10 leading-relaxed"
            style={{ color: SECONDARY_TEXT }}
          >
            Every plate you accept becomes a memory for a child. A warm meal. A safe afternoon. A moment of knowing someone cared.
          </p>

          <button
            onClick={(e) => {
              triggerHeart(e);
              scrollToSection("register");
            }}
            className="px-10 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105"
            style={{
              background: PRIMARY,
              color: "#FFFFFF",
              boxShadow: "0 15px 40px rgba(184,107,0,0.25)",
            }}
          >
            Register Your Shelter Now ❤️
          </button>
        </div>
      </section>
    </div>
  );
}