"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { SCORE_SRC, scorePosition } from "@/utils/flight-score";

import {
  FlightAudioSync,
  type FlightAudioState,
} from "@/utils/flight-audio-sync";

type MusicProps = FlightAudioState & {
  audioRef: RefObject<HTMLAudioElement | null>;
  onEnabledChange: (enabled: boolean) => void;
};

export function FlightMusic(props: MusicProps) {
  const { progress, playing, enabled, seek, audioRef, onEnabledChange } = props;
  const latest = useRef(props);
  latest.current = props;
  const [transport] = useState(() => new FlightAudioSync());
  const [status, setStatus] = useState("Loading music…");
  const { phase, cue } = scorePosition(progress);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Chapter changes trigger sync; progress is read from the ref to avoid per-frame seeks.
  useEffect(() => {
    // Only user commands and chapter changes affect the transport. Flight
    // telemetry never seeks the music frame by frame.
    synchronize({ ...latest.current, playing, enabled, seek });
  }, [playing, enabled, seek, phase, synchronize]);

  return (
    <div className="descent-music">
      <audio
        ref={audioRef}
        src={SCORE_SRC}
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
        onTimeUpdate={() => synchronize(latest.current)}
        onEnded={() => synchronize(latest.current)}
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
          `Far side of light · ${cue.mood}. Music stays at its original tempo and follows each flight stage.`
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
