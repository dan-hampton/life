// --- Drone Synth for Game of Life ---
let droneOsc: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let droneFilter: BiquadFilterNode | null = null;
let droneCtx: AudioContext | null = null;
let droneStarted = false;

// For vibrato
let vibratoOsc: OscillatorNode | null = null;
let vibratoGain: GainNode | null = null;

export function startDrone() {
  if (droneStarted) return;
  // Create AudioContext if not already created
  if (!droneCtx) {
    try {
      droneCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      return;
    }
  }
  droneOsc = droneCtx.createOscillator();
  droneGain = droneCtx.createGain();
  droneFilter = droneCtx.createBiquadFilter();
  droneOsc.type = 'sine';
  droneOsc.frequency.value = 55; // A1 (one octave lower)
  droneGain.gain.value = 0.25; // Quieter
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 800;
  // Vibrato: slow LFO modulates frequency
  vibratoOsc = droneCtx.createOscillator();
  vibratoGain = droneCtx.createGain();
  vibratoOsc.type = 'sine';
  vibratoOsc.frequency.value = 0.7; // Slow vibrato
  vibratoGain.gain.value = 2.5; // Vibrato depth in Hz
  vibratoOsc.connect(vibratoGain);
  vibratoGain.connect(droneOsc.frequency);
  vibratoOsc.start();
  droneOsc.connect(droneFilter);
  droneFilter.connect(droneGain);
  droneGain.connect(droneCtx.destination);
  droneOsc.start();
  droneStarted = true;
}

// trend: -1 (deaths dominate) to +1 (births dominate), 0 = neutral
export function modulateDrone(trend: number) {
  if (!droneOsc || !droneGain || !droneFilter) return;
  // Clamp trend
  trend = Math.max(-1, Math.min(1, trend));
  // More births: higher pitch, brighter; more deaths: lower, darker
  const baseFreq = 55; // A1
  const freq = baseFreq + trend * 80; // 55-135 Hz, much wider range
  droneOsc.frequency.setTargetAtTime(freq, droneOsc.context.currentTime, 0.15);
  const baseCutoff = 150;
  const cutoff = baseCutoff + trend * 1200; // 300-3000 Hz, much wider range
  droneFilter.frequency.setTargetAtTime(cutoff, droneOsc.context.currentTime, 0.15);
  // Modulate gain for drama, but only if trend is nonzero
  const baseGain = 0.06;
  droneGain.gain.setTargetAtTime(baseGain + trend * 0.06, droneOsc.context.currentTime, 0.15);
  // Modulate vibrato depth: zero when neutral, more with trend
  if (vibratoGain) {
    const vibratoDepth = trend === 0 ? 0 : 2.5 * Math.abs(trend) + 0.5;
    vibratoGain.gain.setTargetAtTime(vibratoDepth, droneOsc.context.currentTime, 0.2);
  }
}

export function stopDrone() {
  if (droneOsc) droneOsc.stop();
  if (vibratoOsc) vibratoOsc.stop();
  droneOsc = null;
  droneGain = null;
  droneFilter = null;
  vibratoOsc = null;
  vibratoGain = null;
  droneStarted = false;
}
