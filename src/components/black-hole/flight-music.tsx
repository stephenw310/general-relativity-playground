"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { scoreMedia, scorePosition, scoreProgress } from "@/utils/flight-score";

import {
  FlightAudioSync,
  type FlightAudioState,
} from "@/utils/flight-audio-sync";

type MusicProps = FlightAudioState & {
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
    seek,
    audioRef,
    onEnabledChange,
    onProgress,
    onPlayingChange,
  } = props;
  const latest = useRef(props);
  latest.current = props;
  const [transport] = useState(() => new FlightAudioSync());
  const [status, setStatus] = useState("Loading music…");
  const media = scoreMedia(speed);
  const { cue } = scorePosition(progress);

  const fail = useCallback(() => {
    setStatus("Music could not play. Click to retry.");
    latest.current.onEnabledChange(false);
  }, []);

  const synchronize = useCallback(
    (state: FlightAudioState) => {
      const audio = audioRef.current;
      if (!audio) return;
      void transport
        .synchronize(audio, state)
        ?.catch((reason: DOMException) => {
          if (reason.name !== "AbortError" && latest.current.enabled) fail();
        });
    },
    [audioRef, fail, transport],
  );

  useEffect(() => {
    synchronize({ ...latest.current, playing, speed, enabled, seek });
  }, [playing, speed, enabled, seek, synchronize]);

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
        aria-busy={enabled && status === "Loading music…"}
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
        {enabled ? "Music on" : "Music off"}
      </button>
    </div>
  );
}
