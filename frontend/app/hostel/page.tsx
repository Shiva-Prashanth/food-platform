"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";

type SessionItem = {
    id: string;
    food?: string | null;
    imagePath?: string | null;
    preparationTime?: string;
    temperature?: number;
    storage?: string;
    smell?: string;
    quantity?: string;
    status?: string;
    analysis?: {
        food_name?: string;
        food_confidence?: number;
        good_percentage?: number;
        bad_percentage?: number;
        visual_assessment?: string;
        final_assessment?: string;
        animal_feed_status?: string;
        recovery_routes?: string[];
        verification_required?: boolean;
        elapsed_hours?: number;
    } | null;
    donorDecision?: string | null;
    selectedRoute?: string | null;
    donationId?: string | null;
};

type DonationSession = {
    id: string;
    status: string;
    itemCount: number;
    location?: string;
    items: SessionItem[];
};

type PendingValidation = {
    donationId: string;
    food: string;
    quantity?: string | null;
    animalFeedStatus?: string | null;
    validationStatus?: string | null;
    validationDecision?: string | null;
    allocationStatus?: string | null;
};

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`;
const SESSION_STORAGE_KEY = "smart-surplus-hostel-donation-session";

const routeLabels: Record<string, string> = {
    HUMAN: "Orphanage",
    ANIMAL_FEED: "Animal Farm",
    BIOCOMPOST: "Biocompost",
};

const routeDescriptions: Record<string, string> = {
    HUMAN: "Approve nutritious food for children and families in need",
    ANIMAL_FEED: "Nutritious feed for verified local animal farms",
    BIOCOMPOST: "Convert degraded organic matter to soil nutrients and biogas",
};

const routeIcons: Record<string, string> = {
    HUMAN: "👨‍👩‍👧‍👦",
    ANIMAL_FEED: "🐄",
    BIOCOMPOST: "🌱",
};

const SCAN_STEPS = [
    "Initialising neural vision model (FoodNet-3B)...",
    "Detecting food items & boundary contours...",
    "Assessing surface texture & thermal parameters...",
    "Calculating microbial risk & freshness metrics...",
    "Determining optimal multi-tier recovery path...",
];

const FLOW_STEPS = [
    { icon: "🍱", label: "Surplus Food", desc: "Collected & logged with thermal & sensory metadata", color: "#087F8C" },
    { icon: "🤖", label: "AI Analysis", desc: "Neural vision assesses condition & spoilage risks", color: "#159A9C" },
    { icon: "👨‍👩‍👧", label: "Human Use", desc: "Safe, fresh food is routed to orphanages & shelters", color: "#B86B00" },
    { icon: "🐄", label: "Animal Feed", desc: "Safe scraps nourish verified farm animals", color: "#65a30d" },
    { icon: "🌱", label: "Biocompost", desc: "Degraded matter returns to earth as rich energy & fertilizer", color: "#4FB3BF" },
];

const STATS = [
    { value: "2.4T", label: "Tons of food wasted annually", icon: "🍽️", sub: "Enough to feed 3 billion people" },
    { value: "811M", label: "People go hungry every day", icon: "💔", sub: "One in ten humans on Earth" },
    { value: "8%", label: "Of global greenhouse emissions", icon: "🌍", sub: "Come from food waste alone" },
];

const FLOAT_ICONS = [
    { icon: "🍱", top: "15%", left: "5%", delay: "0s", size: "2.5rem" },
    { icon: "🌿", top: "25%", right: "6%", delay: "0.6s", size: "2rem" },
    { icon: "🍃", top: "60%", left: "3%", delay: "1.2s", size: "1.8rem" },
    { icon: "🥗", top: "70%", right: "4%", delay: "0.9s", size: "2rem" },
    { icon: "♻️", top: "45%", left: "92%", delay: "1.5s", size: "1.6rem" },
];

function normalizeRoutes(item: SessionItem): string[] {
    const routes = Array.isArray(item.analysis?.recovery_routes)
        ? item.analysis!.recovery_routes!.map((route) => String(route).toUpperCase())
        : [];

    const result: string[] = [];
    if (routes.includes("HUMAN")) result.push("HUMAN");
    if (routes.includes("ANIMAL_FEED") && String(item.analysis?.animal_feed_status).toUpperCase() === "ALLOWED") {
        result.push("ANIMAL_FEED");
    }
    if (routes.includes("BIOCOMPOST") || routes.includes("BIOGAS")) result.push("BIOCOMPOST");
    return [...new Set(result)];
}

function assessmentLabel(value?: string) {
    switch (value) {
        case "low_concern":
            return "Good Condition (Low Concern)";
        case "moderate_concern":
            return "Acceptable (Moderate Concern)";
        case "high_concern":
            return "Significantly Degraded (High Concern)";
        case "manual_verification":
            return "Manual Verification Required";
        default:
            return value || "Not assessed";
    }
}

export default function HostelPage() {
    const [session, setSession] = useState<DonationSession | null>(null);
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [preparationTime, setPreparationTime] = useState("");
    const [temperature, setTemperature] = useState("28");
    const [storage, setStorage] = useState("room");
    const [smell, setSmell] = useState("normal");
    const [quantity, setQuantity] = useState("MEDIUM");
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [scanStepIndex, setScanStepIndex] = useState(0);
    const [confirming, setConfirming] = useState(false);
    const [message, setMessage] = useState("");
    const [selectedRoutes, setSelectedRoutes] = useState<Record<string, string>>({});
    const [showStartScreen, setShowStartScreen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [pendingValidations, setPendingValidations] = useState<PendingValidation[]>([]);
    const [validatingDonationId, setValidatingDonationId] = useState<string | null>(null);

    // Visual interaction states
    const [activeStep, setActiveStep] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Parallax scroll listener
    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Interactive flow timer
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % FLOW_STEPS.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    // Neural analysis scan steps ticker when analyzing is active
    useEffect(() => {
        if (!analyzing) {
            setScanStepIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setScanStepIndex((prev) => (prev + 1) % SCAN_STEPS.length);
        }, 800);
        return () => clearInterval(interval);
    }, [analyzing]);

    // Create image preview when image changes
    useEffect(() => {
        if (!image) {
            setImagePreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(image);
        setImagePreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [image]);

    async function fetchSession(sessionId: string) {
        const response = await fetch(`${API_BASE}/donation-sessions/${sessionId}`);
        if (!response.ok) throw new Error("Saved donation session could not be loaded.");
        const data = await response.json();
        setSession(data.session);

        const savedRoutes: Record<string, string> = {};
        for (const item of data.session.items || []) {
            if (item.status === "ASSESSED" && item.selectedRoute) {
                savedRoutes[item.id] = item.selectedRoute;
            }
        }
        setSelectedRoutes(savedRoutes);

        const pendingItems = data.session.items?.filter((item: SessionItem) => item.status === "PENDING") || [];
        const lastItem = pendingItems[pendingItems.length - 1] || data.session.items?.[data.session.items.length - 1];
        if (lastItem) {
            setPreparationTime(lastItem.preparationTime || "");
            setTemperature(String(lastItem.temperature ?? 28));
            setStorage(lastItem.storage || "room");
            setSmell(lastItem.smell || "normal");
            setQuantity(lastItem.quantity || "MEDIUM");
        }
    }

    async function createNewSession() {
        setMessage("");
        try {
            const response = await fetch(`${API_BASE}/donation-sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ location: "HOSTEL" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not start donation session");
            localStorage.setItem(SESSION_STORAGE_KEY, data.session.id);
            setSession({
                ...data.session,
                items: data.session.items || [],
            });
            setShowStartScreen(false);
            setMessage("New donation session started.");
            setTimeout(() => {
                document.getElementById("donation-workspace")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not start donation session");
        }
    }

    useEffect(() => {
        const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!savedSessionId) {
            setShowStartScreen(true);
            return;
        }

        fetchSession(savedSessionId).catch(() => {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            setShowStartScreen(true);
        });
    }, []);

    async function addFoodItem(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!session) {
            setMessage("Please start a donation session first.");
            return;
        }
        if (!editingItemId && !image) {
            setMessage("Please select a food image.");
            return;
        }
        if (!preparationTime) {
            setMessage("Please enter the preparation time.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            let response: Response;

            if (editingItemId) {
                response = await fetch(`${API_BASE}/donation-sessions/${session.id}/items/${editingItemId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        preparationTime: preparationTime.replace("T", " "),
                        temperature,
                        storage,
                        smell,
                        quantity,
                    }),
                });
            } else {
                if (!image) {
                    setMessage("Please select a food image.");
                    setLoading(false);
                    return;
                }

                const formData = new FormData();
                formData.append("image", image);
                formData.append("preparationTime", preparationTime.replace("T", " "));
                formData.append("temperature", temperature);
                formData.append("storage", storage);
                formData.append("smell", smell);
                formData.append("quantity", quantity);

                response = await fetch(`${API_BASE}/donation-sessions/${session.id}/items`, {
                    method: "POST",
                    body: formData,
                });
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not save food item");

            const wasEditing = Boolean(editingItemId);
            await fetchSession(session.id);
            setEditingItemId(null);
            setImage(null);
            setImagePreview(null);
            const input = document.getElementById("food-image") as HTMLInputElement | null;
            if (input) input.value = "";
            setMessage(wasEditing ? "Food item updated." : "Food item added. All items will be assessed together after you click analyze.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not add food item");
        } finally {
            setLoading(false);
        }
    }

    function editItem(item: SessionItem) {
        setEditingItemId(item.id);
        setImage(null);
        setImagePreview(null);
        setPreparationTime((item.preparationTime || "").replace(" ", "T"));
        setTemperature(String(item.temperature ?? 28));
        setStorage(item.storage || "room");
        setSmell(item.smell || "normal");
        setQuantity(item.quantity || "MEDIUM");
        setMessage("Editing this food item. Update its details and save.");
        document.getElementById("food-entry-form")?.scrollIntoView({ behavior: "smooth" });
    }

    async function removeItem(itemId: string) {
        if (!session) return;
        try {
            const response = await fetch(`${API_BASE}/donation-sessions/${session.id}/items/${itemId}`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not remove item");
            await fetchSession(session.id);
            setMessage("Food item removed.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not remove item");
        }
    }

    async function analyzeAllItems() {
        if (!session || session.items.length === 0) {
            setMessage("Add at least one food item before analysis.");
            return;
        }
        setAnalyzing(true);
        setMessage("");
        try {
            const response = await fetch(`${API_BASE}/donation-sessions/${session.id}/analyze`, { method: "POST" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Food analysis failed");
            setSession(data.session);
            setMessage("Neural Food Analysis completed successfully. Review the detailed AI telemetry and routing below.");
            setTimeout(() => {
                document.getElementById("analysis-results-section")?.scrollIntoView({ behavior: "smooth" });
            }, 150);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Food analysis failed");
        } finally {
            setAnalyzing(false);
        }
    }

    async function selectRoute(itemId: string, route: string) {
        if (!session) return;

        setSelectedRoutes((previous) => ({ ...previous, [itemId]: route }));
        try {
            await fetch(`${API_BASE}/donation-sessions/${session.id}/items/${itemId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ donorDecision: "DONATE", selectedRoute: route }),
            });
        } catch (error) {
            console.error("Could not save donor selection:", error);
        }
    }

    async function declineItem(itemId: string) {
        if (!session) return;

        setSelectedRoutes((previous) => {
            const next = { ...previous };
            delete next[itemId];
            return next;
        });

        try {
            await fetch(`${API_BASE}/donation-sessions/${session.id}/items/${itemId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ donorDecision: "DO_NOT_DONATE", selectedRoute: null }),
            });
        } catch (error) {
            console.error("Could not save donor decision:", error);
        }
    }

    async function confirmDonations() {
        if (!session) return;
        const selections = Object.entries(selectedRoutes).map(([itemId, route]) => ({ itemId, route }));
        if (selections.length === 0) {
            setMessage("Select at least one food item to donate. Items without a selection will not be donated.");
            return;
        }

        setConfirming(true);
        setMessage("");
        try {
            const response = await fetch(`${API_BASE}/donation-sessions/${session.id}/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: selections }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not confirm donations");

            setSession(data.session);

            const validationItems: PendingValidation[] = (data.donations || [])
                .map((entry: any) => entry?.donation || entry)
                .filter(
                    (donation: any) =>
                        donation?.validationRequired === true &&
                        donation?.validationStatus === "PENDING" &&
                        donation?.id
                )
                .map((donation: any) => ({
                    donationId: donation.id,
                    food: donation.food || "Unknown food",
                    quantity: donation.quantity || null,
                    animalFeedStatus: donation.animalFeedStatus || null,
                    validationStatus: donation.validationStatus,
                    validationDecision: donation.validationDecision || null,
                    allocationStatus: donation.allocationStatus || null,
                }));

            setPendingValidations(validationItems);

            localStorage.removeItem(SESSION_STORAGE_KEY);

            setMessage(
                validationItems.length > 0
                    ? `${validationItems.length} food item(s) require human validation before receiver allocation.`
                    : `${data.donations?.length || selections.length} donation item(s) confirmed. Receiver allocation has started for eligible items.`
            );

            setTimeout(() => {
                document.getElementById("confirmation-section")?.scrollIntoView({ behavior: "smooth" });
            }, 150);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not confirm donations");
        } finally {
            setConfirming(false);
        }
    }

    async function validateDonation(
        donationId: string,
        validationDecision: "HUMAN" | "ANIMAL" | "BIOCOMPOST"
    ) {
        setValidatingDonationId(donationId);
        setMessage("");

        try {
            const response = await fetch(
                `${API_BASE}/donations/${donationId}/validate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        validationDecision,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Human validation failed");
            }

            setPendingValidations((previous) =>
                previous.map((item) =>
                    item.donationId === donationId
                        ? {
                            ...item,
                            validationStatus:
                                data.donation?.validationStatus ||
                                "COMPLETED",
                            validationDecision,
                            allocationStatus:
                                data.donation?.allocationStatus ||
                                item.allocationStatus,
                        }
                        : item
                )
            );

            if (data.waitingForSessionValidation) {
                setMessage(
                    "Validation completed. Waiting for the remaining food items in this donation session."
                );
            } else {
                setMessage(
                    "Human validation completed. Receiver allocation has started."
                );
            }
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Human validation failed"
            );
        } finally {
            setValidatingDonationId(null);
        }
    }

    function startAnotherDonation() {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setSession(null);
        setSelectedRoutes({});
        setImage(null);
        setImagePreview(null);
        setPreparationTime("");
        setTemperature("28");
        setStorage("room");
        setSmell("normal");
        setQuantity("MEDIUM");
        setMessage("");
        setShowStartScreen(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const assessedItems = session?.items.filter((item) => item.status === "ASSESSED") || [];
    const isResultsStage = session?.status === "ASSESSMENT_COMPLETED" || session?.status === "WAITING_FOR_DONOR_SELECTION";
    const collectionStage = session && (session.status === "DRAFT" || session.status === "ASSESSING");
    const confirmedStage = session && (session.status === "READY_FOR_ALLOCATION" || session.status === "COMPLETED");

    const lowCount = assessedItems.filter((item) => item.analysis?.final_assessment === "low_concern").length;
    const moderateCount = assessedItems.filter((item) => item.analysis?.final_assessment === "moderate_concern").length;
    const highCount = assessedItems.filter((item) => item.analysis?.final_assessment === "high_concern").length;
    const manualCount = assessedItems.filter((item) => item.analysis?.final_assessment === "manual_verification").length;

    const selectedCount = useMemo(() => Object.keys(selectedRoutes).length, [selectedRoutes]);

    return (
        <div className="bg-[#F2F8FA] min-h-screen text-[#173B43] selection:bg-[#4FB3BF] selection:text-[#173B43]">
            {/* ── Sticky Navigation Bar ── */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#D5E7EA] transition-all">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-[#087F8C] hover:text-[#159A9C] font-semibold text-sm transition-colors group"
                        >
                            <span className="p-1.5 rounded-lg bg-[#DDF3F4] border border-[#D5E7EA] group-hover:bg-[#4FB3BF]/20 transition-all">
                                ←
                            </span>
                            <span>All Portals</span>
                        </Link>
                        <span className="text-[#D5E7EA]">|</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🍱</span>
                            <span className="font-bold text-[#173B43] tracking-tight" style={{ fontFamily: "Fraunces, serif" }}>
                                Hostel Recovery Portal
                            </span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest font-semibold text-[#58747B]">
                        <a href="#hero" className="hover:text-[#087F8C] transition-colors">Overview</a>
                        <a href="#recovery-journey" className="hover:text-[#087F8C] transition-colors">Journey</a>
                        <a href="#impact" className="hover:text-[#087F8C] transition-colors">Impact</a>
                        <a href="#donation-workspace" className="text-[#087F8C] hover:text-[#159A9C] transition-colors flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#087F8C] animate-pulse" />
                            Donation Session
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        {session && (
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] text-xs font-mono">
                                Session #{session.id.slice(-6)} ({session.items.length} items)
                            </span>
                        )}
                        <button
                            onClick={() => {
                                if (showStartScreen || !session) {
                                    createNewSession();
                                } else {
                                    document.getElementById("donation-workspace")?.scrollIntoView({ behavior: "smooth" });
                                }
                            }}
                            className="bg-[#087F8C] hover:bg-[#159A9C] text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all shadow-md shadow-[#087F8C]/20 hover:scale-105"
                        >
                            {showStartScreen || !session ? "Start Session" : "Log Food"}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Hero Section ── */}
            <section id="hero" className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Parallax Background */}
                <div
                    className="absolute inset-0 bg-cover bg-center scale-110 pointer-events-none opacity-15"
                    style={{
                        backgroundImage: `url(https://images.unsplash.com/photo-1593113616828-6f22bca04804?w=1920&h=1080&fit=crop&auto=format)`,
                        transform: `scale(1.1) translateY(${scrollY * 0.2}px)`,
                    }}
                />
                {/* Clean light gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#F2F8FA]/95 via-[#F2F8FA]/80 to-[#F2F8FA] pointer-events-none" />
                {/* Radial glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,179,191,0.18)_0%,transparent_70%)] pointer-events-none" />

                {/* Floating food icons */}
                {FLOAT_ICONS.map((f, i) => (
                    <div
                        key={i}
                        className="absolute pointer-events-none animate-float hidden sm:block"
                        style={{ top: f.top, left: f.left, right: f.right, fontSize: f.size, animationDelay: f.delay, opacity: 0.35 }}
                    >
                        {f.icon}
                    </div>
                ))}

                {/* Hero copy */}
                <div className="relative z-10 text-center max-w-5xl mx-auto px-6 py-20">
                    <div className="inline-flex items-center gap-2 bg-[#DDF3F4] border border-[#D5E7EA] rounded-full px-5 py-2 mb-8">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#087F8C] animate-pulse" />
                        <span className="text-[#087F8C] text-xs font-semibold tracking-[0.18em] uppercase">
                            Hostel Food Recovery Portal
                        </span>
                    </div>

                    <h1
                        className="text-5xl sm:text-7xl md:text-8xl font-bold text-[#173B43] leading-[0.96] mb-8"
                        style={{ fontFamily: "Fraunces, serif" }}
                    >
                        Every Plate<br />
                        <em className="text-[#087F8C] not-italic">Deserves a</em><br />
                        Second Chance.
                    </h1>

                    <p className="text-[#58747B] text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
                        Intercept surplus dining hall food before it becomes landfill. Our neural AI analyzes freshness, condition, and matches optimal routes for orphanages, animal feed, or biocompost.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                            onClick={() => {
                                if (showStartScreen || !session) {
                                    createNewSession();
                                } else {
                                    document.getElementById("donation-workspace")?.scrollIntoView({ behavior: "smooth" });
                                }
                            }}
                            className="group relative bg-[#087F8C] hover:bg-[#159A9C] text-white px-9 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#087F8C]/30 overflow-hidden flex items-center gap-2"
                        >
                            <span className="relative z-10">
                                {showStartScreen || !session ? "Start New Donation Session" : "Open Donation Workspace"}
                            </span>
                            <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">→</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#087F8C] to-[#159A9C] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                        <a
                            href="#recovery-journey"
                            className="border border-[#D5E7EA] bg-white/80 text-[#087F8C] px-8 py-4 rounded-full font-medium text-lg hover:bg-[#DDF3F4] hover:border-[#4FB3BF] transition-all duration-300 shadow-sm"
                        >
                            See How It Works ↓
                        </a>
                    </div>
                </div>

                {/* Scroll cue */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
                    <span className="text-[#087F8C] text-[10px] uppercase tracking-widest font-mono font-bold">Scroll</span>
                    <div className="w-px h-8 bg-gradient-to-b from-[#087F8C] to-transparent" />
                </div>
            </section>

            {/* ── Recovery Journey Carousel ── */}
            <section id="recovery-journey" className="py-24 px-6 relative overflow-hidden bg-white/60 border-t border-[#D5E7EA]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,179,191,0.08)_0%,transparent_60%)] pointer-events-none" />

                <div className="max-w-6xl mx-auto relative">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] text-xs font-mono uppercase tracking-widest mb-3">
                            Multi-Tier Food Routing
                        </div>
                        <h2
                            className="text-4xl md:text-5xl font-bold text-[#173B43] mb-4"
                            style={{ fontFamily: "Fraunces, serif" }}
                        >
                            The Recovery Journey
                        </h2>
                        <p className="text-[#58747B] max-w-xl mx-auto text-sm sm:text-base">
                            Every piece of surplus hostel food follows an intelligent path to its best possible destination. Nothing wasted. Everything purposeful.
                        </p>
                    </div>

                    {/* Flow steps */}
                    <div className="flex flex-wrap justify-center items-center gap-2">
                        {FLOW_STEPS.map((step, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <button
                                    onClick={() => setActiveStep(i)}
                                    className="relative flex flex-col items-center p-5 rounded-2xl transition-all duration-500 group"
                                    style={{
                                        background: i === activeStep ? "#DDF3F4" : "#FFFFFF",
                                        border: `1.5px solid ${i === activeStep ? "#087F8C" : "#D5E7EA"}`,
                                        boxShadow: i === activeStep ? "0 10px 25px rgba(8,127,140,0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
                                        transform: i === activeStep ? "scale(1.08)" : "scale(1)",
                                    }}
                                >
                                    {/* Pulse ring on active */}
                                    {i === activeStep && (
                                        <div
                                            className="absolute inset-0 rounded-2xl animate-grow-ring"
                                            style={{ border: `1.5px solid ${step.color}60` }}
                                        />
                                    )}

                                    <div className="text-4xl sm:text-5xl mb-3 transition-transform duration-300 group-hover:scale-110">
                                        {step.icon}
                                    </div>
                                    <span
                                        className="text-xs font-bold mb-0.5 text-center"
                                        style={{ color: i === activeStep ? step.color : "#58747B" }}
                                    >
                                        {step.label}
                                    </span>
                                    <span className="text-[11px] text-[#58747B]/80 font-medium">{step.desc.slice(0, 20)}...</span>
                                </button>

                                {i < FLOW_STEPS.length - 1 && (
                                    <div className="hidden lg:flex flex-col items-center gap-1 mx-1">
                                        <div className="relative w-8 h-0.5 bg-[#D5E7EA] overflow-hidden rounded-full">
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                                style={{
                                                    background: FLOW_STEPS[i].color,
                                                    width: i < activeStep ? "100%" : "0%",
                                                }}
                                            />
                                        </div>
                                        <span className="text-[#58747B]/60 text-xs">›</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Active step detail box */}
                    <div
                        className="mt-10 p-6 max-w-lg mx-auto bg-white border border-[#D5E7EA] rounded-3xl text-center shadow-lg transition-all duration-500"
                        key={activeStep}
                        style={{ animation: "fadeUp 0.5s ease-out forwards" }}
                    >
                        <div className="text-4xl mb-2">{FLOW_STEPS[activeStep].icon}</div>
                        <h3
                            className="text-2xl font-bold mb-2"
                            style={{ fontFamily: "Fraunces, serif", color: FLOW_STEPS[activeStep].color }}
                        >
                            {FLOW_STEPS[activeStep].label}
                        </h3>
                        <p className="text-[#58747B] text-sm leading-relaxed">{FLOW_STEPS[activeStep].desc}</p>
                    </div>
                </div>
            </section>

            {/* ── Impact Stats ── */}
            <section id="impact" className="py-20 px-6 bg-[#DDF3F4]/40 border-y border-[#D5E7EA]">
                <div className="max-w-5xl mx-auto">
                    <h2
                        className="text-3xl md:text-4xl font-bold text-[#173B43] mb-12 text-center"
                        style={{ fontFamily: "Fraunces, serif" }}
                    >
                        The Weight of Waste
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {STATS.map((stat, i) => (
                            <div
                                key={i}
                                className="relative group bg-white border border-[#D5E7EA] rounded-3xl p-8 overflow-hidden hover:border-[#4FB3BF] transition-all duration-500 hover:-translate-y-2 shadow-md hover:shadow-xl"
                            >
                                <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#DDF3F4] rounded-full group-hover:bg-[#4FB3BF]/20 transition-all duration-500 group-hover:scale-125" />
                                <div className="text-4xl mb-5">{stat.icon}</div>
                                <div
                                    className="text-5xl font-bold text-[#087F8C] mb-2 leading-none"
                                    style={{ fontFamily: "Fraunces, serif" }}
                                >
                                    {stat.value}
                                </div>
                                <div className="text-[#173B43] text-sm font-semibold mb-1">{stat.label}</div>
                                <div className="text-[#58747B] text-xs">{stat.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FUNCTIONAL DONATION WORKSPACE ── */}
            <section id="donation-workspace" className="py-24 px-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(79,179,191,0.08)_0%,transparent_70%)] pointer-events-none" />

                <div className="max-w-4xl mx-auto relative space-y-8">
                    {/* Status / feedback toast */}
                    {message && (
                        <div className="p-4 rounded-2xl bg-[#DDF3F4] border border-[#4FB3BF] text-[#087F8C] text-sm text-center font-medium shadow-md animate-fadeUp">
                            {message}
                        </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* STAGE 0: NO SESSION / START NEW SCREEN */}
                    {/* ---------------------------------------------------- */}
                    {(showStartScreen || !session) && (
                        <div className="bg-white border border-[#D5E7EA] rounded-3xl shadow-xl p-8 sm:p-12 text-center">
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#DDF3F4] border border-[#D5E7EA] flex items-center justify-center text-4xl mb-6 animate-float">
                                🍱
                            </div>

                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] text-xs font-mono uppercase tracking-wider mb-4">
                                Hostel Kitchen Workspace
                            </div>

                            <h2
                                className="text-3xl sm:text-4xl font-bold text-[#173B43] mb-4"
                                style={{ fontFamily: "Fraunces, serif" }}
                            >
                                Start a Food Donation Session
                            </h2>

                            <p className="text-[#58747B] text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
                                Add multiple leftover food items from your breakfast, lunch, or dinner service. All items will be collected together and assessed by AI before routing.
                            </p>

                            <button
                                type="button"
                                onClick={createNewSession}
                                className="w-full sm:w-auto px-10 py-4 bg-[#087F8C] hover:bg-[#159A9C] text-white font-bold rounded-full text-base transition-all duration-300 hover:scale-105 shadow-xl shadow-[#087F8C]/25"
                            >
                                Start New Donation Session →
                            </button>
                        </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* STAGE 1: COLLECTION STAGE (DRAFT / ASSESSING) */}
                    {/* ---------------------------------------------------- */}
                    {collectionStage && session && (
                        <>
                            {/* Session Header Card */}
                            <div className="bg-white border border-[#D5E7EA] rounded-3xl shadow-xl p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#D5E7EA]">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-2 h-2 rounded-full bg-[#087F8C] animate-pulse" />
                                            <span className="text-xs font-mono text-[#087F8C] uppercase tracking-wider">Active Session</span>
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-bold text-[#173B43]" style={{ fontFamily: "Fraunces, serif" }}>
                                            Hostel Food Intake
                                        </h2>
                                        <p className="text-xs font-mono text-[#58747B] mt-1">ID: {session.id}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-4 py-1.5 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] text-sm font-semibold">
                                            {session.items.length} food item{session.items.length === 1 ? "" : "s"} logged
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 rounded-2xl bg-[#DDF3F4] border border-[#D5E7EA] flex items-start gap-3 text-xs sm:text-sm text-[#173B43] leading-relaxed">
                                    <span className="text-xl shrink-0">ℹ️</span>
                                    <span>
                                        <strong>Batch Assessment Workflow:</strong> Add each leftover food item with its thermal and storage parameters. AI assessment will be performed across all items together when you finish logging.
                                    </span>
                                </div>

                                {/* Food Entry Form */}
                                <form id="food-entry-form" onSubmit={addFoodItem} className="mt-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-[#173B43] flex items-center gap-2">
                                            <span>{editingItemId ? "✏️" : "➕"}</span>
                                            <span>{editingItemId ? "Edit Food Item" : `Add Food Item #${session.items.length + 1}`}</span>
                                        </h3>
                                        {editingItemId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingItemId(null);
                                                    setMessage("");
                                                    setImage(null);
                                                    setImagePreview(null);
                                                }}
                                                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                                            >
                                                ✕ Cancel Edit
                                            </button>
                                        )}
                                    </div>

                                    {/* Image Dropzone & Preview */}
                                    <div>
                                        <label className="block text-xs font-semibold text-[#58747B] uppercase tracking-wider mb-2">
                                            Food Item Image {!editingItemId && <span className="text-[#087F8C]">*</span>}
                                        </label>

                                        <div
                                            className="relative rounded-3xl p-6 border-2 border-dashed transition-all duration-300 text-center cursor-pointer overflow-hidden"
                                            style={{
                                                borderColor: isDragOver ? "#087F8C" : "#D5E7EA",
                                                background: isDragOver ? "#DDF3F4" : "#F2F8FA",
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setIsDragOver(true);
                                            }}
                                            onDragLeave={() => setIsDragOver(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDragOver(false);
                                                const file = e.dataTransfer.files?.[0];
                                                if (file && file.type.startsWith("image/")) {
                                                    setImage(file);
                                                }
                                            }}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                id="food-image"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setImage(e.target.files?.[0] || null)}
                                                className="hidden"
                                            />

                                            {imagePreview ? (
                                                <div className="relative max-w-xs mx-auto rounded-2xl overflow-hidden shadow-md border border-[#D5E7EA]">
                                                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#173B43]/80 via-transparent to-transparent flex items-end justify-center p-3">
                                                        <span className="text-xs text-white font-mono">
                                                            {image?.name || "Image Selected"} (Click to replace)
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-6">
                                                    <div className="text-5xl mb-3 animate-float">📸</div>
                                                    <p className="text-[#173B43] font-semibold text-sm mb-1">
                                                        Drop food photo here or click to browse
                                                    </p>
                                                    <p className="text-[#58747B] text-xs">
                                                        Supports JPEG, PNG, WEBP (Camera photos recommended)
                                                    </p>
                                                </div>
                                            )}

                                            {/* Tech HUD Corner brackets */}
                                            {[
                                                ["top-2 left-2", "border-t border-l"],
                                                ["top-2 right-2", "border-t border-r"],
                                                ["bottom-2 left-2", "border-b border-l"],
                                                ["bottom-2 right-2", "border-b border-r"],
                                            ].map(([pos, border], i) => (
                                                <div key={i} className={`absolute ${pos} w-4 h-4 border-[#4FB3BF] ${border}`} />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Grid form fields */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {/* Quantity */}
                                        <div>
                                            <label className="block text-xs font-semibold text-[#58747B] uppercase tracking-wider mb-2">
                                                Surplus Quantity <span className="text-[#087F8C]">*</span>
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(["SMALL", "MEDIUM", "LARGE"] as const).map((q) => (
                                                    <button
                                                        type="button"
                                                        key={q}
                                                        onClick={() => setQuantity(q)}
                                                        className="py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                                        style={
                                                            quantity === q
                                                                ? { background: "#087F8C", color: "#FFFFFF" }
                                                                : { background: "#F2F8FA", border: "1px solid #D5E7EA", color: "#58747B" }
                                                        }
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Preparation Time */}
                                        <div>
                                            <label className="block text-xs font-semibold text-[#58747B] uppercase tracking-wider mb-2">
                                                Preparation Date & Time <span className="text-[#087F8C]">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={preparationTime}
                                                onChange={(e) => setPreparationTime(e.target.value)}
                                                required
                                                className="w-full bg-[#F2F8FA] border border-[#D5E7EA] rounded-xl px-4 py-2.5 text-sm text-[#173B43] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                            />
                                        </div>

                                        {/* Temperature */}
                                        <div>
                                            <label className="block text-xs font-semibold text-[#58747B] uppercase tracking-wider mb-2">
                                                Holding Temperature (°C) <span className="text-[#087F8C]">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={temperature}
                                                    onChange={(e) => setTemperature(e.target.value)}
                                                    required
                                                    className="w-full bg-[#F2F8FA] border border-[#D5E7EA] rounded-xl px-4 py-2.5 text-sm text-[#173B43] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                                    placeholder="e.g. 28"
                                                />
                                                <span className="absolute right-4 top-2.5 text-xs text-[#58747B] font-mono">°C</span>
                                            </div>
                                        </div>

                                        {/* Storage Condition */}
                                        <div>
                                            <label className="block text-xs font-semibold text-[#58747B] uppercase tracking-wider mb-2">
                                                Storage Condition <span className="text-[#087F8C]">*</span>
                                            </label>
                                            <select
                                                value={storage}
                                                onChange={(e) => setStorage(e.target.value)}
                                                className="w-full bg-[#F2F8FA] border border-[#D5E7EA] rounded-xl px-4 py-2.5 text-sm text-[#173B43] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                            >
                                                <option value="room">Room Temperature (Ambient)</option>
                                                <option value="refrigerator">Refrigerator (Cold Storage)</option>
                                                <option value="freezer">Freezer (Frozen)</option>
                                            </select>
                                        </div>

                                        {/* Smell Condition */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold text-[#58747B] uppercase tracking-wider mb-2">
                                                Sensory Smell Check <span className="text-[#087F8C]">*</span>
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { val: "normal", label: "Normal (Fresh/Appetizing)", icon: "👃" },
                                                    { val: "unusual", label: "Unusual (Slight Odor)", icon: "⚠️" },
                                                    { val: "bad", label: "Bad (Sour/Spoiled)", icon: "🛑" },
                                                ].map((s) => (
                                                    <button
                                                        type="button"
                                                        key={s.val}
                                                        onClick={() => setSmell(s.val)}
                                                        className="py-3 px-3 rounded-xl text-xs font-medium transition-all text-center"
                                                        style={
                                                            smell === s.val
                                                                ? { background: "#DDF3F4", border: "1.5px solid #087F8C", color: "#087F8C" }
                                                                : { background: "#F2F8FA", border: "1px solid #D5E7EA", color: "#58747B" }
                                                        }
                                                    >
                                                        <span className="block text-base mb-0.5">{s.icon}</span>
                                                        <span className="font-semibold">{s.val.toUpperCase()}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#087F8C] hover:bg-[#159A9C] text-white font-bold py-4 rounded-full text-base transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-[#087F8C]/25 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                <span>Saving Food Item...</span>
                                            </>
                                        ) : editingItemId ? (
                                            "Update Food Item Details"
                                        ) : (
                                            "Add Food Item to Session +"
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Food Items Added List & Batch Trigger */}
                            {session.items.length > 0 && (
                                <div className="bg-white border border-[#D5E7EA] rounded-3xl shadow-xl p-6 sm:p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#173B43]" style={{ fontFamily: "Fraunces, serif" }}>
                                                Items in this Session ({session.items.length})
                                            </h3>
                                            <p className="text-[#58747B] text-xs">Ready for composite neural evaluation</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {session.items.map((item, index) => (
                                            <div
                                                key={item.id}
                                                className="bg-[#F2F8FA] border border-[#D5E7EA] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#4FB3BF] transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-[#DDF3F4] border border-[#D5E7EA] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                                                        {item.imagePath ? (
                                                            <img
                                                                src={`${process.env.NEXT_PUBLIC_API_URL}${item.imagePath}`}
                                                                alt={`Item ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.currentTarget as HTMLElement).style.display = "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            "🍱"
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-[#173B43] text-base">
                                                                Food Item #{index + 1}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] text-[10px] font-mono uppercase font-semibold">
                                                                {item.quantity} QTY
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#58747B] mt-1 font-mono">
                                                            <span>🌡️ {item.temperature}°C</span>
                                                            <span>📦 {item.storage}</span>
                                                            <span>👃 {item.smell}</span>
                                                            {item.preparationTime && (
                                                                <span>⏰ {item.preparationTime}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => editItem(item)}
                                                        className="px-4 py-2 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] hover:bg-[#4FB3BF]/20 text-xs font-semibold transition-all"
                                                    >
                                                        Edit ✏️
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        className="px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition-all"
                                                    >
                                                        Remove 🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── PHASE 4: NEURAL ANALYSIS SCANNER HUD (WHEN ANALYZING) ── */}
                                    {analyzing ? (
                                        <div className="mt-8 p-6 sm:p-8 bg-[#173B43] border border-[#4FB3BF] rounded-3xl relative overflow-hidden shadow-2xl animate-fadeUp text-white">
                                            {/* Glowing ambient background blur */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#4FB3BF]/10 rounded-full blur-3xl pointer-events-none" />

                                            {/* Top Scanner HUD Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#4FB3BF]/30 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-3 h-3 rounded-full bg-[#4FB3BF] animate-pulse" />
                                                    <div>
                                                        <h4 className="text-sm font-mono text-[#DDF3F4] uppercase tracking-[0.2em] font-bold">
                                                            Neural Food Analysis Engine v2.4
                                                        </h4>
                                                        <p className="text-xs text-slate-300 font-mono mt-0.5">
                                                            Processing {session.items.length} food sample{session.items.length === 1 ? "" : "s"} in parallel
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono text-xs">
                                                    <span className="px-3 py-1 rounded-full bg-[#4FB3BF]/20 border border-[#4FB3BF]/40 text-[#DDF3F4]">
                                                        Model: FoodNet-3B
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full bg-[#087F8C]/40 border border-[#4FB3BF]/40 text-white">
                                                        Guard: Active
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Scan Viewport Container */}
                                            <div className="my-6 relative rounded-2xl overflow-hidden bg-[#0e272d] border border-[#4FB3BF]/30 p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                                                {/* Moving Scanline */}
                                                <div
                                                    className="absolute left-0 right-0 h-0.5 animate-scanline pointer-events-none"
                                                    style={{
                                                        background: "linear-gradient(90deg, transparent, #4FB3BF, transparent)",
                                                        boxShadow: "0 0 24px 8px rgba(79,179,191,0.7)",
                                                    }}
                                                />
                                                {/* Grid Overlay */}
                                                <div
                                                    className="absolute inset-0 opacity-15 pointer-events-none"
                                                    style={{
                                                        backgroundImage: `
                                                            linear-gradient(rgba(79,179,191,0.4) 1px, transparent 1px),
                                                            linear-gradient(90deg, rgba(79,179,191,0.4) 1px, transparent 1px)`,
                                                        backgroundSize: "32px 32px",
                                                    }}
                                                />
                                                {/* Corner HUD brackets */}
                                                {[
                                                    ["top-2 left-2", "border-t-2 border-l-2"],
                                                    ["top-2 right-2", "border-t-2 border-r-2"],
                                                    ["bottom-2 left-2", "border-b-2 border-l-2"],
                                                    ["bottom-2 right-2", "border-b-2 border-r-2"],
                                                ].map(([pos, bdr], i) => (
                                                    <div key={i} className={`absolute ${pos} w-6 h-6 border-[#4FB3BF] ${bdr}`} />
                                                ))}

                                                <div className="relative z-10 text-5xl mb-4 animate-float">
                                                    🔬
                                                </div>
                                                <p className="text-[#DDF3F4] font-mono text-sm sm:text-base font-bold tracking-wide">
                                                    {SCAN_STEPS[scanStepIndex]}
                                                </p>
                                                <p className="text-slate-300 font-mono text-xs mt-2">
                                                    Evaluating freshness degradation & destination eligibility...
                                                </p>
                                            </div>

                                            {/* Step Progress Checklist */}
                                            <div className="space-y-2.5 pt-2">
                                                {SCAN_STEPS.map((step, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center gap-3 font-mono text-xs transition-all duration-300 ${
                                                            idx <= scanStepIndex ? "opacity-100" : "opacity-40"
                                                        }`}
                                                    >
                                                        <div
                                                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                                                idx < scanStepIndex
                                                                    ? "bg-[#4FB3BF] text-[#173B43] font-bold"
                                                                    : idx === scanStepIndex
                                                                    ? "bg-[#4FB3BF] animate-pulse text-[#173B43] font-bold"
                                                                    : "bg-slate-700 text-slate-400"
                                                            }`}
                                                        >
                                                            {idx < scanStepIndex ? "✓" : "▸"}
                                                        </div>
                                                        <span style={{ color: idx === scanStepIndex ? "#DDF3F4" : "rgba(255,255,255,0.7)" }}>
                                                            {step}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-8 pt-6 border-t border-[#D5E7EA]">
                                            <button
                                                type="button"
                                                onClick={analyzeAllItems}
                                                disabled={analyzing}
                                                className="w-full bg-gradient-to-r from-[#087F8C] to-[#159A9C] hover:from-[#076d78] hover:to-[#087F8C] text-white font-bold py-4 rounded-full text-base sm:text-lg transition-all duration-300 hover:scale-[1.02] shadow-2xl shadow-[#087F8C]/30 disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                <span>🤖</span>
                                                <span>Finish Adding Items & Run AI Analysis on All ({session.items.length})</span>
                                                <span>→</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* STAGE 2: AI ASSESSMENT RESULTS & ROUTE SELECTION */}
                    {/* ---------------------------------------------------- */}
                    {isResultsStage && (
                        <div id="analysis-results-section" className="space-y-8 animate-fadeUp">
                            {/* Summary banner */}
                            <div className="bg-white border border-[#D5E7EA] rounded-3xl shadow-xl p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] text-xs font-mono uppercase tracking-widest mb-2 font-bold">
                                            Neural Vision v2.4 Assessment Complete
                                        </div>
                                        <h2 className="text-3xl font-bold text-[#173B43]" style={{ fontFamily: "Fraunces, serif" }}>
                                            Donation Assessment Results
                                        </h2>
                                    </div>
                                    <span className="px-4 py-1.5 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] text-xs font-mono font-bold">
                                        Session #{session.id.slice(-6)}
                                    </span>
                                </div>

                                <p className="text-[#58747B] text-sm mb-6">
                                    All food items in this session were analyzed together using image segmentation and safety telemetry. Select your desired destination for each item below.
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-2xl bg-[#DDF3F4] border border-[#4FB3BF]/40 text-center">
                                        <div className="text-3xl font-bold text-[#087F8C]" style={{ fontFamily: "Fraunces, serif" }}>{lowCount}</div>
                                        <div className="text-xs font-semibold text-[#087F8C] uppercase tracking-wider mt-1">Low Concern</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                                        <div className="text-3xl font-bold text-amber-600" style={{ fontFamily: "Fraunces, serif" }}>{moderateCount}</div>
                                        <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mt-1">Moderate Concern</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                                        <div className="text-3xl font-bold text-rose-600" style={{ fontFamily: "Fraunces, serif" }}>{highCount}</div>
                                        <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider mt-1">High Concern</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                                        <div className="text-3xl font-bold text-slate-600" style={{ fontFamily: "Fraunces, serif" }}>{manualCount}</div>
                                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mt-1">Manual Verification</div>
                                    </div>
                                </div>
                            </div>

                            {/* Item Assessment Cards */}
                            <div className="space-y-6">
                                {assessedItems.map((item, index) => {
                                    const assessment = item.analysis?.final_assessment;
                                    const routes = normalizeRoutes(item);
                                    const selectedRoute = selectedRoutes[item.id] || "";
                                    const needsValidation = assessment === "moderate_concern" || assessment === "manual_verification";

                                    const goodPct = Number(item.analysis?.good_percentage || 0);
                                    const badPct = Number(item.analysis?.bad_percentage || 0);
                                    const confidence = Number(item.analysis?.food_confidence || 0);

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white border border-[#D5E7EA] rounded-3xl shadow-xl p-6 sm:p-8 relative overflow-hidden"
                                        >
                                            {/* Corner accents */}
                                            {[
                                                ["top-2 left-2", "border-t border-l"],
                                                ["top-2 right-2", "border-t border-r"],
                                                ["bottom-2 left-2", "border-b border-l"],
                                                ["bottom-2 right-2", "border-b border-r"],
                                            ].map(([pos, border], i) => (
                                                <div key={i} className={`absolute ${pos} w-4 h-4 border-[#D5E7EA] ${border}`} />
                                            ))}

                                            {/* Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D5E7EA]">
                                                <div>
                                                    <div className="text-xs font-mono text-[#58747B] mb-1">
                                                        Item #{index + 1} • Quantity: {item.quantity || "MEDIUM"}
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-[#173B43] flex items-center gap-2" style={{ fontFamily: "Fraunces, serif" }}>
                                                        <span>🍲</span>
                                                        <span>{item.analysis?.food_name || "Assessed Food Item"}</span>
                                                    </h3>
                                                    {confidence > 0 && (
                                                        <p className="text-xs text-[#58747B] font-mono mt-1">
                                                            Model Confidence: {confidence.toFixed(1)}%
                                                        </p>
                                                    )}
                                                </div>

                                                <span
                                                    className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider h-fit"
                                                    style={
                                                        assessment === "low_concern"
                                                            ? { background: "#DDF3F4", border: "1px solid #4FB3BF", color: "#087F8C" }
                                                            : assessment === "moderate_concern"
                                                            ? { background: "#fef3c7", border: "1px solid #f59e0b", color: "#b45309" }
                                                            : assessment === "high_concern"
                                                            ? { background: "#fee2e2", border: "1px solid #f87171", color: "#b91c1c" }
                                                            : { background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569" }
                                                    }
                                                >
                                                    {assessmentLabel(assessment)}
                                                </span>
                                            </div>

                                            {/* Visual Assessment & Meters */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                                <div className="bg-[#F2F8FA] border border-[#D5E7EA] rounded-2xl p-5">
                                                    <p className="text-xs font-mono text-[#087F8C] uppercase tracking-wider mb-2 font-bold">
                                                        Visual Assessment
                                                    </p>
                                                    <p className="text-sm text-[#173B43] leading-relaxed font-medium">
                                                        {item.analysis?.visual_assessment || "Standard visual analysis completed."}
                                                    </p>
                                                    <div className="mt-4 pt-4 border-t border-[#D5E7EA] flex items-center justify-between text-xs font-mono text-[#58747B]">
                                                        <span>Animal Feed Status:</span>
                                                        <span className="font-bold text-[#173B43] uppercase">{item.analysis?.animal_feed_status || "N/A"}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-[#F2F8FA] border border-[#D5E7EA] rounded-2xl p-5 flex flex-col justify-center space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-xs font-mono mb-1.5">
                                                            <span className="text-[#087F8C] font-semibold">Fresh / Edible Proportion</span>
                                                            <span className="font-bold text-[#087F8C]">{goodPct.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-[#D5E7EA] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[#087F8C] rounded-full transition-all duration-700"
                                                                style={{ width: `${Math.min(goodPct, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between text-xs font-mono mb-1.5">
                                                            <span className="text-rose-600 font-semibold">Degraded / Spoilage Proportion</span>
                                                            <span className="font-bold text-rose-600">{badPct.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-[#D5E7EA] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-rose-500 rounded-full transition-all duration-700"
                                                                style={{ width: `${Math.min(badPct, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Human validation warning if applicable */}
                                            {needsValidation && (
                                                <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs sm:text-sm text-amber-900 leading-relaxed">
                                                    <span className="text-xl shrink-0">⚠️</span>
                                                    <span>
                                                        <strong>Human Verification Required:</strong> Because this item has a {assessmentLabel(assessment).toLowerCase()} classification, routing to Orphanage will require physical confirmation before receiver allocation.
                                                    </span>
                                                </div>
                                            )}

                                            {/* Route Selection Options */}
                                            <div className="mt-8 pt-6 border-t border-[#D5E7EA]">
                                                <h4 className="text-base font-bold text-[#173B43] mb-4 flex items-center gap-2">
                                                    <span>🎯</span>
                                                    <span>Select Destination for this Food Item:</span>
                                                </h4>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {routes.map((route) => {
                                                        const isSelected = selectedRoute === route;
                                                        return (
                                                            <label
                                                                key={route}
                                                                className="relative flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-300 group"
                                                                style={{
                                                                    background: isSelected ? "#DDF3F4" : "#F2F8FA",
                                                                    borderColor: isSelected ? "#087F8C" : "#D5E7EA",
                                                                    borderWidth: isSelected ? "2px" : "1px",
                                                                }}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`route-${item.id}`}
                                                                    value={route}
                                                                    checked={isSelected}
                                                                    onChange={() => selectRoute(item.id, route)}
                                                                    className="mt-1 accent-[#087F8C]"
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-lg">{routeIcons[route] || "📍"}</span>
                                                                        <strong className="text-[#173B43] text-sm">
                                                                            {routeLabels[route] || route}
                                                                        </strong>
                                                                    </div>
                                                                    <p className="text-xs text-[#58747B] mt-1">
                                                                        {routeDescriptions[route] || "Eligible destination route"}
                                                                    </p>
                                                                    {route === "HUMAN" && needsValidation && (
                                                                        <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-[10px] text-amber-800 font-mono">
                                                                            Verification Required
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        );
                                                    })}

                                                    {/* Do not donate option */}
                                                    <label
                                                        className="relative flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-300"
                                                        style={{
                                                            background: !selectedRoute ? "#fee2e2" : "#F2F8FA",
                                                            borderColor: !selectedRoute ? "#f87171" : "#D5E7EA",
                                                            borderWidth: !selectedRoute ? "2px" : "1px",
                                                        }}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`route-${item.id}`}
                                                            value="DO_NOT_DONATE"
                                                            checked={!selectedRoute}
                                                            onChange={() => declineItem(item.id)}
                                                            className="mt-1 accent-rose-500"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg">🚫</span>
                                                                <strong className="text-[#173B43] text-sm">Do Not Donate</strong>
                                                            </div>
                                                            <p className="text-xs text-rose-700/80 mt-1">
                                                                Keep or dispose locally; do not create receiver allocations
                                                            </p>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Final Confirmation Card */}
                            <div className="bg-white border border-[#D5E7EA] rounded-3xl shadow-xl p-8 text-center">
                                <h3 className="text-2xl font-bold text-[#173B43] mb-2" style={{ fontFamily: "Fraunces, serif" }}>
                                    Finalize & Confirm Donations
                                </h3>
                                <p className="text-[#58747B] text-sm max-w-lg mx-auto mb-6">
                                    You have configured routes for your food items. Once confirmed, eligible donations will be immediately offered to matching receivers.
                                </p>

                                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#DDF3F4] border border-[#D5E7EA] text-[#087F8C] font-mono text-sm mb-6 font-bold">
                                    <span>✨</span>
                                    <span><strong>{selectedCount}</strong> item(s) selected for donation</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={confirmDonations}
                                    disabled={confirming || selectedCount === 0}
                                    className="w-full sm:w-auto px-12 py-4 bg-[#087F8C] hover:bg-[#159A9C] text-white font-bold rounded-full text-base sm:text-lg transition-all duration-300 hover:scale-105 shadow-xl shadow-[#087F8C]/25 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                                >
                                    {confirming ? (
                                        <>
                                            <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                            <span>Submitting Donation Orders...</span>
                                        </>
                                    ) : (
                                        `Confirm Selected Donations (${selectedCount}) →`
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ---------------------------------------------------- */}
                    {/* STAGE 3: CONFIRMED & HUMAN VALIDATION WORKFLOW */}
                    {/* ---------------------------------------------------- */}
                    {confirmedStage && (
                        <div id="confirmation-section" className="space-y-8 animate-fadeUp">
                            {/* Confirmation Banner */}
                            <div className="bg-white border border-[#D5E7EA] rounded-3xl shadow-xl p-8 sm:p-12 text-center">
                                <div className="w-20 h-20 mx-auto rounded-3xl bg-[#DDF3F4] border border-[#D5E7EA] flex items-center justify-center text-4xl mb-6 animate-float">
                                    🎉
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-bold text-[#173B43] mb-3" style={{ fontFamily: "Fraunces, serif" }}>
                                    Donation Session Confirmed!
                                </h2>
                                <p className="text-[#58747B] text-base max-w-xl mx-auto mb-6 leading-relaxed">
                                    Your surplus food items have been successfully submitted to the intelligent recovery loop. Notifications have been dispatched to the matched receivers.
                                </p>
                            </div>

                            {/* Human Validation Needed */}
                            {pendingValidations.length > 0 && (
                                <div className="bg-white border border-amber-200 rounded-3xl shadow-xl p-6 sm:p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl">👨‍🍳</span>
                                        <div>
                                            <h3 className="text-2xl font-bold text-amber-800" style={{ fontFamily: "Fraunces, serif" }}>
                                                Human Food Safety Verification
                                            </h3>
                                            <p className="text-xs text-[#58747B]">
                                                The following items require kitchen staff confirmation before receiver handoff
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mt-6">
                                        {pendingValidations.map((item) => {
                                            const isValidating = validatingDonationId === item.donationId;
                                            const animalAllowed = String(item.animalFeedStatus || "").toUpperCase() === "ALLOWED";
                                            const validationCompleted = item.validationStatus === "COMPLETED";

                                            return (
                                                <div
                                                    key={item.donationId}
                                                    className="bg-[#F2F8FA] border border-amber-200 rounded-2xl p-5"
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                        <div>
                                                            <h4 className="text-lg font-bold text-[#173B43]">{item.food}</h4>
                                                            {item.quantity && (
                                                                <p className="text-xs font-mono text-[#58747B] mt-0.5">
                                                                    Quantity: {item.quantity}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="px-3 py-1 rounded-full text-xs font-mono uppercase bg-amber-100 border border-amber-300 text-amber-800 w-fit font-bold">
                                                            {validationCompleted ? "Validated ✓" : "Pending Check ⏳"}
                                                        </span>
                                                    </div>

                                                    {validationCompleted ? (
                                                        <div className="mt-4 p-3.5 rounded-xl bg-[#DDF3F4] border border-[#4FB3BF]/40 text-xs font-mono text-[#087F8C]">
                                                            ✓ Verified Decision: <strong>{item.validationDecision}</strong>. Receiver allocation is active.
                                                        </div>
                                                    ) : (
                                                        <div className="mt-5 space-y-3">
                                                            <p className="text-xs text-[#173B43] font-semibold uppercase tracking-wider">
                                                                Staff Validation Decision:
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={isValidating}
                                                                    onClick={() => validateDonation(item.donationId, "HUMAN")}
                                                                    className="p-3 rounded-xl bg-white border border-[#D5E7EA] hover:border-[#087F8C] hover:bg-[#DDF3F4] text-left transition-all disabled:opacity-50 shadow-sm"
                                                                >
                                                                    <div className="text-sm font-bold text-[#087F8C]">👨‍👩‍👧 Orphanage</div>
                                                                    <span className="text-[11px] text-[#58747B] block mt-0.5">Approved for human consumption</span>
                                                                </button>

                                                                {animalAllowed && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isValidating}
                                                                        onClick={() => validateDonation(item.donationId, "ANIMAL")}
                                                                        className="p-3 rounded-xl bg-white border border-[#D5E7EA] hover:border-lime-600 hover:bg-lime-50 text-left transition-all disabled:opacity-50 shadow-sm"
                                                                    >
                                                                        <div className="text-sm font-bold text-lime-700">🐄 Animal Farm</div>
                                                                        <span className="text-[11px] text-[#58747B] block mt-0.5">Approved for animal feed</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    disabled={isValidating}
                                                                    onClick={() => validateDonation(item.donationId, "BIOCOMPOST")}
                                                                    className="p-3 rounded-xl bg-white border border-[#D5E7EA] hover:border-amber-600 hover:bg-amber-50 text-left transition-all disabled:opacity-50 shadow-sm"
                                                                >
                                                                    <div className="text-sm font-bold text-amber-700">🌱 Biocompost</div>
                                                                    <span className="text-[11px] text-[#58747B] block mt-0.5">Send to compost / biogas</span>
                                                                </button>
                                                            </div>

                                                            {isValidating && (
                                                                <p className="text-xs text-amber-700 font-mono animate-pulse mt-2">
                                                                    Submitting staff verification...
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Reset / Start another session CTA */}
                            <div className="text-center pt-4">
                                <button
                                    type="button"
                                    onClick={startAnotherDonation}
                                    className="px-10 py-4 bg-[#087F8C] hover:bg-[#159A9C] text-white font-bold rounded-full text-base transition-all duration-300 hover:scale-105 shadow-xl shadow-[#087F8C]/25"
                                >
                                    Log Another Meal Session +
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
