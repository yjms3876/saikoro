const baselineDieEl = document.getElementById("baselineDie");
const currentDieEl = document.getElementById("currentDie");
const statusEl = document.getElementById("status");
const streakEl = document.getElementById("streak");
const startBtn = document.getElementById("startBtn");
const quitBtn = document.getElementById("quitBtn");
const predictionButtons = document.getElementById("predictionButtons");
const roundButtons = document.getElementById("roundButtons");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const stopBtn = document.getElementById("stopBtn");

let streak = 0;
let baselineValue = null;
let awaitingPrediction = false;
let audioContext = null;

function rollDie() {
  const randomValue = Math.floor(Math.random() * 6) + 1;
  return randomValue;
}

function evaluatePrediction(baseline, nextValue, prediction) {
  if (nextValue === baseline) {
    return { correct: false, same: true };
  }

  const predictedHigher = prediction === "high";
  const actualHigher = nextValue > baseline;
  return {
    correct: predictedHigher === actualHigher,
    same: false,
  };
}

function setDieFace(dieEl, value) {
  if (value === "?") {
    dieEl.className = "die face-unknown";
    dieEl.innerHTML = "";
    dieEl.dataset.value = "?";
    return;
  }

  const numericValue = Number(value);
  dieEl.className = `die face-${numericValue}`;
  dieEl.innerHTML = "";
  dieEl.dataset.value = String(numericValue);
  for (let i = 0; i < numericValue; i += 1) {
    const pip = document.createElement("span");
    pip.className = "pip";
    dieEl.appendChild(pip);
  }
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function playRollSound() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(420, now);
  oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.08);
  oscillator.frequency.exponentialRampToValueAtTime(160, now + 0.16);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

function playRollingEffect() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const notes = [330, 390, 460, 520];
  notes.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const startTime = ctx.currentTime + index * 0.04;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + 0.06);
    filter.type = "highpass";
    filter.frequency.value = 700;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.03, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.09);
  });
}

function playSuccessSound() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + index * 0.08;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.18);
  });
}

function playFanfareSound() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const notes = [659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + 0.25 + index * 0.14;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.24);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.24);
  });
}

function playFailureSound() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const notes = [220, 180, 140];
  notes.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + index * 0.09;
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(freq, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(freq * 0.8, startTime + 0.12);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.06, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.16);
  });
}

function updateStreak() {
  streakEl.textContent = streak.toString();
}

function updatePredictionButtons() {
  const buttons = predictionButtons.querySelectorAll("button[data-choice]");
  buttons.forEach((button) => {
    button.disabled = !awaitingPrediction || baselineValue === null;
  });
}

function updateRoundButtons() {
  const canUseRoundActions = streak > 0 && streak < 3 && baselineValue !== null && !awaitingPrediction;
  nextRoundBtn.disabled = !canUseRoundActions;
  stopBtn.disabled = !canUseRoundActions;
}

function updateButtonStates() {
  quitBtn.disabled = baselineValue === null && streak === 0 && !awaitingPrediction;
  updatePredictionButtons();
  updateRoundButtons();
}

function resetToInitial() {
  streak = 0;
  baselineValue = null;
  awaitingPrediction = false;
  startBtn.disabled = false;
  quitBtn.disabled = true;
  setDieFace(baselineDieEl, "?");
  setDieFace(currentDieEl, "?");
  updateStreak();
  updateButtonStates();
  statusEl.textContent = "スタートを押して、最初のサイコロを振ろう。";
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function animateRoll(dieEl, finalValue) {
  const steps = 10;
  const delays = [80, 110, 140, 180, 220, 260, 320, 380, 450, 520];

  for (let index = 0; index < steps; index += 1) {
    const randomValue = rollDie();
    setDieFace(dieEl, randomValue);
    if (index % 2 === 0) {
      playRollingEffect();
    }
    await delay(delays[index]);
  }

  playRollSound();
  setDieFace(dieEl, finalValue);
}

async function startNewGame() {
  streak = 0;
  baselineValue = null;
  awaitingPrediction = false;
  startBtn.disabled = true;
  quitBtn.disabled = true;
  updateStreak();
  statusEl.textContent = "最初のサイコロを振っています...";

  const firstRoll = rollDie();
  baselineValue = firstRoll;
  await animateRoll(baselineDieEl, firstRoll);

  statusEl.textContent = `基準値は ${baselineValue} です。次の目は大きい？小さい？`;
  awaitingPrediction = true;
  setDieFace(currentDieEl, "?");
  startBtn.disabled = false;
  quitBtn.disabled = false;
  updateButtonStates();
}

async function prepareNextRound() {
  if (baselineValue === null) {
    return;
  }

  awaitingPrediction = false;
  setDieFace(baselineDieEl, baselineValue);
  setDieFace(currentDieEl, "?");
  statusEl.textContent = `基準値は ${baselineValue} です。次の目は大きい？小さい？`;
  awaitingPrediction = true;
  updateButtonStates();
}

async function resolvePrediction(choice) {
  if (!awaitingPrediction || baselineValue === null) {
    return;
  }

  awaitingPrediction = false;
  updateButtonStates();
  statusEl.textContent = "次の目を振っています...";

  const nextValue = rollDie();
  await animateRoll(currentDieEl, nextValue);

  const result = evaluatePrediction(baselineValue, nextValue, choice);
  if (result.same) {
    playFailureSound();
    updateStreak();
    statusEl.textContent = `同じ目が出たのでゲームオーバーです。基準値:${baselineValue} / 次の目:${nextValue}`;
    return;
  }

  if (result.correct) {
    streak += 1;
    updateStreak();
    baselineValue = nextValue;
    playSuccessSound();

    if (streak >= 3) {
      playFanfareSound();
      statusEl.textContent = "3回連続で正解しました！ゲームクリアです。";
      updateButtonStates();
      return;
    }

    statusEl.textContent = `正解です！連続成功は ${streak} 回です。次のゲームに挑戦しますか？`;
    updateButtonStates();
    return;
  }

  playFailureSound();
  updateStreak();
  statusEl.textContent = `不正解です。基準値:${baselineValue} / 次の目:${nextValue}`;
  updateButtonStates();
}

startBtn.addEventListener("click", () => {
  void startNewGame();
});

quitBtn.addEventListener("click", () => {
  resetToInitial();
});

predictionButtons.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-choice]");
  if (!button) {
    return;
  }
  void resolvePrediction(button.dataset.choice);
});

nextRoundBtn.addEventListener("click", () => {
  void prepareNextRound();
});

stopBtn.addEventListener("click", () => {
  resetToInitial();
});

resetToInitial();
