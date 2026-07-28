import { useSyncExternalStore } from "react";

// SSR-safe check for touch-first devices
export function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

const COMPACT_QUERY = "(pointer: coarse), (max-width: 767px)";

function subscribeToCompactViewport(callback: () => void): () => void {
  const mql = window.matchMedia(COMPACT_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

// True on touch-first or narrow-viewport devices, where large panels should
// start collapsed. Server snapshot is false; the client value settles right
// after hydration without a mismatch.
export function useIsCompactViewport(): boolean {
  return useSyncExternalStore(
    subscribeToCompactViewport,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
}
