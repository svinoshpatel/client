// ── Константи ──────────────────────────────────────────────────────────────
const QUESTIONS_PER_GROUP = 2;
const STORAGE_KEY = 'quiz_last_result';

// ── Стан застосунку ─────────────────────────────────────────────────────────
let questions   = [];   // обрані 6 питань
let current     = 0;    // індекс поточного питання
let userAnswers = [];   // відповіді користувача (паралельний масив)
let timerInterval = null;
let elapsedSeconds = 0;
let quizFinished = false;

// ── DOM-посилання ────────────────────────────────────────────────────────────
const quizArea    = document.getElementById('quiz-area');
const navEl       = document.getElementById('question-nav');
const resultsArea = document.getElementById('results-area');
const timerEl     = document.getElementById('timer');

// ════════════════════════════════════════════════════════════════════════════
// 1. ІНІЦІАЛІЗАЦІЯ
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  fetch('questions.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => initQuiz(data))
    .catch(err => {
      quizArea.innerHTML = `<p class="loading-msg" style="color:#f87171;">
        Помилка завантаження питань: ${err.message}</p>`;
    });
});

function initQuiz(data) {
  // Випадковий вибір по 2 питання з кожної групи
  const picked = [
    ...pickRandom(data.single,   QUESTIONS_PER_GROUP).map(q => ({ ...q, type: 'single'   })),
    ...pickRandom(data.multiple, QUESTIONS_PER_GROUP).map(q => ({ ...q, type: 'multiple' })),
    ...pickRandom(data.text,     QUESTIONS_PER_GROUP).map(q => ({ ...q, type: 'text'     })),
  ];

  // Перемішуємо порядок питань
  questions   = shuffle(picked);
  userAnswers = new Array(questions.length).fill(null);

  buildNav();
  renderQuestion(0);
  startTimer();
}

// ════════════════════════════════════════════════════════════════════════════
// 2. НАВІГАЦІЯ
// ════════════════════════════════════════════════════════════════════════════

function buildNav() {
  navEl.innerHTML = '';
  questions.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className  = 'nav-btn';
    btn.textContent = i + 1;
    btn.setAttribute('aria-label', `Питання ${i + 1}`);
    btn.addEventListener('click', () => {
      if (!quizFinished) saveCurrentAnswer();
      renderQuestion(i);
    });
    navEl.appendChild(btn);
  });
  updateNav();
}

function updateNav() {
  const btns = navEl.querySelectorAll('.nav-btn');
  btns.forEach((btn, i) => {
    btn.classList.toggle('active',    i === current);
    btn.classList.toggle('answered',  userAnswers[i] !== null);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 3. РЕНДЕР ПИТАННЯ
// ════════════════════════════════════════════════════════════════════════════

function renderQuestion(index) {
  current = index;
  const q = questions[index];

  const typeLabels = { single: 'Одна відповідь', multiple: 'Декілька відповідей', text: 'Текстова відповідь' };
  const badgeClass = { single: 'badge-single',   multiple: 'badge-multiple',       text: 'badge-text' };

  let optionsHTML = '';

  if (q.type === 'single' || q.type === 'multiple') {
    // Перемішуємо варіанти, але зберігаємо маппінг до оригінальних індексів
    const inputType = q.type === 'single' ? 'radio' : 'checkbox';
    const shuffled  = shuffleWithIndex(q.options); // [{text, origIdx}, ...]

    optionsHTML = `<ul class="options-list">` +
      shuffled.map(({ text, origIdx }) => {
        // Визначаємо чи цей варіант вже обраний (з userAnswers)
        const saved   = userAnswers[index];
        let checked = '';
        if (q.type === 'single'   && saved === origIdx) checked = 'checked';
        if (q.type === 'multiple' && Array.isArray(saved) && saved.includes(origIdx)) checked = 'checked';

        return `<li>
          <label class="option-label">
            <input type="${inputType}" name="q${index}" value="${origIdx}" ${checked} />
            ${escapeHTML(text)}
          </label>
        </li>`;
      }).join('') +
    `</ul>`;

  } else {
    // Текстове питання
    const saved = userAnswers[index] ?? '';
    optionsHTML = `<input
      class="text-input"
      type="text"
      id="text-answer"
      placeholder="Введіть вашу відповідь…"
      value="${escapeHTML(saved)}"
      autocomplete="off"
    />`;
  }

  // Кнопки навігації
  const isLast = index === questions.length - 1;
  const btnRow = `
    <div class="btn-row">
      ${index > 0
        ? `<button class="btn btn-outline" id="btn-prev">← Назад</button>`
        : ''}
      ${!isLast
        ? `<button class="btn btn-primary" id="btn-next">Наступне питання →</button>`
        : `<button class="btn btn-success" id="btn-finish">✔ Завершити тест</button>`}
    </div>`;

  quizArea.innerHTML = `
    <div class="question-card">
      <div class="question-meta">
        <span class="question-number">Питання ${index + 1} / ${questions.length}</span>
        <span class="question-type-badge ${badgeClass[q.type]}">${typeLabels[q.type]}</span>
      </div>
      <p class="question-text">${escapeHTML(q.question)}</p>
      ${optionsHTML}
      ${btnRow}
    </div>`;

  // Прив'язуємо кнопки
  document.getElementById('btn-next')  ?.addEventListener('click', onNext);
  document.getElementById('btn-prev')  ?.addEventListener('click', onPrev);
  document.getElementById('btn-finish')?.addEventListener('click', onFinish);

  updateNav();
}

// ════════════════════════════════════════════════════════════════════════════
// 4. ЗБЕРЕЖЕННЯ ВІДПОВІДІ ПОТОЧНОГО ПИТАННЯ
// ════════════════════════════════════════════════════════════════════════════

function saveCurrentAnswer() {
  const q = questions[current];

  if (q.type === 'single') {
    const checked = quizArea.querySelector('input[type="radio"]:checked');
    userAnswers[current] = checked ? Number(checked.value) : null;

  } else if (q.type === 'multiple') {
    const checked = [...quizArea.querySelectorAll('input[type="checkbox"]:checked')];
    userAnswers[current] = checked.length > 0 ? checked.map(c => Number(c.value)).sort() : null;

  } else {
    const val = quizArea.querySelector('#text-answer')?.value.trim() ?? '';
    userAnswers[current] = val !== '' ? val : null;
  }

  updateNav();
}

// ════════════════════════════════════════════════════════════════════════════
// 5. ОБРОБНИКИ КНОПОК
// ════════════════════════════════════════════════════════════════════════════

function onNext() {
  saveCurrentAnswer();
  if (current < questions.length - 1) renderQuestion(current + 1);
}

function onPrev() {
  saveCurrentAnswer();
  if (current > 0) renderQuestion(current - 1);
}

function onFinish() {
  saveCurrentAnswer();
  stopTimer();
  quizFinished = true;
  showResults();
}

// ════════════════════════════════════════════════════════════════════════════
// 6. ПЕРЕВІРКА ВІДПОВІДЕЙ
// ════════════════════════════════════════════════════════════════════════════

function checkAnswer(q, userAnswer) {
  if (userAnswer === null || userAnswer === undefined) return false;

  if (q.type === 'single') {
    return userAnswer === q.answer;
  }
  if (q.type === 'multiple') {
    // Порівнюємо відсортовані масиви
    const correct = [...q.answer].sort();
    const user    = [...userAnswer].sort();
    return JSON.stringify(correct) === JSON.stringify(user);
  }
  if (q.type === 'text') {
    return userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
  }
  return false;
}

// ════════════════════════════════════════════════════════════════════════════
// 7. РЕЗУЛЬТАТИ
// ════════════════════════════════════════════════════════════════════════════

function showResults() {
  // Підрахунок балів
  let score = 0;
  questions.forEach((q, i) => { if (checkAnswer(q, userAnswers[i])) score++; });

  const total     = questions.length;
  const timeStr   = formatTime(elapsedSeconds);
  const prevData  = loadPrevResult();

  // Зберігаємо поточний результат у localStorage
  saveResult({ score, total, time: timeStr, date: new Date().toLocaleString('uk-UA') });

  // Генеруємо огляд питань з підсвічуванням відповідей
  const reviewHTML = questions.map((q, i) => {
    const isCorrect = checkAnswer(q, userAnswers[i]);
    const icon = isCorrect ? '✅' : '❌';

    let answerBlock = '';

    if (q.type === 'single' || q.type === 'multiple') {
      const opts = q.options.map((opt, idx) => {
        const correctAnswers = q.type === 'single' ? [q.answer] : q.answer;
        const userChosen     = q.type === 'single'
          ? (userAnswers[i] === idx)
          : (Array.isArray(userAnswers[i]) && userAnswers[i].includes(idx));
        const isCorrectOpt   = correctAnswers.includes(idx);

        let cls = '';
        if (isCorrectOpt)              cls = 'correct';
        else if (userChosen && !isCorrectOpt) cls = 'wrong';

        const marker = userChosen ? (q.type === 'single' ? '◉' : '☑') : (q.type === 'single' ? '○' : '☐');
        return `<label class="option-label ${cls}" style="cursor:default">
          ${marker} ${escapeHTML(opt)}
          ${isCorrectOpt ? '<span style="margin-left:auto;font-size:0.8rem;color:#22c55e">✓ правильна</span>' : ''}
        </label>`;
      }).join('');
      answerBlock = `<ul class="options-list" style="pointer-events:none">${opts}</ul>`;

    } else {
      const feedbackClass = isCorrect ? 'correct' : 'wrong';
      const userVal       = userAnswers[i] ?? '(не відповів)';
      answerBlock = `
        <div class="text-input" style="cursor:default;opacity:0.8">${escapeHTML(String(userVal))}</div>
        <div class="text-feedback ${feedbackClass}">
          ${isCorrect
            ? `✓ Правильно: <strong>${escapeHTML(q.answer)}</strong>`
            : `✗ Ваша відповідь: «${escapeHTML(String(userVal))}» — правильна: <strong>${escapeHTML(q.answer)}</strong>`}
        </div>`;
    }

    return `
      <div class="question-card" style="margin-bottom:1.4rem;padding-bottom:1.4rem;border-bottom:1px solid #1e293b">
        <p class="question-number">${icon} Питання ${i + 1}</p>
        <p class="question-text" style="font-size:1rem">${escapeHTML(q.question)}</p>
        ${answerBlock}
      </div>`;
  }).join('');

  // Попередній результат
  const prevHTML = prevData
    ? `<div class="score-card prev">
         <div class="score-value">${prevData.score}/${prevData.total}</div>
         <div class="score-label">Попередній результат</div>
         <div style="font-size:0.75rem;color:#475569;margin-top:0.3rem">${prevData.date}</div>
       </div>`
    : `<div class="score-card prev">
         <div class="score-value">—</div>
         <div class="score-label">Попередній результат</div>
       </div>`;

  resultsArea.classList.remove('hidden');
  resultsArea.innerHTML = `
    <p class="results-header">📊 Результати тесту</p>
    <div class="score-block">
      <div class="score-card highlight">
        <div class="score-value">${score}/${total}</div>
        <div class="score-label">Правильних відповідей</div>
      </div>
      ${prevHTML}
      <div class="score-card time">
        <div class="score-value">${timeStr}</div>
        <div class="score-label">Час проходження</div>
      </div>
    </div>
    <p class="review-title">Детальний огляд відповідей:</p>
    ${reviewHTML}
    <div class="btn-row" style="margin-top:1rem">
      <button class="btn btn-primary" id="btn-retry">🔄 Пройти ще раз</button>
    </div>`;

  // Прокручуємо до результатів та блокуємо редагування
  resultsArea.scrollIntoView({ behavior: 'smooth' });
  quizArea.style.pointerEvents = 'none';
  quizArea.style.opacity = '0.5';

  document.getElementById('btn-retry').addEventListener('click', () => location.reload());
}

// ════════════════════════════════════════════════════════════════════════════
// 8. ТАЙМЕР
// ════════════════════════════════════════════════════════════════════════════

function startTimer() {
  elapsedSeconds = 0;
  timerEl.textContent = '00:00';
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    timerEl.textContent = formatTime(elapsedSeconds);
    // Попередження після 3 хв
    timerEl.closest('.timer-box').classList.toggle('warning', elapsedSeconds > 180);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ════════════════════════════════════════════════════════════════════════════
// 9. localStorage — збереження/читання результатів
// ════════════════════════════════════════════════════════════════════════════

function saveResult(result) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

function loadPrevResult() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

// ════════════════════════════════════════════════════════════════════════════
// 10. ДОПОМІЖНІ ФУНКЦІЇ
// ════════════════════════════════════════════════════════════════════════════

/** Повертає n випадково обраних елементів масиву (без повторень) */
function pickRandom(arr, n) {
  return shuffle([...arr]).slice(0, n);
}

/** Перемішує масив алгоритмом Fisher-Yates */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Перемішує масив рядків, зберігаючи оригінальні індекси */
function shuffleWithIndex(arr) {
  const indexed = arr.map((text, origIdx) => ({ text, origIdx }));
  return shuffle(indexed);
}

/** Екранує HTML-спецсимволи для безпечної вставки в innerHTML */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

