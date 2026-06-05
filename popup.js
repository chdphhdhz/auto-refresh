const minInput = document.getElementById("minTime");
const maxInput = document.getElementById("maxTime");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

function readSettings() {
  return {
    min: Number(minInput.value),
    max: Number(maxInput.value)
  };
}

function validateSettings(min, max) {
  return !Number.isNaN(min) && !Number.isNaN(max) && min >= 1 && max > min;
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "后台响应失败");
  }

  return response.state;
}

async function saveInputs() {
  const { min, max } = readSettings();
  if (Number.isNaN(min) || Number.isNaN(max)) return;

  await chrome.storage.local.set({
    minSec: min,
    maxSec: max
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const response = await chrome.runtime.sendMessage({ type: "getState" });
  const state = response?.state || {};

  minInput.value = state.minSec ?? 8;
  maxInput.value = state.maxSec ?? 10;
});

minInput.addEventListener("input", saveInputs);
maxInput.addEventListener("input", saveInputs);

startBtn.addEventListener("click", async () => {
  const { min, max } = readSettings();

  if (!validateSettings(min, max)) {
    alert("范围错误：最小值≥1，最大值必须大于最小值");
    return;
  }

  startBtn.disabled = true;
  try {
    await sendMessage({ type: "start", min, max });
    window.close();
  } catch (error) {
    startBtn.disabled = false;
    alert(`启动失败：${error.message}`);
  }
});

stopBtn.addEventListener("click", async () => {
  stopBtn.disabled = true;
  try {
    await sendMessage({ type: "stop" });
    window.close();
  } catch (error) {
    stopBtn.disabled = false;
    alert(`停止失败：${error.message}`);
  }
});
