"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(
      window.location.hostname,
    );
    if (!window.isSecureContext && !isLocalhost) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration is best effort; the app remains fully usable without it.
    });
  }, []);

  return null;
}
