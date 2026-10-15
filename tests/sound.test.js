const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/sound.js'), 'utf8'), context);
for (const [level, expected] of [[undefined, 0.0175], [0, 0], [-10, 0], [25, 0.00875], [100, 0.035], [200, 0.035], [NaN, 0.0175], [Infinity, 0.0175], ['100', 0.0175]]) {
  const peaks = [], tails = [], starts = [];
  const audio = {
    currentTime: 10, destination: {},
    createOscillator() {
      return { frequency: {}, connect() {}, disconnect() {}, start(time) { starts.push(time); }, stop() {} };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime(value) { assert.equal(value, 0); },
          linearRampToValueAtTime(value) { peaks.push(value); },
          exponentialRampToValueAtTime(value) { tails.push(value); }
        }, connect() {}, disconnect() {}
      };
    }
  };
  context.playTikitikiDing(audio, level);
  assert.deepEqual(peaks, expected ? [expected, expected] : []);
  assert.deepEqual(starts, expected ? [10, 10.3] : []);
  assert.ok(tails.every(value => value > 0 && value < expected));
}
