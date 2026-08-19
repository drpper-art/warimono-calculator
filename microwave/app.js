(() => {
  'use strict';

  const BASE_WATT = 500;
  const COMMON_WATTS = [500, 600, 700, 800, 1000, 1200, 1500];

  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const targetWattEl = document.getElementById('targetWatt');
  const resultWattEl = document.getElementById('resultWatt');
  const resultTimeEl = document.getElementById('resultTime');
  const resultSubEl = document.getElementById('resultSub');
  const comparisonListEl = document.getElementById('comparisonList');
  const wattButtonsEl = document.getElementById('wattButtons');

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeInputs() {
    const minutes = clamp(Number.parseInt(minutesEl.value || '0', 10) || 0, 0, 999);
    const seconds = clamp(Number.parseInt(secondsEl.value || '0', 10) || 0, 0, 59);
    const targetWatt = clamp(Number.parseInt(targetWattEl.value || '600', 10) || 600, 100, 3000);
    return { minutes, seconds, targetWatt };
  }

  function formatTime(totalSeconds, padSeconds = false) {
    const secondsRounded = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(secondsRounded / 60);
    const seconds = secondsRounded % 60;

    if (minutes === 0) return `${seconds}秒`;
    if (seconds === 0) return `${minutes}分`;
    return `${minutes}分${padSeconds ? String(seconds).padStart(2, '0') : seconds}秒`;
  }

  function formatSourceTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}分${String(seconds).padStart(2, '0')}秒`;
  }

  function convertedSeconds(sourceSeconds, targetWatt) {
    if (sourceSeconds <= 0 || targetWatt <= 0) return 0;
    return sourceSeconds * BASE_WATT / targetWatt;
  }

  function setActiveWattButton(targetWatt) {
    wattButtonsEl.querySelectorAll('[data-watt]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.watt) === targetWatt);
    });
  }

  function renderComparison(sourceSeconds, targetWatt) {
    comparisonListEl.innerHTML = COMMON_WATTS.map((watt) => {
      const time = watt === BASE_WATT ? sourceSeconds : convertedSeconds(sourceSeconds, watt);
      const currentClass = watt === targetWatt ? ' current' : '';
      return `
        <div class="comparison-row${currentClass}">
          <div class="comparison-watt">${watt}W</div>
          <div class="comparison-time">${formatTime(time, true)}</div>
        </div>`;
    }).join('');
  }

  function update() {
    const { minutes, seconds, targetWatt } = normalizeInputs();
    const sourceSeconds = minutes * 60 + seconds;
    const resultSeconds = convertedSeconds(sourceSeconds, targetWatt);

    resultWattEl.textContent = `${targetWatt}W`;
    resultTimeEl.classList.add('flash');
    resultTimeEl.textContent = formatTime(resultSeconds, true);
    resultSubEl.textContent = `500W・${formatSourceTime(sourceSeconds)} と同じ加熱量の目安`;
    window.setTimeout(() => resultTimeEl.classList.remove('flash'), 100);

    setActiveWattButton(targetWatt);
    renderComparison(sourceSeconds, targetWatt);

    try {
      localStorage.setItem('microwaveTargetWatt', String(targetWatt));
    } catch (_) {}
  }

  function setTimeFromSeconds(totalSeconds) {
    minutesEl.value = String(Math.floor(totalSeconds / 60));
    secondsEl.value = String(totalSeconds % 60);
    update();
  }

  document.querySelectorAll('[data-time]').forEach((button) => {
    button.addEventListener('click', () => setTimeFromSeconds(Number(button.dataset.time)));
  });

  wattButtonsEl.querySelectorAll('[data-watt]').forEach((button) => {
    button.addEventListener('click', () => {
      targetWattEl.value = button.dataset.watt;
      update();
    });
  });

  [minutesEl, secondsEl, targetWattEl].forEach((el) => {
    el.addEventListener('input', update);
    el.addEventListener('change', () => {
      const { minutes, seconds, targetWatt } = normalizeInputs();
      minutesEl.value = String(minutes);
      secondsEl.value = String(seconds);
      targetWattEl.value = String(targetWatt);
      update();
    });
  });

  try {
    const savedWatt = Number.parseInt(localStorage.getItem('microwaveTargetWatt') || '', 10);
    if (savedWatt >= 100 && savedWatt <= 3000) targetWattEl.value = String(savedWatt);
  } catch (_) {}

  update();
})();
