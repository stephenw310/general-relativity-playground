import { FLIGHT_CHAPTERS, PLAYBACK_DURATION } from "./descent-physics";

const moods = [
  "Wonder and anticipation",
  "Dark and solemn",
  "Mounting tension",
  "Final crescendo",
];
let cursor = 0;
export const SCORE_CUES = FLIGHT_CHAPTERS.map((chapter, index) => {
  const start = cursor;
  cursor += chapter.seconds;
  return { start, end: cursor, mood: moods[index], label: chapter.label };
});

export function scorePosition(progress: number) {
  const seconds = Math.max(0, Math.min(1, progress)) * PLAYBACK_DURATION;
  const index = SCORE_CUES.findIndex((cue) => seconds < cue.end);
  const phase = index < 0 ? SCORE_CUES.length - 1 : index;
  const cue = SCORE_CUES[phase];
  return {
    phase,
    cue,
    offset: Math.min(seconds - cue.start, cue.end - cue.start - 0.05),
  };
}

// All flight speeds use the original recording at its native tempo.
export const SCORE_SRC = "/audio/descent-score-native.mp3";
