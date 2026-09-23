/**
 * Audio and Haptic Synthesis Service for Android & Mobile Web
 * Uses Web Audio API oscillator synthesis so sound alerts always work
 * reliably without external audio downloads or network dependence.
 */

let audioCtx: AudioContext | null = null;
let activeAlarmNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;
let continuousAlarmTimer: number | null = null;
let isContinuousAlarmActive = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Stop any currently sounding emergency alarm siren immediately
 */
export function stopAllAlarmSounds(): void {
  try {
    if (activeAlarmNodes) {
      activeAlarmNodes.gain.gain.setValueAtTime(0.0001, audioCtx?.currentTime || 0);
      try {
        activeAlarmNodes.osc1.stop();
        activeAlarmNodes.osc2.stop();
      } catch {
        // Ignore if already stopped
      }
      activeAlarmNodes = null;
    }
  } catch {
    // Ignore
  }
}

/**
 * Plays one alarm cycle sweep (approx 2 seconds)
 */
function playAlarmBurst(duration: number = 2.4): void {
  try {
    stopAllAlarmSounds();

    const ctx = getAudioContext();
    if (!ctx) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 700]);
    }

    const now = ctx.currentTime;
    const endTime = now + duration;

    // Primary piercing siren oscillator (sawtooth)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';

    // Secondary sub-harmonic klaxon oscillator (square wave)
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.42, now);

    // Rapid piercing sweep between 850Hz and 1380Hz
    const cycleDuration = 0.3;
    let t = now;
    let isHigh = false;

    while (t < endTime) {
      const nextTime = Math.min(t + cycleDuration, endTime);
      const freq1 = isHigh ? 1380 : 850;
      const freq2 = isHigh ? 690 : 425;

      osc1.frequency.exponentialRampToValueAtTime(freq1, nextTime);
      osc2.frequency.exponentialRampToValueAtTime(freq2, nextTime);

      t = nextTime;
      isHigh = !isHigh;
    }

    osc1.connect(masterGain);
    osc2.connect(masterGain);
    masterGain.connect(ctx.destination);

    activeAlarmNodes = { osc1, osc2, gain: masterGain };

    osc1.start(now);
    osc2.start(now);

    osc1.stop(endTime);
    osc2.stop(endTime);

    setTimeout(() => {
      if (activeAlarmNodes?.osc1 === osc1) {
        activeAlarmNodes = null;
      }
    }, duration * 1000 + 50);
  } catch (e) {
    console.warn('Alarm burst error:', e);
  }
}

/**
 * Check if the continuous station alarm is currently sounding
 */
export function isStationAlarmSounding(): boolean {
  return isContinuousAlarmActive;
}

/**
 * Starts continuous, looping emergency station alarm siren.
 * WILL NOT STOP automatically — will continue sounding indefinitely
 * until an authorized BFP or MDRRMO responder stops it!
 */
export function startContinuousStationAlarm(): void {
  if (isContinuousAlarmActive) return;
  isContinuousAlarmActive = true;

  // Play immediately
  playAlarmBurst(2.4);

  // Repeat continuous loop every 2.4 seconds
  if (typeof window !== 'undefined') {
    if (continuousAlarmTimer !== null) {
      clearInterval(continuousAlarmTimer);
    }
    continuousAlarmTimer = window.setInterval(() => {
      if (isContinuousAlarmActive) {
        playAlarmBurst(2.4);
      } else {
        if (continuousAlarmTimer !== null) {
          clearInterval(continuousAlarmTimer);
          continuousAlarmTimer = null;
        }
      }
    }, 2450);
  }
}

/**
 * ONLY BFP OR MDRRMO CAN CALL THIS:
 * Stops the continuous alarm siren immediately.
 */
export function stopContinuousStationAlarm(): void {
  isContinuousAlarmActive = false;
  if (continuousAlarmTimer !== null) {
    clearInterval(continuousAlarmTimer);
    continuousAlarmTimer = null;
  }
  stopAllAlarmSounds();
}

/**
 * Single-shot alarm siren for testing or manual drills
 */
export function playAlarmingStationSiren(durationSeconds: number = 5): void {
  playAlarmBurst(durationSeconds);
}

export function playEmergencySiren(durationSeconds: number = 3): void {
  playAlarmBurst(durationSeconds);
}

// Push notification chime
export function playNotificationChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 75, 150]);
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.warn('Chime error:', e);
  }
}

// Radio dispatch burst for BFP responder transmission
export function playRadioDispatchChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1600, now + 0.08);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Ignore
  }
}
