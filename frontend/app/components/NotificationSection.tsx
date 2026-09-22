"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { ReceiverType } from "../types";

export type { ReceiverType };

interface NotificationFoodItem {
  donationId: string;
  foodName?: string | null;
  quantity?: string | null;
}

interface NotificationItem {
  id: string;
  recipientId?: string;
  recipientName?: string;
  recipientType?: string;

  // Single-donation notification
  donationId?: string | null;

  // Grouped notification
  donationIds?: string[];

  // Grouped notification items
  items?: NotificationFoodItem[];

  foodName?: string | null;
  quantity?: string | null;

  type?: string;
  title?: string;
  message?: string;
  action?: string | null;
  status?: string;
  expiresAt?: unknown;
  createdAt?: unknown;
}

interface ReceiverItem {
  id: string;
  name: string;
  receiverType?: string;
}

interface ActionState {
  error?: string;
  isAlreadyAccepted?: boolean;
}

interface NotificationSectionProps {
  receiverId?: string;
  receiverType?: ReceiverType;
  theme?: "light" | "compost" | "amber" | "farm";
  className?: string;
}

export default function NotificationSection({
  receiverId: propReceiverId,
  receiverType,
  theme = "light",
  className = "",
}: NotificationSectionProps) {
  const isCompost = theme === "compost";
  const isAmber = theme === "amber";
  const isFarm = theme === "farm";
  const isDark = isCompost || isFarm;

  const [receivers, setReceivers] = useState<ReceiverItem[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>(
    propReceiverId || ""
  );

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Stores the donation currently being accepted
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Stores action state separately for each donation
  const [actionStates, setActionStates] = useState<
    Record<string, ActionState>
  >({});

  // Collapsible history section toggle
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // ------------------------------------------------------------
  // FETCH RECEIVERS (Filtered by receiverType)
  // ------------------------------------------------------------

  const fetchReceivers = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/api/receivers");
      const data = await response.json();

      if (response.ok && Array.isArray(data.receivers)) {
        const allReceivers: ReceiverItem[] = data.receivers;
        const filtered = receiverType
          ? allReceivers.filter((r) => r.receiverType === receiverType)
          : allReceivers;

        setReceivers(filtered);

        setSelectedReceiverId((prev) => {
          if (propReceiverId && filtered.some((r) => r.id === propReceiverId)) {
            return propReceiverId;
          }
          if (prev && filtered.some((r) => r.id === prev)) {
            return prev;
          }
          return filtered.length > 0 ? filtered[0].id : "";
        });
      }
    } catch (error) {
      console.error("Error fetching receivers:", error);
    }
  }, [propReceiverId, receiverType]);

  useEffect(() => {
    fetchReceivers();
  }, [fetchReceivers]);

  // ------------------------------------------------------------
  // SYNC RECEIVER PROP & SELECTION INTEGRITY
  // ------------------------------------------------------------

  useEffect(() => {
    if (propReceiverId) {
      setSelectedReceiverId(propReceiverId);
    }
  }, [propReceiverId]);

  useEffect(() => {
    if (receivers.length > 0) {
      if (!selectedReceiverId || !receivers.some((r) => r.id === selectedReceiverId)) {
        setSelectedReceiverId(receivers[0].id);
      }
    } else {
      setSelectedReceiverId("");
    }
  }, [receivers, selectedReceiverId]);

  // ------------------------------------------------------------
  // FETCH NOTIFICATIONS
  // ------------------------------------------------------------

  const fetchNotifications = useCallback(async () => {
    if (!selectedReceiverId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/${selectedReceiverId}`
      );

      const data = await response.json();

      if (response.ok) {
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : []
        );
      } else {
        console.error("Failed to fetch notifications:", data.message);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedReceiverId]);

  // ------------------------------------------------------------
  // POLLING (5-second interval on valid selected receiver)
  // ------------------------------------------------------------

  useEffect(() => {
    setLoading(true);
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  // ------------------------------------------------------------
  // ACCEPT ONE DONATION
  // ------------------------------------------------------------

  async function handleAccept(
    donationId?: string | null,
    notificationId?: string
  ) {
    if (!donationId || !selectedReceiverId) {
      return;
    }

    const key = donationId;
    setAcceptingId(donationId);

    // Clear previous error
    setActionStates((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        error: undefined,
      },
    }));

    try {
      const response = await fetch(
        `http://localhost:5000/api/allocations/${donationId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            receiverId: selectedReceiverId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Mark this particular donation as accepted
        setActionStates((previous) => ({
          ...previous,
          [key]: {
            isAlreadyAccepted: true,
            error: undefined,
          },
        }));

        // Refresh notifications
        await fetchNotifications();
      } else {
        const errorMsg = String(data.message || "").toLowerCase();

        const isUnavailable =
          errorMsg.includes("not currently offered") ||
          errorMsg.includes("already locked") ||
          errorMsg.includes("already accepted") ||
          errorMsg.includes("expired") ||
          errorMsg.includes("not offered to this receiver") ||
          errorMsg.includes("not found");

        if (isUnavailable) {
          setActionStates((previous) => ({
            ...previous,
            [key]: {
              isAlreadyAccepted: true,
              error: "This donation is no longer available.",
            },
          }));
        } else {
          setActionStates((previous) => ({
            ...previous,
            [key]: {
              isAlreadyAccepted: false,
              error:
                data.message ||
                "Unable to accept this donation. Please try again.",
            },
          }));
        }
      }
    } catch (error) {
      console.error("Error accepting donation:", error);

      setActionStates((previous) => ({
        ...previous,
        [key]: {
          isAlreadyAccepted: false,
          error: "Unable to accept this donation. Please try again.",
        },
      }));
    } finally {
      setAcceptingId(null);
    }
  }

  // ------------------------------------------------------------
  // CURRENT RECEIVER METADATA
  // ------------------------------------------------------------

  const currentReceiver = receivers.find(
    (receiver) => receiver.id === selectedReceiverId
  );

  const emptyReceiverMessage =
    receiverType === "ORPHANAGE"
      ? "No orphanage registered yet. Register above to receive food donation offers."
      : receiverType === "ANIMAL_FARM"
      ? "No animal farm registered yet. Register above to receive feed offers."
      : receiverType === "BIOGAS"
      ? "No biogas facility registered yet. Register above to receive waste allocations."
      : "No registered receivers found.";

  // ------------------------------------------------------------
  // SPLIT NOTIFICATIONS INTO ACTIVE OFFERS VS HISTORY
  // ------------------------------------------------------------

  const { activeNotifications, historyNotifications } = useMemo(() => {
    const active: NotificationItem[] = [];
    const history: NotificationItem[] = [];

    for (const notif of notifications) {
      const isTerminalStatus =
        notif.status === "ACCEPTED" ||
        notif.status === "ACCEPTED_BY_OTHER" ||
        notif.status === "OFFER_EXPIRED" ||
        notif.status === "EXPIRED" ||
        notif.status === "COMPLETED";

      const hasAction = notif.action === "ACCEPT_DONATION";

      // If single donation item is already marked accepted in actionStates
      const singleAccepted =
        notif.donationId && actionStates[notif.donationId]?.isAlreadyAccepted;

      // If grouped donation items are all marked accepted in actionStates
      const groupedItems = Array.isArray(notif.items) ? notif.items : [];
      const allGroupedAccepted =
        groupedItems.length > 0 &&
        groupedItems.every((it) => actionStates[it.donationId]?.isAlreadyAccepted);

      if (hasAction && !isTerminalStatus && !singleAccepted && !allGroupedAccepted) {
        active.push(notif);
      } else {
        history.push(notif);
      }
    }

    return { activeNotifications: active, historyNotifications: history };
  }, [notifications, actionStates]);

  // Helper to extract display items from a notification
  const getDisplayItems = (notification: NotificationItem): NotificationFoodItem[] => {
    if (Array.isArray(notification.items) && notification.items.length > 0) {
      return notification.items;
    }
    if (notification.donationId) {
      return [
        {
          donationId: notification.donationId,
          foodName: notification.foodName || null,
          quantity: notification.quantity || null,
        },
      ];
    }
    return [];
  };

  // ------------------------------------------------------------
  // THEME HELPER CLASSES
  // ------------------------------------------------------------

  const containerClasses = className
    ? className
    : isFarm
    ? "w-full max-w-2xl mt-8 bg-[#1c1917]/95 border border-lime-500/25 rounded-3xl shadow-2xl p-6 sm:p-7 backdrop-blur-md text-white"
    : isAmber
    ? "w-full max-w-2xl mt-8 bg-white border border-[#E9DCCB] rounded-3xl shadow-xl p-6 sm:p-7 text-[#3B2A20]"
    : isCompost
    ? "w-full max-w-2xl mt-8 bg-[#1a0f08]/95 border border-[#a3b18a]/25 rounded-3xl shadow-2xl p-6 sm:p-7 backdrop-blur-md text-white"
    : "w-full max-w-2xl mt-8 bg-white border border-gray-200 rounded-3xl shadow-xl p-6 sm:p-7 text-gray-800";

  const selectBgClasses = isFarm
    ? "bg-[#1c1917] border border-lime-500/30 text-lime-300 focus:ring-lime-400"
    : isAmber
    ? "bg-[#FFF8EC] border border-[#E9DCCB] text-[#3B2A20] focus:ring-[#B86B00]"
    : isCompost
    ? "bg-[#1a0f08] border border-[#a3b18a]/30 text-[#a3b18a] focus:ring-[#a3b18a]"
    : "bg-gray-50 border border-gray-300 text-gray-800 focus:ring-teal-600";

  const acceptBtnClasses = isFarm
    ? "bg-lime-500 hover:bg-lime-400 text-stone-950 shadow-md shadow-lime-500/20"
    : isAmber
    ? "bg-[#B86B00] hover:bg-[#a35e00] text-white shadow-md shadow-[#B86B00]/20"
    : isCompost
    ? "bg-[#a3b18a] hover:bg-[#b5c49c] text-[#1a0f08] shadow-md shadow-[#a3b18a]/20"
    : "bg-[#087F8C] hover:bg-[#159A9C] text-white shadow-md shadow-[#087F8C]/20";

  const activeCardClasses = isFarm
    ? "bg-[#292524]/90 border border-lime-500/25 shadow-md"
    : isAmber
    ? "bg-[#FFF8EC] border border-[#F5B82E]/50 shadow-sm"
    : isCompost
    ? "bg-[#24150d]/90 border border-[#a3b18a]/25 shadow-md"
    : "bg-teal-50/70 border border-teal-200 shadow-sm";

  const historyCardClasses = isFarm
    ? "bg-[#292524]/60 border border-lime-500/15"
    : isAmber
    ? "bg-[#FFF8EC]/60 border border-[#E9DCCB]"
    : isCompost
    ? "bg-[#24150d]/60 border border-[#a3b18a]/15"
    : "bg-gray-50 border border-gray-200";

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <div className={containerClasses}>
      {/* ── Notification Center Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-current/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isFarm ? "bg-lime-400" : isAmber ? "bg-[#B86B00]" : isCompost ? "bg-[#a3b18a]" : "bg-[#087F8C]"
              }`}
            />
            <span
              className={`text-xs font-mono uppercase tracking-wider font-semibold ${
                isFarm ? "text-lime-400" : isAmber ? "text-[#B86B00]" : isCompost ? "text-[#a3b18a]" : "text-[#087F8C]"
              }`}
            >
              Live Notification Center
            </span>
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {isFarm
              ? "Live Animal Feed Stream"
              : isAmber
              ? "Available Meal Allocations"
              : isCompost
              ? "Incoming Waste Stream"
              : "Food Allocation Notifications"}
          </h2>
        </div>

        {/* Receiver Dropdown */}
        {receivers.length > 0 && (
          <div className="min-w-[200px]">
            <select
              value={selectedReceiverId}
              onChange={(event) => {
                setSelectedReceiverId(event.target.value);
                setActionStates({});
              }}
              className={`w-full rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 transition-all ${selectBgClasses}`}
            >
              {receivers.map((receiver) => (
                <option key={receiver.id} value={receiver.id}>
                  {receiver.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Receiver Empty State ── */}
      {receivers.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm italic opacity-75">{emptyReceiverMessage}</p>
        </div>
      ) : !selectedReceiverId ? (
        <div className="py-8 text-center">
          <p className="text-sm opacity-75">Please select a receiver above to view notifications.</p>
        </div>
      ) : loading && notifications.length === 0 ? (
        <div className="py-8 text-center flex items-center justify-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin opacity-60" />
          <span className="text-sm font-medium opacity-75">Loading live food offers...</span>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {/* ==================================================== */}
          {/* SECTION 1: 🔔 ACTIVE FOOD OFFERS */}
          {/* ==================================================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3
                  className={`text-sm font-bold uppercase tracking-wider ${
                    isFarm
                      ? "text-lime-400"
                      : isAmber
                      ? "text-[#B86B00]"
                      : isCompost
                      ? "text-[#a3b18a]"
                      : "text-[#087F8C]"
                  }`}
                >
                  Active Food Offers
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeNotifications.length > 0
                    ? isFarm
                      ? "bg-lime-500/20 text-lime-400 border border-lime-500/30"
                      : isAmber
                      ? "bg-[#FFF0C9] text-[#B86B00] border border-[#E9DCCB]"
                      : isCompost
                      ? "bg-[#a3b18a]/20 text-[#a3b18a] border border-[#a3b18a]/30"
                      : "bg-teal-100 text-[#087F8C] border border-teal-200"
                    : "opacity-60 bg-current/10 text-xs"
                }`}
              >
                {activeNotifications.length} {activeNotifications.length === 1 ? "Offer" : "Offers"}
              </span>
            </div>

            {activeNotifications.length === 0 ? (
              <div
                className={`p-4 rounded-2xl border text-center text-xs sm:text-sm ${
                  isFarm
                    ? "bg-[#292524]/40 border-lime-500/10 text-stone-400"
                    : isAmber
                    ? "bg-[#FFF8EC] border-[#E9DCCB] text-[#765F50]"
                    : isCompost
                    ? "bg-[#24150d]/40 border-[#a3b18a]/10 text-stone-400"
                    : "bg-gray-50 border-gray-200 text-gray-500"
                }`}
              >
                No pending active offers right now. New donations will appear here automatically.
              </div>
            ) : (
              <div className="space-y-3">
                {activeNotifications.map((notif) => {
                  const displayItems = getDisplayItems(notif);
                  const isGrouped = displayItems.length > 1;

                  return (
                    <div
                      key={notif.id}
                      className={`rounded-2xl p-4 sm:p-5 transition-all ${activeCardClasses}`}
                    >
                      {/* Card Title Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{isFarm ? "🌿" : isAmber ? "❤️" : isCompost ? "🌱" : "🍲"}</span>
                          <h4 className="font-bold text-sm sm:text-base">
                            {notif.title || (isFarm ? "Surplus Animal Feed Available" : "Fresh Surplus Food Available")}
                          </h4>
                        </div>
                        {isGrouped && (
                          <span className="px-2 py-0.5 rounded-md bg-current/10 text-[11px] font-mono font-medium">
                            {displayItems.length} items
                          </span>
                        )}
                      </div>

                      {/* Food Items List */}
                      <div className="space-y-2.5">
                        {displayItems.map((item, idx) => {
                          const donationId = item.donationId;
                          const itemState = actionStates[donationId] || {};
                          const isAccepting = acceptingId === donationId;

                          return (
                            <div
                              key={donationId || `${notif.id}-${idx}`}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border ${
                                isFarm
                                  ? "bg-[#1c1917]/70 border-lime-500/15"
                                  : isAmber
                                  ? "bg-white border-[#E9DCCB]"
                                  : isCompost
                                  ? "bg-[#1a0f08]/70 border-[#a3b18a]/15"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl shrink-0">🍱</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">
                                      {item.foodName || "Food Item"}
                                    </span>
                                    {item.quantity && (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                                          isFarm
                                            ? "bg-lime-500/15 text-lime-400"
                                            : isAmber
                                            ? "bg-[#FFF0C9] text-[#B86B00]"
                                            : isCompost
                                            ? "bg-[#a3b18a]/15 text-[#a3b18a]"
                                            : "bg-teal-50 text-[#087F8C]"
                                        }`}
                                      >
                                        {item.quantity} QTY
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] opacity-70 mt-0.5">
                                    Ready for pickup • Inspected safe
                                  </p>
                                </div>
                              </div>

                              {/* Accept Button / Action State */}
                              <div className="flex flex-col items-end shrink-0">
                                {itemState.isAlreadyAccepted ? (
                                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    ✓ Accepted
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAccept(donationId, notif.id)}
                                    disabled={isAccepting}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${acceptBtnClasses}`}
                                  >
                                    {isAccepting ? (
                                      <>
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                        <span>Accepting...</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>Accept Offer</span>
                                        <span>{isFarm ? "🌿" : isAmber ? "❤️" : isCompost ? "🌱" : "✓"}</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {itemState.error && (
                                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                                    {itemState.error}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {notif.message && (
                        <p className="mt-3 text-xs opacity-75 leading-relaxed">
                          {notif.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SECTION 2: 📋 NOTIFICATION HISTORY */}
          {/* ==================================================== */}
          <div className="pt-3 border-t border-current/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-80">
                  Notification History
                </h3>
                <span className="text-xs font-mono opacity-60">
                  ({historyNotifications.length})
                </span>
              </div>

              {historyNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory((prev) => !prev)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                    isFarm
                      ? "border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
                      : isAmber
                      ? "border-[#E9DCCB] text-[#B86B00] hover:bg-[#FFF0C9]"
                      : isCompost
                      ? "border-[#a3b18a]/30 text-[#a3b18a] hover:bg-[#a3b18a]/10"
                      : "border-gray-300 text-[#087F8C] hover:bg-gray-100"
                  }`}
                >
                  {showHistory ? "Hide History ▲" : `View History (${historyNotifications.length}) ▼`}
                </button>
              )}
            </div>

            {/* Collapsible History Panel with scroll limit */}
            {showHistory && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {historyNotifications.length === 0 ? (
                  <p className="text-xs italic opacity-60 py-2">No past notification history.</p>
                ) : (
                  historyNotifications.map((notif) => {
                    const displayItems = getDisplayItems(notif);
                    const isAcceptedByYou = notif.status === "ACCEPTED";
                    const isAcceptedByOther = notif.status === "ACCEPTED_BY_OTHER";
                    const isExpired =
                      notif.status === "OFFER_EXPIRED" || notif.status === "EXPIRED";

                    return (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl text-xs transition-all ${historyCardClasses}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold">
                                {notif.title || "Notification"}
                              </span>
                              {displayItems.length > 0 && (
                                <span className="opacity-75 font-mono">
                                  ({displayItems.map((i) => i.foodName || "Food").join(", ")})
                                </span>
                              )}
                            </div>
                            {notif.message && (
                              <p className="opacity-70 text-[11px] line-clamp-2">
                                {notif.message}
                              </p>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {isAcceptedByYou ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 font-semibold font-mono text-[10px]">
                                ✓ Accepted
                              </span>
                            ) : isAcceptedByOther ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-500 font-semibold font-mono text-[10px]">
                                🔒 Taken by other
                              </span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 font-semibold font-mono text-[10px]">
                                ⏰ Expired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-current/10 opacity-75 font-mono text-[10px]">
                                ℹ️ {notif.status || "Updated"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}