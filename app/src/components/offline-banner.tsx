"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { getAvailableFeatures, getUnavailableFeatures, getLimitedFeatures } from "@/lib/offline";

// ---------- useOnlineStatus Hook ----------

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------- Offline Banner ----------

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showDetails, setShowDetails] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && !justReconnected) {
      // Show "back online" briefly
      setJustReconnected(true);
      const timer = setTimeout(() => setJustReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
    if (!isOnline) {
      setJustReconnected(false);
    }
  }, [isOnline]);

  // Show reconnected toast briefly
  if (isOnline && justReconnected) {
    return (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg text-sm font-medium"
        data-testid="reconnected-banner"
      >
        <span className="material-icons text-sm">wifi</span>
        Back online — syncing progress...
      </div>
    );
  }

  // Don't show anything when online
  if (isOnline) return null;

  return (
    <div data-testid="offline-banner">
      {/* Main banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="material-icons text-sm">wifi_off</span>
            You&apos;re offline — Progress will sync when reconnected
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs underline underline-offset-2 hover:no-underline"
            data-testid="show-details-btn"
          >
            {showDetails ? "Hide details" : "What works offline?"}
          </button>
        </div>

        {/* Details panel */}
        {showDetails && (
          <div className="border-t border-amber-400 bg-amber-600" data-testid="offline-details">
            <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Available */}
              <div>
                <h3 className="font-bold text-amber-100 mb-2 flex items-center gap-1">
                  <span className="material-icons text-xs">check_circle</span>
                  Available
                </h3>
                <ul className="space-y-1">
                  {getAvailableFeatures().map((f) => (
                    <li key={f.name} className="text-amber-100/90">{f.name}</li>
                  ))}
                </ul>
              </div>

              {/* Limited */}
              <div>
                <h3 className="font-bold text-amber-100 mb-2 flex items-center gap-1">
                  <span className="material-icons text-xs">warning</span>
                  Limited
                </h3>
                <ul className="space-y-1">
                  {getLimitedFeatures().map((f) => (
                    <li key={f.name} className="text-amber-100/90">{f.name}</li>
                  ))}
                </ul>
              </div>

              {/* Unavailable */}
              <div>
                <h3 className="font-bold text-amber-100 mb-2 flex items-center gap-1">
                  <span className="material-icons text-xs">block</span>
                  Unavailable
                </h3>
                <ul className="space-y-1">
                  {getUnavailableFeatures().map((f) => (
                    <li key={f.name} className="text-amber-100/90">{f.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
