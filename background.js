const REFRESH_ALARM = "auto-refresh-next-round";
const BADGE_COLOR = "#b8a2e8";
const DEFAULT_STATE = {
  isRunning: false,
  minSec: 8,
  maxSec: 10,
  targetTabId: null,
  targetWindowId: null,
  nextRefreshAt: null
};

let countDownTimer = null;
let refreshTimer = null;
let refreshInProgress = false;

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getState() {
  const state = await chrome.storage.local.get(DEFAULT_STATE);
  return { ...DEFAULT_STATE, ...state };
}

async function saveState(patch) {
  await chrome.storage.local.set(patch);
}

function clearLocalTimers() {
  if (countDownTimer) {
    clearInterval(countDownTimer);
    countDownTimer = null;
  }

  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

async function clearBadge() {
  await chrome.action.setBadgeText({ text: "" });
}

async function setBadgeSeconds(seconds) {
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  await chrome.action.setBadgeText({ text: String(Math.max(0, seconds)) });
}

function getSecondsLeft(nextRefreshAt) {
  return Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
}

function startBadgeCountdown(nextRefreshAt) {
  if (countDownTimer) {
    clearInterval(countDownTimer);
  }

  setBadgeSeconds(getSecondsLeft(nextRefreshAt));

  countDownTimer = setInterval(async () => {
    const state = await getState();
    if (!state.isRunning || !state.nextRefreshAt) {
      clearLocalTimers();
      await clearBadge();
      return;
    }

    await setBadgeSeconds(getSecondsLeft(state.nextRefreshAt));
  }, 1000);
}

function armExactRefresh(nextRefreshAt) {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  const delayMs = Math.max(0, nextRefreshAt - Date.now());
  refreshTimer = setTimeout(() => {
    handleRefreshDue();
  }, delayMs);
}

async function reloadTargetTab(state) {
  if (state.targetTabId) {
    try {
      await chrome.tabs.reload(state.targetTabId);
      return;
    } catch (error) {
      await saveState({ targetTabId: null, targetWindowId: null });
    }
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id) {
    await chrome.tabs.reload(tab.id);
    await saveState({ targetTabId: tab.id, targetWindowId: tab.windowId });
  }
}

async function scheduleNextRound() {
  const state = await getState();
  if (!state.isRunning) {
    clearLocalTimers();
    await chrome.alarms.clear(REFRESH_ALARM);
    await clearBadge();
    return;
  }

  const nextRefreshAt = Date.now() + getRandom(state.minSec, state.maxSec) * 1000;
  await saveState({ nextRefreshAt });
  await chrome.alarms.clear(REFRESH_ALARM);
  await chrome.alarms.create(REFRESH_ALARM, { when: nextRefreshAt });
  armExactRefresh(nextRefreshAt);
  startBadgeCountdown(nextRefreshAt);
}

async function handleRefreshDue() {
  if (refreshInProgress) return;

  refreshInProgress = true;
  try {
    const state = await getState();
    if (!state.isRunning || !state.nextRefreshAt) {
      clearLocalTimers();
      await clearBadge();
      return;
    }

    if (Date.now() + 500 < state.nextRefreshAt) {
      armExactRefresh(state.nextRefreshAt);
      startBadgeCountdown(state.nextRefreshAt);
      return;
    }

    await setBadgeSeconds(0);
    await reloadTargetTab(state);
    await scheduleNextRound();
  } finally {
    refreshInProgress = false;
  }
}

async function startAutoRefresh(minSec, maxSec) {
  clearLocalTimers();
  await chrome.alarms.clear(REFRESH_ALARM);

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  await saveState({
    isRunning: true,
    minSec,
    maxSec,
    targetTabId: tab?.id ?? null,
    targetWindowId: tab?.windowId ?? null,
    nextRefreshAt: null
  });

  await scheduleNextRound();
  return getState();
}

async function stopAutoRefresh() {
  clearLocalTimers();
  await chrome.alarms.clear(REFRESH_ALARM);
  await saveState({ isRunning: false, nextRefreshAt: null });
  await clearBadge();
  return getState();
}

async function restoreAutoRefresh() {
  const state = await getState();
  if (!state.isRunning || !state.nextRefreshAt) {
    await clearBadge();
    return;
  }

  await chrome.alarms.create(REFRESH_ALARM, { when: state.nextRefreshAt });
  if (Date.now() >= state.nextRefreshAt) {
    await handleRefreshDue();
    return;
  }

  armExactRefresh(state.nextRefreshAt);
  startBadgeCountdown(state.nextRefreshAt);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "start") {
      const state = await startAutoRefresh(msg.min, msg.max);
      sendResponse({ ok: true, state });
      return;
    }

    if (msg.type === "stop") {
      const state = await stopAutoRefresh();
      sendResponse({ ok: true, state });
      return;
    }

    if (msg.type === "getState") {
      sendResponse({ ok: true, state: await getState() });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type" });
  })().catch(error => {
    sendResponse({ ok: false, error: error.message });
  });

  return true;
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === REFRESH_ALARM) {
    handleRefreshDue();
  }
});

restoreAutoRefresh();
