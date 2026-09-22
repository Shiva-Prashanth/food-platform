"use client";

import { useState } from "react";
import Link from "next/link";
import NotificationSection from "../components/NotificationSection";

const ALLOWED = [
  { item: "Fruit peels & cores", icon: "🍊", detail: "Rich in natural sugars and fibre" },
  { item: "Vegetable scraps", icon: "🥕", detail: "Excellent source of vitamins & minerals" },
  { item: "Bread & grains", icon: "🌾", detail: "High-energy carbohydrates" },
  { item: "Cooked rice & pasta", icon: "🍚", detail: "Easy-to-digest starch for energy" },
  { item: "Leafy greens", icon: "🌿", detail: "Essential micronutrients for health" },
  { item: "Dairy by-products", icon: "🥛", detail: "Calcium and protein-rich" },
];

const NOT_ALLOWED = [
  { item: "Raw meat & fish", icon: "🥩", reason: "High disease transmission risk" },
  { item: "Salty or spicy food", icon: "🌶️", reason: "Harmful to animal kidneys" },
  { item: "Chocolate & sweets", icon: "🍫", reason: "Toxic compounds for most animals" },
  { item: "Onions & garlic", icon: "🧅", reason: "Causes anaemia in animals" },
  { item: "Alcohol content", icon: "🍺", reason: "Toxic to the nervous system" },
  { item: "Mouldy food", icon: "🟤", reason: "Contains dangerous mycotoxins" },
];

const ANIMAL_TYPES = [
  "🐄 Cattle",
  "🐖 Pigs",
  "🐔 Poultry",
  "🐑 Sheep",
  "🐐 Goats",
  "🐰 Rabbits",
];

const STONE_BG = "#1c1917";
const ACCENT = "#a3e635";

export default function AnimalFarmPage() {
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
  // INTERACTIVE UI STATE (Guidelines & Animal Filters)
  // ------------------------------------------------------------
  const [hovA, setHovA] = useState<number | null>(null);
  const [hovN, setHovN] = useState<number | null>(null);
  const [selectedAnimals, setSelectedAnimals] = useState<Set<number>>(
    new Set([0, 2])
  );

  const toggleAnimal = (i: number) => {
    setSelectedAnimals((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

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
          receiverType: "ANIMAL_FARM",
          location,
          foodNeeded,
          quantityNeeded,
          available,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register animal farm");
      }

      setMessage("Animal farm registered successfully!");

      setName("");
      setLocation("");
      setFoodNeeded("");
      setQuantityNeeded("MEDIUM");
      setAvailable(true);

      console.log("Animal farm:", data);
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
      style={{ background: STONE_BG, minHeight: "100vh" }}
      className="text-white relative overflow-x-hidden"
    >
      {/* ── Top Navigation Bar ── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b px-6 py-3.5 flex items-center justify-between"
        style={{
          background: "rgba(28,25,23,0.95)",
          borderColor: "rgba(68,64,60,0.6)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all hover:bg-lime-500/10"
            style={{
              borderColor: "rgba(163,230,53,0.3)",
              color: ACCENT,
            }}
          >
            ← Back to Overview
          </Link>
          <div
            className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: ACCENT }}
          >
            <span>🌿</span>
            <span>Animal Feed Programme</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => scrollToSection("guidelines")}
            className="px-3 py-1.5 rounded-full transition-all text-stone-300 hover:text-white hover:bg-white/5"
          >
            Feed Guidelines
          </button>
          <button
            onClick={() => scrollToSection("register")}
            className="px-3 py-1.5 rounded-full transition-all text-stone-300 hover:text-white hover:bg-white/5"
          >
            Register Farm
          </button>
          <button
            onClick={() => scrollToSection("allocations")}
            className="px-3.5 py-1.5 rounded-full font-bold transition-all"
            style={{ background: ACCENT, color: "#1c1917" }}
          >
            Live Feed Offers 🌿
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
        {/* Parallax Background */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1777187681600-83c0242b45e0?w=1920&h=1080&fit=crop&auto=format)`,
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-stone-900/80 via-stone-900/55 to-stone-900"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(163,230,53,0.05) 0%, transparent 70%)",
          }}
        />

        {/* Floating Leaves */}
        {["8%", "88%", "15%", "80%"].map((left, i) => (
          <div
            key={i}
            className="absolute text-2xl pointer-events-none animate-leaf-sway opacity-20"
            style={{
              left,
              top: `${18 + i * 16}%`,
              animationDelay: `${i * 0.35}s`,
            }}
          >
            🌿
          </div>
        ))}

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto py-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8"
            style={{
              background: "rgba(163,230,53,0.15)",
              border: "1px solid rgba(163,230,53,0.3)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: ACCENT }}
            >
              Animal Farm Programme
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-6"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Not Waste.<br />
            <em className="not-italic" style={{ color: ACCENT }}>
              Nourishment.
            </em>
          </h1>

          <p className="text-stone-300/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            What humans can no longer eat can still sustain life. Surplus food becomes feed, animals thrive, and the farm cycle continues — nothing is truly wasted in nature.
          </p>

          {/* Animal type pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {ANIMAL_TYPES.map((a, i) => (
              <button
                key={i}
                onClick={() => toggleAnimal(i)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                style={
                  selectedAnimals.has(i)
                    ? {
                        background: "rgba(163,230,53,0.2)",
                        border: "1px solid rgba(163,230,53,0.5)",
                        color: ACCENT,
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.45)",
                      }
                }
              >
                {a}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollToSection("register")}
              className="px-8 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              style={{
                background: ACCENT,
                color: "#1c1917",
                boxShadow: "0 10px 30px rgba(163,230,53,0.25)",
              }}
            >
              Register Farm Facility ↓
            </button>
            <button
              onClick={() => scrollToSection("allocations")}
              className="px-8 py-4 rounded-full font-medium text-base border transition-all duration-300 hover:bg-white/5"
              style={{
                borderColor: "rgba(163,230,53,0.4)",
                color: ACCENT,
              }}
            >
              Live Feed Offers 🌿
            </button>
          </div>
        </div>
      </section>

      {/* ── Farm Feeding Guidelines (ALLOWED vs NOT ALLOWED) ── */}
      <section id="guidelines" className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-3 text-center"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Farm Feeding Guidelines
          </h2>
          <p className="text-stone-400 text-center mb-12 text-sm max-w-xl mx-auto">
            Hover each item to learn why. Feeding animals safely is as important as feeding them well.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ALLOWED */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-full bg-lime-500 flex items-center justify-center text-stone-950 font-black text-sm">
                  ✓
                </div>
                <div>
                  <h3
                    className="text-xl font-bold text-lime-400"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    ALLOWED FEED
                  </h3>
                  <p className="text-stone-400 text-xs">Wholesome & safe for livestock</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {ALLOWED.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300"
                    style={{
                      background:
                        hovA === i
                          ? "rgba(163,230,53,0.08)"
                          : "rgba(255,255,255,0.02)",
                      borderColor:
                        hovA === i
                          ? "rgba(163,230,53,0.4)"
                          : "rgba(255,255,255,0.06)",
                      transform:
                        hovA === i ? "translateX(-4px)" : "translateX(0)",
                    }}
                    onMouseEnter={() => setHovA(i)}
                    onMouseLeave={() => setHovA(null)}
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold transition-colors duration-300"
                        style={{
                          color: hovA === i ? ACCENT : "rgba(255,255,255,0.85)",
                        }}
                      >
                        {item.item}
                      </p>
                      <p className="text-stone-400 text-xs mt-0.5 truncate">
                        {item.detail}
                      </p>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{
                        borderColor:
                          hovA === i ? ACCENT : "rgba(163,230,53,0.25)",
                        background: hovA === i ? ACCENT : "transparent",
                      }}
                    >
                      <span
                        className="text-xs font-black transition-all"
                        style={{
                          color: hovA === i ? "#1c1917" : "transparent",
                        }}
                      >
                        ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NOT ALLOWED */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center text-white font-black text-sm">
                  ✕
                </div>
                <div>
                  <h3
                    className="text-xl font-bold text-rose-400"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    NOT ALLOWED
                  </h3>
                  <p className="text-stone-400 text-xs">Harmful or toxic to animals</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {NOT_ALLOWED.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300"
                    style={{
                      background:
                        hovN === i
                          ? "rgba(248,113,113,0.06)"
                          : "rgba(255,255,255,0.02)",
                      borderColor:
                        hovN === i
                          ? "rgba(248,113,113,0.35)"
                          : "rgba(255,255,255,0.06)",
                      transform:
                        hovN === i ? "translateX(4px)" : "translateX(0)",
                    }}
                    onMouseEnter={() => setHovN(i)}
                    onMouseLeave={() => setHovN(null)}
                  >
                    <span className="text-3xl opacity-50">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold transition-colors duration-300 line-through decoration-rose-500/40"
                        style={{
                          color:
                            hovN === i
                              ? "#f87171"
                              : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {item.item}
                      </p>
                      <p
                        className="text-xs mt-0.5 transition-colors"
                        style={{
                          color:
                            hovN === i
                              ? "rgba(248,113,113,0.8)"
                              : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {item.reason}
                      </p>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{
                        borderColor:
                          hovN === i ? "#f87171" : "rgba(248,113,113,0.25)",
                        background: hovN === i ? "#f87171" : "transparent",
                      }}
                    >
                      <span
                        className="text-xs font-black"
                        style={{ color: hovN === i ? "#fff" : "transparent" }}
                      >
                        ✕
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Receiver Registration Section ── */}
      <section id="register" className="py-20 px-6 relative">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-10 shadow-2xl border backdrop-blur-md"
            style={{
              background: "rgba(28,25,23,0.88)",
              borderColor: "rgba(163,230,53,0.25)",
            }}
          >
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl mb-3"
                style={{
                  background: "rgba(163,230,53,0.15)",
                  border: "1px solid rgba(163,230,53,0.3)",
                }}
              >
                🐄
              </div>
              <h2
                className="text-3xl font-bold text-white mb-2"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Register Farm or Sanctuary
              </h2>
              <p className="text-sm text-stone-300">
                Register your farm and livestock feed requirements to receive direct animal-grade surplus food allocations.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: ACCENT }}
                >
                  Farm / Organization Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Green Pastures Farm"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
                  style={{
                    background: "rgba(163,230,53,0.06)",
                    border: "1px solid rgba(163,230,53,0.25)",
                    color: "white",
                  }}
                />
              </div>

              {/* Location */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: ACCENT }}
                >
                  Farm Location / Address
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Area 1, North Rural Belt"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
                  style={{
                    background: "rgba(163,230,53,0.06)",
                    border: "1px solid rgba(163,230,53,0.25)",
                    color: "white",
                  }}
                />
              </div>

              {/* Food Needed */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: ACCENT }}
                >
                  Food / Feed Type Needed
                </label>
                <input
                  type="text"
                  value={foodNeeded}
                  onChange={(e) => setFoodNeeded(e.target.value)}
                  placeholder="e.g. vegetable trimmings, cooked rice, grain leftovers"
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
                  style={{
                    background: "rgba(163,230,53,0.06)",
                    border: "1px solid rgba(163,230,53,0.25)",
                    color: "white",
                  }}
                />
              </div>

              {/* Quantity */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: ACCENT }}
                >
                  Approximate Quantity Needed
                </label>
                <select
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
                  style={{
                    background: "#1c1917",
                    border: "1px solid rgba(163,230,53,0.25)",
                    color: "white",
                  }}
                >
                  <option value="SMALL">SMALL (Daily batch &lt; 30 kg)</option>
                  <option value="MEDIUM">MEDIUM (Daily batch 30 - 100 kg)</option>
                  <option value="LARGE">LARGE (Daily batch &gt; 100 kg)</option>
                </select>
              </div>

              {/* Available */}
              <div
                className="flex items-center gap-3 p-4 rounded-xl border"
                style={{
                  background: "rgba(163,230,53,0.04)",
                  borderColor: "rgba(163,230,53,0.15)",
                }}
              >
                <input
                  type="checkbox"
                  id="available-check"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-lime-500"
                />
                <label
                  htmlFor="available-check"
                  className="text-sm font-medium text-stone-200 cursor-pointer select-none"
                >
                  Available to receive animal feed deliveries / pickups today
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: ACCENT,
                  color: "#1c1917",
                  boxShadow: "0 8px 24px rgba(163,230,53,0.25)",
                }}
              >
                {loading ? "Registering Animal Farm..." : "Register Animal Farm →"}
              </button>
            </form>

            {/* Message Alert */}
            {message && (
              <div
                className="mt-6 p-4 rounded-xl text-center text-sm font-medium border"
                style={{
                  background: message.includes("success")
                    ? "rgba(163,230,53,0.15)"
                    : "rgba(248,113,113,0.15)",
                  borderColor: message.includes("success")
                    ? "rgba(163,230,53,0.4)"
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

      {/* ── Live Available Animal Feed & Notifications Section ── */}
      <section id="allocations" className="py-16 px-6 relative">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono mb-3"
              style={{
                background: "rgba(163,230,53,0.15)",
                border: "1px solid rgba(163,230,53,0.3)",
                color: ACCENT,
              }}
            >
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              Live Animal Feed Stream
            </div>
            <h2
              className="text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Live Feed Ready for Farm Pickup
            </h2>
            <p className="text-sm max-w-md mx-auto text-stone-300">
              Surplus food streams verified safe for livestock feed. Accept offers directly to coordinate collection.
            </p>
          </div>

          <NotificationSection receiverType="ANIMAL_FARM" theme="farm" />
        </div>
      </section>

      {/* ── Closing CTA Section ── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at bottom, rgba(163,230,53,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="text-6xl mb-6 animate-float">🌾</div>
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Ready to receive<br />
            <em className="not-italic" style={{ color: ACCENT }}>
              surplus food?
            </em>
          </h2>
          <p className="text-stone-300 text-lg mb-10 max-w-xl mx-auto">
            Join our regional farm partner network and turn edible surplus into vital nourishment for livestock.
          </p>

          <button
            onClick={() => scrollToSection("register")}
            className="px-10 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105"
            style={{
              background: ACCENT,
              color: "#1c1917",
              boxShadow: "0 15px 40px rgba(163,230,53,0.25)",
            }}
          >
            Register Your Farm Now 🌿
          </button>
        </div>
      </section>
    </div>
  );
}