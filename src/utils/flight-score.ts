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

// Browsers may mute media below 0.5x. Pre-stretched files preserve pitch there.
export function scoreMedia(speed: number) {
  const scale = speed === 0.1 || speed === 0.25 ? speed : 1;
  const suffix = speed === 0.1 ? "-tenth" : speed === 0.25 ? "-quarter" : "";
  return {
    src: `/audio/descent-score-native${suffix}.mp3`,
    scale,
    rate: speed / scale,
  };
}

export function scoreTime(progress: number, scale: number) {
  return (Math.max(0, Math.min(1, progress)) * PLAYBACK_DURATION) / scale;
}

export function scoreProgress(time: number, scale: number) {
  return Math.max(0, Math.min(1, (time * scale) / PLAYBACK_DURATION));
}
