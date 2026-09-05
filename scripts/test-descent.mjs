import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

// Compile the actual browser physics helpers without a browser or test framework.
const dir = mkdtempSync(join(tmpdir(), "descent-physics-"));
try {
  for (const name of [
    "descent-physics",
    "descent-planet",
    "descent-planet-aims",
    "descent-planet-trace",
    "flight-score",
    "flight-audio-sync",
  ]) {
    const source = readFileSync(
      new URL(`../src/utils/${name}.ts`, import.meta.url),
      "utf8",
    );
    writeFileSync(
      join(dir, `${name}.js`),
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText,
    );
  }
  const require = createRequire(import.meta.url);
  const physics = require(join(dir, "descent-physics.js"));
  const { planetView } = require(join(dir, "descent-planet.js"));
  const {
    scorePosition,
    SCORE_CUES,
    scoreMedia,
    scoreTime,
    scoreProgress,
  } = require(join(dir, "flight-score.js"));
  const plan = JSON.parse(
    readFileSync(new URL("./descent-music-plan.json", import.meta.url), "utf8"),
  );
  for (const [index, cue] of SCORE_CUES.entries()) {
    assert.equal(
      plan.composition_plan.sections[index].duration_ms / 1000,
      cue.end - cue.start,
    );
    assert.equal(
      scorePosition(cue.start / physics.PLAYBACK_DURATION).phase,
      index,
    );
    if (index > 0)
      assert.equal(
        scorePosition((cue.start - 0.001) / physics.PLAYBACK_DURATION).phase,
        index - 1,
      );
  }
  // Each speed must map to the appropriate musical section.
  for (const speed of [0.1, 0.25, 0.5, 1, 2, 4]) {
    for (let wallTime = 0; wallTime <= 190 / speed; wallTime += 0.37) {
      const p = (wallTime * speed) / 190;
      const { cue, offset } = scorePosition(p);
      assert.ok(offset >= 0 && offset < cue.end - cue.start);
      assert.ok(p * 190 >= cue.start - 1e-8 && p * 190 <= cue.end + 1e-8);
    }
  }
  assert.equal(scorePosition(physics.progressAt(1)).phase, 1);
  assert.equal(scorePosition(physics.progressAt(0.35)).phase, 2);
  assert.equal(scorePosition(physics.progressAt(0.06)).phase, 3);
  assert.equal(scorePosition(0).offset, 0);
  assert.equal(scorePosition(1).phase, 3);
  for (const speed of [0.1, 0.25, 0.5, 1, 2, 4]) {
    const media = scoreMedia(speed);
    assert.ok(media.rate >= 0.5 && media.rate <= 4);
    for (const p of [0, 100 / 190, 135 / 190, 170 / 190, 0.999, 1]) {
      assert.ok(
        Math.abs(scoreProgress(scoreTime(p, media.scale), media.scale) - p) <
          1e-9,
      );
    }
    assert.ok(
      Math.abs(scoreProgress(media.rate * 5, media.scale) - (speed * 5) / 190) <
        1e-9,
    );
  }

  console.log(
    "PASS: score sections match generation plan, all six flight speeds, horizon/tidal transitions, seeks and reset.",
  );

  const { FlightAudioSync } = require(join(dir, "flight-audio-sync.js"));
  const transport = new FlightAudioSync();
  const seeks = [];
  let time = 0,
    playCalls = 0;
  const audio = {
    currentSrc: `http://localhost${scoreMedia(1).src}`,
    readyState: 4,
    paused: true,
    volume: 1,
    playbackRate: 1,
    preservesPitch: false,
    get currentTime() {
      return time;
    },
    set currentTime(value) {
      seeks.push(value);
      time = value;
    },
    play() {
      playCalls++;
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };
  let playback = {
    progress: 0,
    playing: true,
    enabled: true,
    speed: 1,
    seek: { id: 0, progress: 0 },
  };
  transport.synchronize(audio, playback);
  assert.equal(playCalls, 1);
  // Heavy 3D work can delay a React commit behind the media clock. Even a
  // canplay event delivered with that stale snapshot must not rewind the music.
  for (let frame = 1; frame <= 300; frame++) {
    time = frame / 30;
    playback = { ...playback, progress: Math.max(0, time - 0.2) / 190 };
    transport.synchronize(audio, playback);
  }
  assert.equal(seeks.length, 0, "Delayed telemetry must never seek the audio");
  assert.equal(
    playCalls,
    1,
    "Playing media must not receive repeated play requests",
  );
  assert.equal(time, 10);
  transport.synchronize(audio, { ...playback, playing: false });
  assert.equal(audio.paused, true);
  transport.synchronize(audio, playback);
  assert.equal(
    seeks.length,
    0,
    "Resume must preserve the actual paused media position",
  );
  assert.equal(playCalls, 2);
  // An explicit jump applies exactly once despite repeated readiness events.
  playback = {
    ...playback,
    playing: false,
    progress: 100 / 190,
    seek: { id: 1, progress: 100 / 190 },
  };
  transport.synchronize(audio, playback);
  for (let i = 0; i < 20; i++) transport.synchronize(audio, playback);
  assert.deepEqual(seeks, [100]);
  // Retiming the same file changes rate, not position.
  playback = { ...playback, speed: 2 };
  transport.synchronize(audio, playback);
  assert.equal(audio.playbackRate, 2);
  assert.deepEqual(seeks, [100]);
  // Keep a reset pending until the newly selected file has its own metadata.
  playback = {
    ...playback,
    speed: 0.25,
    progress: 0,
    seek: { id: 2, progress: 0 },
  };
  transport.synchronize(audio, playback);
  assert.deepEqual(seeks, [100]);
  audio.currentSrc = `http://localhost${scoreMedia(0.25).src}`;
  audio.readyState = 0;
  transport.synchronize(audio, playback);
  assert.deepEqual(seeks, [100]);
  audio.readyState = 4;
  transport.synchronize(audio, playback);
  assert.deepEqual(seeks, [100, 0]);
  assert.equal(audio.playbackRate, 1);
  // While muted, the manual flight clock advances. Unmuting catches up once.
  playback = { ...playback, enabled: false };
  transport.synchronize(audio, playback);
  playback = { ...playback, progress: 0.5 };
  transport.synchronize(audio, playback);
  assert.deepEqual(seeks, [100, 0]);
  playback = { ...playback, enabled: true };
  transport.synchronize(audio, playback);
  transport.synchronize(audio, playback);
  assert.deepEqual(seeks, [100, 0, 380]);
  console.log(
    "PASS: delayed renders and repeated canplay events never rewind audio; pause, resume, explicit seeks, source changes, and unmuting remain synchronized.",
  );

  const {
    radiusAt,
    progressAt,
    properTimeAt,
    remainingProperTime,
    tidalAcceleration,
    FLIGHT_CHAPTERS,
    START_RADIUS,
    END_RADIUS,
    stageAt,
  } = physics;
  const close = (a, b, tolerance = 1e-9) =>
    assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
  close(radiusAt(0), START_RADIUS);
  close(radiusAt(1), END_RADIUS);
  close(radiusAt(-1), START_RADIUS);
  close(radiusAt(2), END_RADIUS);
  let previous = START_RADIUS;
  const totalTime = remainingProperTime(START_RADIUS);
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000,
      radius = radiusAt(p);
    assert.ok(radius <= previous);
    previous = radius;
    close(progressAt(radius), p);
    // Proper time elapsed + time remaining is conserved through every chapter.
    close(properTimeAt(radius) + remainingProperTime(radius), totalTime);
    // Radial geodesic-deviation acceleration across 2 m scales as 8/(9*tau^2).
    close(tidalAcceleration(radius) * remainingProperTime(radius) ** 2, 8 / 9);
  }
  for (const chapter of FLIGHT_CHAPTERS) {
    const p = progressAt(chapter.end);
    close(radiusAt(p), chapter.end);
    if (p < 1)
      assert.ok(Math.abs(radiusAt(p - 1e-9) - radiusAt(p + 1e-9)) < 1e-6);
    assert.equal(stageAt(radiusAt(p)), stageAt(chapter.end));
  }
  assert.ok(remainingProperTime(1) > 28 && remainingProperTime(1) < 29);
  assert.ok(remainingProperTime(END_RADIUS) < 0.06);
  assert.ok(tidalAcceleration(END_RADIUS) > 300);
  assert.equal(stageAt(END_RADIUS), "Tidal limit reached");
  for (const radius of [6, 1.001, 1, 0.999, 0.35, 0.06, END_RADIUS]) {
    const view = planetView(radius);
    assert.ok(Number.isFinite(view.yaw) && Number.isFinite(view.pitch));
    assert.ok(Math.abs(view.pitch) < Math.PI / 2);
  }
  const { tracePlanetView } = require(join(dir, "descent-planet-trace.js"));
  let maxAimError = 0;
  // Sample between table entries, so this checks interpolation against actual rays.
  for (let i = 0; i < 512; i++) {
    const radius =
      START_RADIUS * (END_RADIUS / START_RADIUS) ** ((i + 0.5) / 512);
    const interpolated = planetView(radius);
    const traced = tracePlanetView(radius);
    const yawError = Math.atan2(
      Math.sin(interpolated.yaw - traced.yaw),
      Math.cos(interpolated.yaw - traced.yaw),
    );
    maxAimError = Math.max(
      maxAimError,
      Math.hypot(yawError, interpolated.pitch - traced.pitch),
    );
  }
  assert.ok(
    maxAimError < 0.001,
    `Planet interpolation error: ${maxAimError} radians`,
  );
  console.log(
    `PASS: 512 interpolated aims within ${((maxAimError * 180) / Math.PI).toFixed(4)} degrees of the ray solver.`,
  );
  const started = performance.now();
  let checksum = 0;
  for (let i = 0; i < 100000; i++)
    checksum += planetView(radiusAt(i / 99999)).yaw;
  assert.ok(Number.isFinite(checksum));
  console.log(
    `Planet tracking: 100,000 frame lookups in ${(performance.now() - started).toFixed(1)} ms.`,
  );
  console.log(
    "PASS: 1,001 trajectory samples, continuous chapter boundaries, conserved proper time, tidal scaling, finite horizon crossing, endpoint and planet aiming.",
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
