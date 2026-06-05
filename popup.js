document.getElementById('startBtn').addEventListener('click', () => {
  const min = +document.getElementById('minTime').value;
  const max = +document.getElementById('maxTime').value;

  if (isNaN(min) || isNaN(max) || min < 1 || max <= min) {
    alert('范围错误：最小值≥1，最大值必须大于最小值');
    return;
  }

  chrome.runtime.sendMessage({ type: "start", min, max });
  window.close();
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "stop" });
  window.close();
});