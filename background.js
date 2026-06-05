let isRunning = false;
let countDownTimer = null;
let currentLeft = 0;
let minSec = 10;
let maxSec = 30;

// 取随机数 包含 min ~ max
function getRandom() {
    return Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
}

// 清空所有 + 清除角标
function fullStop() {
    isRunning = false;
    if (countDownTimer) {
        clearInterval(countDownTimer);
        countDownTimer = null;
    }
    chrome.action.setBadgeText({ text: "" });
}

// 执行刷新
async function reloadTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.reload(tab.id);
}

// 开启新一轮
function nextRound() {
    if (!isRunning) return;

    currentLeft = getRandom();

    countDownTimer = setInterval(() => {
        if (!isRunning) {
            fullStop();
            return;
        }

        currentLeft--;
        chrome.action.setBadgeText({ text: currentLeft + "" });
        chrome.action.setBadgeBackgroundColor({ color: "#b8a2e8" });

        if (currentLeft <= 0) {
            clearInterval(countDownTimer);
            reloadTab();
            setTimeout(nextRound, 100);
        }
    }, 1000);
}

// 监听指令
chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "start") {
        fullStop();
        minSec = msg.min;
        maxSec = msg.max;
        isRunning = true;
        nextRound();
    }

    if (msg.type === "stop") {
        fullStop();
    }
});

// 浏览器卸载
chrome.runtime.onSuspend.addListener(fullStop);