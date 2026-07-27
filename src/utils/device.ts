// SSR-safe check for touch-first devices
export function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

// True on touch-first or narrow-viewport devices, where large panels
// should start collapsed
export function isCompactViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 767px)").matches)
  );
}
