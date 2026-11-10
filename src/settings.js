// Music and sound settings, remembered on this computer only.
// Nothing else is stored by Kitchen Chaos.

const KEY = 'kitchen-chaos-settings';
const DEFAULTS = { musicOn: true, musicVolume: 0.35, sfxOn: true };

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? '{}');
    const out = { ...DEFAULTS, ...saved };
    out.musicVolume = Math.min(1, Math.max(0, Number(out.musicVolume) || 0));
    out.musicOn = Boolean(out.musicOn);
    out.sfxOn = Boolean(out.sfxOn);
    return out;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(settings)); } catch { /* storage unavailable: settings last for this session */ }
}
