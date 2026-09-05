import { scoreMedia, scoreTime } from "./flight-score";

export type FlightSeek = { id: number; progress: number };
export type FlightAudioState = {
  progress: number;
  playing: boolean;
  enabled: boolean;
  speed: number;
  seek: FlightSeek;
};

type AudioTransport = Pick<
  HTMLAudioElement,
  | "currentTime"
  | "currentSrc"
  | "readyState"
  | "paused"
  | "volume"
  | "playbackRate"
  | "preservesPitch"
  | "play"
  | "pause"
>;

export class FlightAudioSync {
  private source = "";
  private seekId = -1;
  private enabled = false;

  synchronize(audio: AudioTransport, state: FlightAudioState) {
    if ((!state.enabled || !state.playing) && !audio.paused) audio.pause();
    if (!state.enabled) this.enabled = false;
    const config = scoreMedia(state.speed);
    // Old metadata can remain visible while a new speed's file is loading.
    if (audio.readyState < 1 || !audio.currentSrc.endsWith(config.src)) return;

    if (audio.volume !== 0.45) audio.volume = 0.45;
    if (audio.playbackRate !== config.rate) audio.playbackRate = config.rate;
    if (!audio.preservesPitch) audio.preservesPitch = true;

    const requestedSeek = state.seek.id !== this.seekId;
    if (
      requestedSeek ||
      this.source !== config.src ||
      (state.enabled && !this.enabled)
    ) {
      const target = scoreTime(
        requestedSeek ? state.seek.progress : state.progress,
        config.scale,
      );
      if (Math.abs(audio.currentTime - target) > 0.01)
        audio.currentTime = target;
      this.seekId = state.seek.id;
      this.source = config.src;
    }
    this.enabled = state.enabled;

    // Progress rendered by React is an observation, never a seek command.
    // In particular, a delayed commit or canplay event cannot rewind playback.
    if (state.enabled && state.playing && state.progress < 1 && audio.paused)
      return audio.play();
  }
}
