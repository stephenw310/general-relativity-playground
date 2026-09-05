import { SCORE_SRC, scorePosition } from "./flight-score";

export type FlightSeek = { id: number; progress: number };
export type FlightAudioState = {
  progress: number;
  playing: boolean;
  enabled: boolean;
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
  private phase = -1;
  private seekId = -1;
  private enabled = false;

  synchronize(audio: AudioTransport, state: FlightAudioState) {
    if ((!state.enabled || !state.playing) && !audio.paused) audio.pause();
    if (!state.enabled) this.enabled = false;
    if (audio.readyState < 1 || !audio.currentSrc.endsWith(SCORE_SRC)) return;

    if (audio.volume !== 0.45) audio.volume = 0.45;
    if (audio.playbackRate !== 1) audio.playbackRate = 1;
    if (!audio.preservesPitch) audio.preservesPitch = true;

    const requestedSeek = state.seek.id !== this.seekId;
    const { phase, cue, offset } = scorePosition(
      requestedSeek ? state.seek.progress : state.progress,
    );
    if (requestedSeek || (state.enabled && !this.enabled)) {
      const target = cue.start + offset;
      if (Math.abs(audio.currentTime - target) > 0.01)
        audio.currentTime = target;
      this.seekId = state.seek.id;
    } else if (phase !== this.phase) {
      // Fast flights reach the next musical chapter sooner, without speeding
      // up the recording. At 1× the track naturally reaches this boundary.
      if (Math.abs(audio.currentTime - cue.start) > 0.35)
        audio.currentTime = cue.start;
    } else if (
      state.enabled &&
      state.playing &&
      state.progress < 1 &&
      audio.currentTime >= cue.end &&
      offset < cue.end - cue.start - 0.5
    ) {
      // On slow flights, repeat the current mood. The half-second margin
      // lets a normal-speed boundary pass without looping on a delayed frame.
      audio.currentTime = cue.start;
    }
    this.phase = phase;
    this.enabled = state.enabled;

    // Within a chapter, delayed progress renders cannot rewind playback.
    if (
      state.enabled &&
      state.playing &&
      state.progress < 1 &&
      audio.paused &&
      audio.currentTime < cue.end
    )
      return audio.play();
  }
}
