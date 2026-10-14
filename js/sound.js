// Shared by the stock notification and the settings preview.
function playTikitikiDing(audio) {
  for (const offset of [0, 0.3]) {
    const start = audio.currentTime + offset;
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = 880;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(0.035, start + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
    tone.connect(volume);
    volume.connect(audio.destination);
    tone.onended = () => { tone.disconnect(); volume.disconnect(); };
    tone.start(start);
    tone.stop(start + 0.25);
  }
}
