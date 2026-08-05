# Iteration spec — missions 04–06 on top of PR #15

**Base:** PR #15 (`agent/universe-lab-simulations`). Decision: keep the PR's physics
engine and Canvas-2D approach — all items below are iterations on its components,
not rewrites. Visual references live in `mockups/iterations/*.html`; each flag
badge there (T1, G2, W3…) matches an item ID here.

**Files touched most:**

- `src/components/time-dilation-simulation.tsx`
- `src/components/geodesics-simulation.tsx`
- `src/components/gravitational-waves-simulation.tsx`
- `src/utils/relativity-calculations.ts` (new helpers only; existing functions are correct — don't rework them)

**Priorities:** P0 = the missing signature moments, do first. P1 = strong
follow-ups. P2 = polish / nice-to-have. Sizes: S < ½ day, M ≈ 1 day, L = 2–3 days.

| ID | Item | Priority | Size |
|----|------|----------|------|
| W1 | Chirp timeline: release → inspiral → merger → ringdown | P0 | L |
| W2 | Chirp audio | P0 | M |
| T1 | Proper-time ledger + "Run 10 years" | P0 | M |
| G1 | Newtonian ghost orbit | P0 | S |
| G2 | Periapsis-advance readout | P0 | S |
| W3 | Detector test-mass ring | P1 | M |
| W4 | Spiral wavefield (replace concentric rings) | P1 | S–M |
| T2 | Real-world presets: GPS · ISS · Miller's planet | P1 | M |
| T3 | Per-clock worldline modes (enables T2) | P1 | S–M |
| G3 | Persistent trail gallery | P1 | S |
| X1 | Landing thumbnails for missions 04–06 | P1 | S |
| G4 | Effective-potential inset with live marker | P2 | M |
| T4 | Drag clocks directly on the canvas | P2 | S–M |
| W5 | Real GW150914 data ghost trace | P2 | M |

---

## Mission 06 — Gravitational Waves (largest gap)

### W1 · Chirp timeline with merger and ringdown — P0, L

**Now:** `BinaryWaveField` loops an 18 s Peters inspiral (`progress = (t % 18)/18`)
that silently resets; the h₊/h× plot is a rolling instantaneous window. There is
no merger event and no ringdown, and the loop restart is jarring.

**Change to a one-shot playback with a full timeline:**

1. Precompute the whole signal once per parameter change (not per frame), e.g.
   `buildInspiralWaveform(m1, m2, a0, distanceMpc, inclinationDeg)` in
   `relativity-calculations.ts` returning `{ t[], hPlus[], hCross[], fGW[], mergerIndex }`.
   - Inspiral: existing `inspiralSeparation` + `getBinaryParameters` per sample.
     For GW150914 defaults (36+29 M☉, a₀ = 14 GM/c²) Peters gives ≈ 0.97 s to
     merger — play it back slowed ~10× (≈ 10 s), with time compression so the
     final 0.1 s occupies the last ~3 s of playback.
   - Stop the inspiral at a ≈ 3 GM/c² (near merger), cap amplitude smoothly.
   - Ringdown: damped sinusoid appended at merger, anchored to GW150914:
     `f_RD ≈ 250 Hz × (62 M☉ / M_final)`, decay `τ ≈ 4 ms × (M_final / 62 M☉)`,
     amplitude matched continuously at the merger sample. `M_final ≈ 0.954 × (m1+m2)`
     (≈ 4.6 % radiated — show "≈ 3.0 M☉c² radiated" on the GW150914 preset).
2. Replace the "Animate Peters inspiral" switch with playback state:
   `idle → running → ringdown → done`, a primary **Release the binary** button,
   and **Replay**. Scene syncs to the playhead: separation shrinks, bodies merge
   into one remnant with a brief flash, remnant label shows M_final.
3. Replace the rolling plot with the full precomputed timeline strip: waveform,
   dashed merger marker, phase labels (inspiral · f_start / merger · f_peak /
   ringdown), and a playhead cursor that sweeps during playback.

**Accept when:** GW150914 preset sweeps roughly 20 → 250 Hz on the readout during
playback; waveform amplitude and frequency are continuous through merger;
ringdown decays below 5 % within ~20 ms of scaled time; no automatic loop —
replay is explicit; parameter changes while idle rebuild the timeline instantly.

### W2 · Chirp audio — P0, M

**Now:** no sound. This is the topic's single best hook — the band is audible.

**Change:** synthesize audio from the same precomputed arrays as W1 (do not
re-derive): render an `AudioBuffer` whose instantaneous frequency follows
`fGW[]` (pitch-shifted ×2 so 20→250 Hz plays as 40→500 Hz — label it "pitch ×2")
and whose gain follows the amplitude envelope, ringdown included. Play it
synchronized with **Release the binary**; add a "Chirp audio" switch (default on,
but sound only ever starts from the user's click — browser gesture rules and
`prefers-reduced-motion` users get no autoplay). Keep the buffer < 1 s of
compute; rebuild alongside W1's arrays.

**Accept when:** releasing the binary plays a rising chirp ending in a thud/ring
matched to the visual merger within ~50 ms; toggling the switch mid-run mutes
cleanly; no audio before first user gesture.

### W3 · Detector test-mass ring — P1, M

**Now:** polarizations exist only as the h₊/h× traces; nothing shows what strain
*does*.

**Change:** an inset (place left of the timeline strip, per mock) with ~16 test
masses on a circle, displaced each frame by the wave at the playhead:
`δx = E·(hPlus·x + hCross·y)/2`, `δy = E·(hCross·x − hPlus·y)/2` with
exaggeration `E` chosen so peak distortion ≈ 15 % of the ring radius (label
"exaggerated ×10²⁰"). Use the inclination-projected h₊/h× the plot already
computes. When idle, animate at the current steady f_GW.

**Accept when:** face-on inclination (0°) shows circular ⟷ (+ then ×) breathing;
edge-on (90°) shows pure + stretching along one axis; the ring visibly chirps
faster and harder as merger approaches.

### W4 · Spiral wavefield — P1, S–M

**Now:** concentric circles emanate from the center (the ring loop around lines
110–123 of `BinaryWaveField`). The true quadrupole pattern is a two-armed spiral
locked to the orbit.

**Change:** replace the ring loop with two Archimedean spiral arms (offset by π),
`r(θ) = r0 + (λ_vis/2π)·θ` over ~3 turns, rotated rigidly by the orbital phase
`phase` the component already tracks, alpha fading with radius. Tie
`λ_vis ∝ 1/f_GW` so the pattern visibly tightens as the inspiral proceeds — the
chirp becomes visible in space, not just on the plot.

**Accept when:** arms rotate at the orbital rate, crest spacing shrinks during
inspiral, and the pattern collapses/fades through merger into stillness around
the remnant.

### W5 · Real GW150914 strain ghost — P2, M

Embed a downsampled public LIGO H1 strain array (few KB) and draw it dim behind
the model timeline when the GW150914 preset is active, with a one-line credit.
Parked until W1 lands.

---

## Mission 04 — Time Dilation

### T1 · Proper-time ledger + "Run 10 years" — P0, M

**Now:** rates are instantaneous (`nearRate`, `farRate`, lag/day). The memorable
takeaway — accumulated aging — never appears.

**Change:** add a ledger inset (bottom-left, per mock): rows for the near and
reference clocks, each with an aging bar and total, against a far-time header.
A primary **Run 10 years of far time** button in the controls fast-forwards
(≈ 2 s animation): `τ_clock = rate_clock × 10 yr`. Totals persist and accumulate
across runs; **Reset parameters** also clears the ledger. Announce updates via
`aria-live="polite"`.

**Accept when:** at PR defaults (near static 2.2 rₛ → 0.73855, reference 20 rₛ →
0.97468), one run shows near 7.39 yr / reference 9.75 yr / far 10.00 yr; a second
run doubles all three; switching the near clock to orbit mode changes its slope
on the next run.

### T3 · Per-clock worldline modes — P1, S–M (prerequisite for T2)

**Now:** a single `mode` applies static/orbit to the near clock only; the
reference clock is always static. GPS/ISS can't be expressed (the *outer* clock
is the orbiting one).

**Change:** give each clock its own `static | orbit` mode (two small segmented
controls in "Clock positions"; canvas already animates an orbiting clock — reuse
for either). Keep the r ≥ 3 rₛ clamp for orbit mode per clock. `relativeRate`
becomes `rate(near) / rate(reference)` with each clock's own formula.

**Accept when:** reference-in-orbit configurations compute with
`circularOrbitClockRate` and the orbiting clock visibly circles; existing
behavior unchanged for static reference.

### T2 · Real-world presets: GPS · ISS · Miller's planet — P1, M

**Now:** mass presets are all black holes; nothing anchors the effect to
measured reality.

**Change:** add a "Reality checks" preset row that sets mass, radii, and
per-clock modes (needs T3):

- **GPS · +38 μs/day** — M = 3.003×10⁻⁶ M☉ (Earth, rₛ = 8.87 mm); near = ground,
  static at r = 6,371 km; reference = satellite, orbit at r = 26,561 km. The
  existing exact functions handle this in doubles: rate difference ≈ +4.45×10⁻¹⁰
  → **+38.5 μs/day** (satellite ages faster — gravity beats speed).
- **ISS · −27 μs/day** — same Earth; reference = orbit at r = 6,791 km → net
  ≈ −27 μs/day (speed beats gravity). Accept anywhere in −25…−28.
- **Miller's planet · 1 h = 7 yr** — cinematic preset: rate 1/61,362 via static
  depth 1 − rₛ/r = 2.66×10⁻¹⁰. Label it "as filmed (Kerr in the movie; shown as
  extreme static depth)".

Supporting change: the lag readout must format adaptively (s → ms → μs → ns) —
`20932 s` and `38.5 μs` should both read naturally. Scene note: at r/rₛ ~ 10⁹ the
rings/horizon collapse visually — acceptable; presets may pin the far radius
used for the radial scale.

**Accept when:** GPS shows +38.5 μs/day within ±0.5; ISS negative in range;
Miller shows dτ/dt ≈ 1.63×10⁻⁵ and copy "1 hour here = 7 years far away";
switching back to a black-hole preset restores rₛ-scale behavior.

### T4 · Drag clocks on the canvas — P2, S–M

Pointer hit-test on either clock (≈ 30 px), radial drag maps to that clock's
radius state (respecting its mode's minimum); sliders stay as the precise/
accessible path. Cursor affordance on hover.

---

## Mission 05 — Geodesics (smallest gap)

### G1 · Newtonian ghost orbit — P0, S

**Now:** massive-body mode shows the GR rosette alone; nothing says what's *new*
about it.

**Change:** in massive mode draw the closed Kepler ellipse for the same Darwin
parameters behind the trail, dashed grey: `r(φ) = p / (2(1+e·cos φ))` in rₛ units
(same periapsis/apoapsis as the GR orbit by construction), plus a small legend
("Newtonian prediction"). Toggle "Newtonian ghost", default on.

**Accept when:** ghost and GR trail touch at the same periapsis/apoapsis radii
and visibly separate over successive orbits.

### G2 · Periapsis-advance readout — P0, S

**Now:** `traceTimelikeGeodesic` already returns `precessionDegrees` — it's never
shown.

**Change:** in massive mode, show it in the summary strip: `+114.2° / orbit`
style, replacing "closest radius" or alongside it. One sentence in the notes tying
it to Mercury's 43″/century (same physics, weak-field limit).

**Accept when:** the number grows as p approaches the stable boundary
(p → 6+2e) and shrinks toward zero for large p.

### G3 · Persistent trail gallery — P1, S

**Now:** each parameter change replaces the single path.

**Change:** keep the last ~5 traced results (mode-tagged), drawn at ~25 %
alpha under the active one; add "Clear trails". Store points arrays as traced —
no re-integration.

**Accept when:** sweeping the impact parameter across b_crit leaves capture and
scatter trails coexisting on screen — the taxonomy in one picture.

### G4 · Effective-potential inset — P2, M

Small inset plotting `V²(r) = (1 − 1/r)(1 + L²/r²)` (geometrized, rₛ = 1) with
the energy line for the current orbit and a marker riding the curve synced to
the animated particle's radius. In light mode, swap to the photon potential with
the b_crit peak. Layout slot per mock (bottom-left).

---

## Cross-cutting

- **X1 · Landing thumbnails (P1, S):** capture preview JPGs of the three finished
  screens into `public/` and set `thumbnail` in `src/constants/simulations.ts`,
  matching how missions 01–03 do it (04–06 currently fall back to gradient art).
- **Rebrand is a separate decision.** PR #15 bundles the Universe Lab rename +
  `universelab.org` metadata (README, `layout.tsx`, `page.tsx`, landing CSS). If
  that's not settled, split those hunks into their own PR — the sims don't
  depend on them.
- **Performance:** precompute waveform/trajectory arrays on parameter change;
  RAF loops should only interpolate and draw. (Geodesics already does this via
  `useMemo`; W1/W2 must follow the same pattern.)
- **Reduced motion:** all three components already gate animation on
  `prefers-reduced-motion` — new animations (ledger fast-forward, playback,
  ring) must respect the same flag; audio never autoplays.
- **Keep Canvas 2D + local state.** No R3F/zustand migration required for these
  items; revisit only if a sim later needs shared state or GPU effects.

## Parked (explicitly not now)

- Drag-to-aim launcher for geodesics (needs general E–L integration incl.
  plunge/escape; today's Darwin p–e covers bound orbits only).
- Kerr anything (spin, frame dragging) — future upgrade to Mission 02.
- Cosmology wing — separate batch with its own visual language.

## Definition of done (per item)

Acceptance criteria above pass · `npm run typecheck` and `npm run lint` clean ·
reduced-motion respected · controls reachable by keyboard · README simulation
blurbs updated if behavior changed.
