import hsk1Data from './data/hsk1.json';
import hsk2Data from './data/hsk2.json';

// Debug: Global Error Handler
window.onerror = function (msg, url, line, col, error) {
  alert("Error: " + msg + "\nLine: " + line + "\nCol: " + col + "\nStack: " + (error ? error.stack : 'n/a'));
};

try {
  const app = document.getElementById('app');
  if (!app) throw new Error("App element not found!");

  // Combine data
  const lessons = [
    ...hsk1Data.map(l => ({ ...l, level: 'HSK1', id: `HSK1_${l.lesson}` })),
    ...hsk2Data.map(l => ({ ...l, level: 'HSK2', id: `HSK2_${l.lesson}` }))
  ];

  // Smart Logic
  function getWeeklyTargetLesson() {
    const startDate = new Date('2025-12-01T00:00:00'); // User specified Dec 1st
    const now = new Date();

    // If before start date, default to Lesson 1
    if (now < startDate) return 1;

    const diffTime = Math.abs(now - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeksPassed = Math.floor((diffDays - 1) / 7);

    // Lesson 1 is week 0, Lesson 2 is week 1, etc.
    let targetLesson = weeksPassed + 1;

    // Cap at max HSK2 lessons
    const maxHsk2 = hsk2Data.length;
    if (targetLesson > maxHsk2) targetLesson = maxHsk2;

    return targetLesson;
  }

  // State
  let state = {
    view: 'home', // home, lesson, cumulative
    currentLessonId: null,
    flashcards: [],
    currentCardIndex: 0,
    revealStep: 0, // 0: Hanzi, 1: Pinyin, 2: Meaning
    activeTab: 'practice', // Default to practice (flashcards)
    scope: 'lesson', // lesson, hsk2_cumulative, all_cumulative
    showPdf: false
  };

  // Router
  function navigate(view, params = {}) {
    state.view = view;
    if (params.lessonId) {
      state.currentLessonId = params.lessonId;
      state.activeTab = 'practice';
      state.showPdf = false;
      state.scope = 'lesson'; // Default scope
      loadFlashcardsForScope();
    }
    render();
  }

  // Helpers
  function getLessonTitle(lesson) {
    return `Lesson ${lesson.lesson}`;
  }

  function loadFlashcardsForScope() {
    const currentLesson = lessons.find(l => l.id === state.currentLessonId);
    if (!currentLesson) return;

    let pool = [];

    if (state.scope === 'lesson') {
      pool = [...currentLesson.vocabulary];
    } else if (state.scope === 'hsk2_cumulative') {
      // All HSK2 lessons up to current
      const currentNum = currentLesson.lesson;
      pool = lessons
        .filter(l => l.level === 'HSK2' && l.lesson <= currentNum)
        .flatMap(l => l.vocabulary);
    } else if (state.scope === 'all_cumulative') {
      // All HSK1 + HSK2 up to current
      const currentNum = currentLesson.lesson;
      // All HSK1
      const hsk1Vocab = lessons.filter(l => l.level === 'HSK1').flatMap(l => l.vocabulary);
      // HSK2 up to current
      const hsk2Vocab = lessons
        .filter(l => l.level === 'HSK2' && l.lesson <= currentNum)
        .flatMap(l => l.vocabulary);

      pool = [...hsk1Vocab, ...hsk2Vocab];
    }

    state.flashcards = pool.sort(() => Math.random() - 0.5);
    state.currentCardIndex = 0;
    state.revealStep = 0;
  }

  // Views
  function renderHome() {
    const targetLessonNum = getWeeklyTargetLesson();
    const targetLesson = lessons.find(l => l.level === 'HSK2' && l.lesson === targetLessonNum);

    const hsk1Lessons = lessons.filter(l => l.level === 'HSK1');
    const hsk2Lessons = lessons.filter(l => l.level === 'HSK2');

    return `
    <header>
      <h1>Chinese Learning Hub</h1>
    </header>
    
    <div class="card" style="background: #e63946; color: white; text-align: center; cursor: pointer;" onclick="window.startWeeklyChallenge()">
      <h2>📅 Weekly Challenge</h2>
      <p>HSK 2 Cumulative (Up to Lesson ${targetLessonNum})</p>
      <div style="font-size: 3rem; margin: 1rem;">GO</div>
    </div>
    
    <div class="card">
      <h3>HSK 2 Lessons</h3>
      <div class="grid">
        ${hsk2Lessons.map(l => `
          <button class="btn lesson-card" onclick="window.loadLesson('${l.id}')">
            ${l.lesson}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <h3>HSK 1 Lessons</h3>
      <div class="grid">
        ${hsk1Lessons.map(l => `
          <button class="btn lesson-card" style="background: var(--accent-color); color: var(--text-color);" onclick="window.loadLesson('${l.id}')">
            ${l.lesson}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  }

  function renderLesson() {
    const lesson = lessons.find(l => l.id === state.currentLessonId);
    if (!lesson) return 'Lesson not found';

    const pdfUrl = `./pdfs/${lesson.level}/${lesson.resource.pdf_file}`;

    return `
    <div class="nav-bar">
      <button class="btn btn-secondary" onclick="window.goHome()">← Back</button>
      <h2>${lesson.level} - Lesson ${lesson.lesson}</h2>
      <button class="btn btn-secondary" onclick="window.togglePdf()">${state.showPdf ? 'Hide PDF' : 'Show PDF'}</button>
    </div>

    ${state.showPdf ? `
      <div class="card" style="height: 60vh; padding: 0; overflow: hidden; margin-bottom: 1rem;">
        <object data="${pdfUrl}" type="application/pdf" width="100%" height="100%">
            <p><a href="${pdfUrl}">Download PDF</a></p>
        </object>
      </div>
    ` : ''}

    <div class="scope-selector">
      <button class="scope-btn ${state.scope === 'lesson' ? 'active' : ''}" onclick="window.setScope('lesson')">Lesson Only</button>
      <button class="scope-btn ${state.scope === 'hsk2_cumulative' ? 'active' : ''}" onclick="window.setScope('hsk2_cumulative')">HSK2+</button>
      <button class="scope-btn ${state.scope === 'all_cumulative' ? 'active' : ''}" onclick="window.setScope('all_cumulative')">All+</button>
    </div>

    <div id="quiz-container"></div>
  `;
  }

  function renderQuiz(cards) {
    if (!cards || cards.length === 0) return '<div class="card">No vocabulary found.</div>';

    const card = cards[state.currentCardIndex];
    const isFinished = state.currentCardIndex >= cards.length;

    if (isFinished) {
      return `
      <div class="card" style="text-align: center; padding: 3rem;">
        <h3>Complete!</h3>
        <p>Reviewed ${cards.length} words.</p>
        <button class="btn" onclick="window.restartQuiz()">Restart</button>
      </div>
    `;
    }

    const showPinyin = state.revealStep >= 1;
    const showMeaning = state.revealStep >= 2;
    const nextStepText = state.revealStep < 2 ? 'Tap to reveal' : 'Swipe or Tap for next';

    return `
    <div class="card flashcard" id="active-card" onclick="window.handleCardTap()">
      <div class="hanzi">${card.hanzi}</div>
      <div class="pinyin ${showPinyin ? '' : 'hidden'}">${card.pinyin}</div>
      <div class="meaning ${showMeaning ? '' : 'hidden'}">${card.meaning}</div>
      <div class="hint">${nextStepText}</div>
    </div>
    
    <div class="controls">
      <button class="btn btn-secondary" onclick="window.prevCard(event)">←</button>
      <span>${state.currentCardIndex + 1} / ${cards.length}</span>
      <button class="btn btn-secondary" onclick="window.nextCard(event)">→</button>
    </div>
  `;
  }

  // Actions
  window.loadLesson = (id) => {
    navigate('lesson', { lessonId: id });
    setTimeout(() => {
      const container = document.getElementById('quiz-container');
      if (container) container.innerHTML = renderQuiz(state.flashcards);
      initSwipe();
    }, 0);
  };

  window.startWeeklyChallenge = () => {
    const targetLessonNum = getWeeklyTargetLesson();
    const targetLesson = lessons.find(l => l.level === 'HSK2' && l.lesson === targetLessonNum);

    if (targetLesson) {
      state.currentLessonId = targetLesson.id;
      state.view = 'lesson';
      state.activeTab = 'practice';
      state.showPdf = false;
      state.scope = 'hsk2_cumulative'; // Default to cumulative for weekly challenge
      loadFlashcardsForScope();
      render();
      setTimeout(() => {
        const container = document.getElementById('quiz-container');
        if (container) container.innerHTML = renderQuiz(state.flashcards);
        initSwipe();
      }, 0);
    } else {
      alert("Could not load weekly challenge.");
    }
  };

  window.goHome = () => navigate('home');

  window.togglePdf = () => {
    state.showPdf = !state.showPdf;
    render();
    setTimeout(() => {
      const container = document.getElementById('quiz-container');
      if (container) container.innerHTML = renderQuiz(state.flashcards);
      initSwipe();
    }, 0);
  };

  window.setScope = (scope) => {
    state.scope = scope;
    loadFlashcardsForScope();
    render();
    setTimeout(() => {
      const container = document.getElementById('quiz-container');
      if (container) container.innerHTML = renderQuiz(state.flashcards);
      initSwipe();
    }, 0);
  };

  window.handleCardTap = () => {
    if (state.revealStep < 2) {
      state.revealStep++;
    } else {
      window.nextCard();
      return;
    }
    const container = document.getElementById('quiz-container');
    container.innerHTML = renderQuiz(state.flashcards);
    initSwipe();
  };

  window.prevCard = (e) => {
    if (e) e.stopPropagation();
    if (state.currentCardIndex > 0) {
      state.currentCardIndex--;
      state.revealStep = 0;
      const container = document.getElementById('quiz-container');
      container.innerHTML = renderQuiz(state.flashcards);
      initSwipe();
    }
  };

  window.nextCard = (e) => {
    if (e) e.stopPropagation();
    state.currentCardIndex++;
    state.revealStep = 0;
    const container = document.getElementById('quiz-container');
    container.innerHTML = renderQuiz(state.flashcards);
    initSwipe();
  };

  window.restartQuiz = () => {
    state.currentCardIndex = 0;
    state.revealStep = 0;
    state.flashcards = state.flashcards.sort(() => Math.random() - 0.5);
    const container = document.getElementById('quiz-container');
    container.innerHTML = renderQuiz(state.flashcards);
    initSwipe();
  };

  // Swipe Logic
  function initSwipe() {
    const card = document.getElementById('active-card');
    if (!card) return;

    let touchStartX = 0;
    let touchEndX = 0;

    card.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    });

    card.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });

    function handleSwipe() {
      const threshold = 50;
      if (touchEndX < touchStartX - threshold) {
        window.nextCard(); // Swipe Left -> Next
      }
      if (touchEndX > touchStartX + threshold) {
        window.prevCard(); // Swipe Right -> Prev
      }
    }
  }

  // Keyboard Support
  document.addEventListener('keydown', (e) => {
    if (state.view === 'home') return;

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      window.handleCardTap();
    } else if (e.code === 'ArrowRight') {
      window.nextCard();
    } else if (e.code === 'ArrowLeft') {
      window.prevCard();
    }
  });

  // Main Render
  function render() {
    if (state.view === 'home') {
      app.innerHTML = renderHome();
    } else if (state.view === 'lesson') {
      app.innerHTML = renderLesson();
    } else if (state.view === 'cumulative') {
      app.innerHTML = `
      <div class="nav-bar">
        <button class="btn btn-secondary" onclick="window.goHome()">← Back</button>
        <h2>Cumulative Test</h2>
      </div>
      <div id="quiz-container">${renderQuiz(state.flashcards)}</div>
    `;
    }
  }

  // Init
  render();
} catch (e) {
  alert("Init Error: " + e.message + "\n" + e.stack);
}
