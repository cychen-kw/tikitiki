// Shared by the stock notification and the settings preview.
function playTikitikiDing(audio, percent = 50) {
  const level = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 50;
  if (level === 0) return;
  // Cap the signal at the original quiet level; device/system volume still affects loudness.
  const peak = 0.035 * level / 100;
  for (const offset of [0, 0.3]) {
    const start = audio.currentTime + offset;
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = 880;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(peak, start + 0.015);
    volume.gain.exponentialRampToValueAtTime(peak / 35, start + 0.22);
    tone.connect(volume);
    volume.connect(audio.destination);
    tone.onended = () => { tone.disconnect(); volume.disconnect(); };
    tone.start(start);
    tone.stop(start + 0.25);
  }
}
