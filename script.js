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
  const dieFaces = 6;

  if (window.crypto && window.crypto.getRandomValues) {
    const maxRange = 0x100000000;
    const limit = maxRange - (maxRange % dieFaces);
    let randomValue;

    do {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      randomValue = buffer[0];
    } while (randomValue >= limit);

    return Math.floor((randomValue / limit) * dieFaces) + 1;
  }

  return Math.floor(Math.random() * dieFaces) + 1;
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

function playTone(frequency, duration, type = "square", volume = 0.08, delay = 0) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const startTime = ctx.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playRollSound() {
  playTone(880, 0.12, "square", 0.05);
  playTone(660, 0.1, "triangle", 0.04, 0.08);
}

function playRollingEffect() {
  const notes = [520, 610, 700];
  notes.forEach((freq, index) => {
    playTone(freq, 0.06, "square", 0.025, index * 0.03);
  });
}

function playSuccessSound() {
  playTone(1046.5, 0.1, "triangle", 0.06);
  playTone(1318.51, 0.12, "square", 0.05, 0.08);
}

function playFanfareSound() {
  const notes = [784, 988, 1174.66, 1318.51, 1567.98];
  notes.forEach((freq, index) => {
    playTone(freq, 0.16, "triangle", 0.06, index * 0.1);
  });

  const fanfareNotes = [1046.5, 1318.51, 1567.98, 1760];
  fanfareNotes.forEach((freq, index) => {
    playTone(freq, 0.2, "square", 0.06, 0.7 + index * 0.1);
  });
}

function playFailureSound() {
  playTone(220, 0.12, "sawtooth", 0.06);
  playTone(180, 0.1, "sawtooth", 0.05, 0.06);
  playTone(140, 0.1, "sawtooth", 0.04, 0.12);
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
  const steps = 12;
  const delays = [50, 75, 95, 115, 135, 155, 175, 195, 215, 235, 255, 275];

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
      statusEl.textContent = "3回連続で正解！サイコロキング達成です！";
      updateButtonStates();
      return;
    }

    statusEl.textContent = `正解！連続成功は ${streak} 回です。次のゲームに挑戦しますか？`;
    updateButtonStates();
    return;
  }

  playFailureSound();
  updateStreak();
  statusEl.textContent = `残念！基準値:${baselineValue} / 次の目:${nextValue}`;
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
