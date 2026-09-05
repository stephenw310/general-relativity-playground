"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  scoreMedia,
  scorePosition,
  scoreProgress,
  scoreTime,
} from "@/utils/flight-score";

type Playback = {
  progress: number;
  playing: boolean;
  speed: number;
  enabled: boolean;
};
type MusicProps = Playback & {
  audioRef: RefObject<HTMLAudioElement | null>;
  onEnabledChange: (enabled: boolean) => void;
  onProgress: (progress: number) => void;
  onPlayingChange: (playing: boolean) => void;
};

export function FlightMusic(props: MusicProps) {
  const {
    progress,
    playing,
    speed,
    enabled,
    audioRef,
    onEnabledChange,
    onProgress,
    onPlayingChange,
  } = props;
  const latest = useRef(props);
  latest.current = props;
  const reported = useRef(Number.NaN);
  const appliedSource = useRef("");
  const [status, setStatus] = useState("Loading music…");
  const media = scoreMedia(speed);
  const { cue } = scorePosition(progress);

  const fail = useCallback(() => {
    setStatus("Music could not play. Click to retry.");
    latest.current.onEnabledChange(false);
  }, []);

  const synchronize = useCallback(
    (state: Playback) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!state.enabled || !state.playing) audio.pause();
      const config = scoreMedia(state.speed);
      // A source change can briefly retain the previous file's metadata.
      if (audio.readyState < 1 || !audio.currentSrc.endsWith(config.src))
        return;
      audio.volume = 0.45;
      audio.playbackRate = config.rate;
      audio.preservesPitch = true;
      if (
        state.progress !== reported.current ||
        appliedSource.current !== config.src
      ) {
        audio.currentTime = scoreTime(state.progress, config.scale);
        reported.current = state.progress;
        appliedSource.current = config.src;
      }
      if (state.enabled && state.playing && state.progress < 1)
        void audio.play().catch((reason: DOMException) => {
          if (reason.name !== "AbortError" && latest.current.enabled) fail();
        });
    },
    [audioRef, fail],
  );

  useEffect(() => {
    synchronize({ progress, playing, speed, enabled });
  }, [progress, playing, speed, enabled, synchronize]);

  useEffect(() => {
    if (!enabled || !playing) return;
    let frame: number;
    const tick = () => {
      const audio = audioRef.current;
      const config = scoreMedia(latest.current.speed);
      if (
        audio &&
        !audio.paused &&
        !audio.seeking &&
        audio.readyState >= 2 &&
        audio.currentSrc.endsWith(config.src)
      ) {
        // Audio is the clock: slow rendering or buffering cannot make it lap the flight.
        const next = scoreProgress(audio.currentTime, config.scale);
        reported.current = next;
        onProgress(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [audioRef, enabled, playing, onProgress]);

  return (
    <div className="descent-music">
      <audio
        ref={audioRef}
        src={media.src}
        preload="auto"
        onLoadedMetadata={() => synchronize(latest.current)}
        onCanPlay={() => {
          setStatus("");
          synchronize(latest.current);
        }}
        onWaiting={() => {
          if (latest.current.enabled) setStatus("Loading music…");
        }}
        onPlaying={() => setStatus("")}
        onError={fail}
        onEnded={() => {
          if (latest.current.enabled) {
            reported.current = 1;
            onProgress(1);
            onPlayingChange(false);
          }
        }}
      >
        <track
          kind="captions"
          src="/audio/descent-score-description.vtt"
          srcLang="en"
          label="Music description"
        />
      </audio>
      <button
        type="button"
        aria-pressed={enabled}
        title={
          status ||
          `Far side of light · ${cue.mood}. Continuous music follows the flight timeline.`
        }
        onClick={() => {
          const next = !enabled;
          setStatus("");
          onEnabledChange(next);
          const audio = audioRef.current;
          if (!audio) return;
          if (!next) audio.pause();
          else {
            if (audio.error) audio.load();
            synchronize({ ...latest.current, enabled: true });
          }
        }}
      >
        {enabled && status === "Loading music…"
          ? status
          : enabled
            ? "Music on"
            : "Music off"}
      </button>
    </div>
  );
}
