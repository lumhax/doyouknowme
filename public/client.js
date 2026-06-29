// Socket initialization
const socket = io({
  transports: ['polling', 'websocket']
});

// Sound system definitions
const sounds = {
  bgMusic: new Audio('sounds/bg_music.mp3'),
  click: new Audio('sounds/click.mp3'),
  correct: new Audio('sounds/correct.mp3'),
  incorrect: new Audio('sounds/incorrect.mp3'),
  splash1: new Audio('sounds/splash1.mp3'),
  splash2: new Audio('sounds/splash2.mp3'),
  timerTick: new Audio('sounds/timer_tick.mp3'),
  victory: new Audio('sounds/victory.mp3')
};

sounds.bgMusic.loop = true;
sounds.bgMusic.volume = 0.3; // Default 30% volume
sounds.bgMusic.addEventListener('ended', function() {
  this.currentTime = 0;
  this.play().catch(e => console.warn("Loop playback failed:", e));
}, false);

let sfxVolume = 0.7;

function playSound(key) {
  const audio = sounds[key];
  if (audio) {
    audio.volume = sfxVolume;
    audio.currentTime = 0;
    audio.play().catch(e => console.warn(`Audio play blocked for ${key}:`, e));
  }
}

function handleStateSounds(newState) {
  if (!currentLobbyState) return;
  const oldState = currentLobbyState;
  
  // 1. Transition to RESULTS
  if (newState.gameState === 'RESULTS' && oldState.gameState !== 'RESULTS') {
    sounds.bgMusic.pause();
    playSound('victory');
    return;
  }
  
  // Resume background music if leaving RESULTS
  if (newState.gameState !== 'RESULTS' && oldState.gameState === 'RESULTS') {
    sounds.bgMusic.play().catch(e => {});
  }
  
  // 2. Answering timer tick (last 10 seconds)
  if (newState.gameState === 'ANSWERING') {
    if (newState.timer <= 10 && newState.timer > 0) {
      if (oldState.gameState !== 'ANSWERING' || oldState.timer !== newState.timer) {
        playSound('timerTick');
      }
    }
  }
  
  // 3. Judgment sounds (correct / incorrect)
  if (newState.gameState === 'JUDGING') {
    const oldAnswers = oldState.currentAnswers || [];
    const newAnswers = newState.currentAnswers || [];
    
    for (let i = 0; i < oldAnswers.length; i++) {
      const oldAns = oldAnswers[i];
      const newAns = newAnswers[i];
      if (newAns && oldAns.isValid === null && newAns.isValid !== null) {
        if (newAns.isValid === true) {
          playSound('correct');
        } else {
          playSound('incorrect');
        }
        break;
      }
    }
  }
}

socket.on('connect', () => {
  console.log("Connecté au serveur Socket.io avec l'ID:", socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn("Déconnecté du serveur:", reason);
  // Stop background music and tick sounds on disconnect
  sounds.bgMusic.pause();
  sounds.timerTick.pause();
});

socket.on('connect_error', (err) => {
  console.error("Erreur de connexion Socket.io:", err);
});

// State variables
let currentLobbyState = null;
let currentAvatarIndex = 0;
let tutorialSlideIndex = 0;

// AVATARS SYSTEM (Inline SVG vectors for zero external asset dependencies)
const avatars = [
  { key: 'avatar_01', name: 'Poulet Rigolo', path: 'avatar_01.png' },
  { key: 'avatar_02', name: 'Canard Casqué', path: 'avatar_02.png' },
  { key: 'avatar_03', name: 'Grenouille Couronne', path: 'avatar_03.png' },
  { key: 'avatar_04', name: 'Renard Feuille', path: 'avatar_04.png' },
  { key: 'avatar_05', name: 'Chat Lunettes', path: 'avatar_05.png' }
];
function generateAvatarSVG(avatarKey) {
  const std = avatars.find(a => a.key === avatarKey);
  const path = std ? std.path : 'avatar_01.png';
  return `<img src="${path}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
}

// TUTORIAL STEPS
const tutorialSlides = [
  {
    title: "📞 PASSE UN COUP DE FIL !",
    desc: "Lance un appel vocal avec tes potes (Discord, Zoom...) et partage-leur le code secret du salon !",
    badge: "ÉTAPE 1",
    html: `<div class="comic-panel-wrapper color-purple">
      <img src="avatar_02.png" class="comic-char-img" alt="Pigeon">
      <div class="comic-bubble">Allo? 📞</div>
    </div>`
  },
  {
    title: "❓ POSE TA QUESTION",
    desc: "Écris une question secrète sur toi, ou pioche une question aléatoire parmi nos thèmes insolites !",
    badge: "ÉTAPE 2",
    html: `<div class="comic-panel-wrapper color-cyan">
      <img src="avatar_03.png" class="comic-char-img" alt="Grenouille">
      <div class="comic-bubble">Secret! 🤫</div>
    </div>`
  },
  {
    title: "🤔 DEVINE LES SECRETS",
    desc: "Les autres joueurs écrivent en simultané ce qu'ils pensent être ta vraie réponse. Pas de pitié !",
    badge: "ÉTAPE 3",
    html: `<div class="comic-panel-wrapper color-yellow">
      <img src="avatar_04.png" class="comic-char-img" alt="Renard">
      <div class="comic-bubble">Je sais! 💡</div>
    </div>`
  },
  {
    title: "🏆 JUGE & GAGNE !",
    desc: "Valide les bonnes réponses. Chaque réussite rapporte des points de complicité. Qui te connaît le mieux ?",
    badge: "ÉTAPE 4",
    html: `<div class="comic-panel-wrapper color-green">
      <img src="avatar_05.png" class="comic-char-img" alt="Chat">
      <div class="comic-bubble">Gagné! 🏆</div>
    </div>`
  }
];

// DOM ELEMENTS
const screens = {
  login: document.getElementById('screen-login'),
  lobby: document.getElementById('screen-lobby'),
  picking: document.getElementById('screen-picking'),
  answering: document.getElementById('screen-answering'),
  judging: document.getElementById('screen-judging'),
  results: document.getElementById('screen-results')
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  renderAvatarPreview();
  renderTutorialSlide();
  setupEventListeners();
});

// FUNCTIONS
function renderAvatarPreview() {
  const container = document.getElementById('avatar-preview-box');
  if (container) {
    container.innerHTML = generateAvatarSVG(avatars[currentAvatarIndex].key);
  }
}

function renderTutorialSlide() {
  const slide = tutorialSlides[tutorialSlideIndex];
  document.getElementById('tutorial-badge').textContent = slide.badge;
  document.getElementById('tutorial-title').textContent = slide.title;
  document.getElementById('tutorial-desc').textContent = slide.desc;
  document.getElementById('tutorial-graphic-container').innerHTML = slide.html;
  
  const slideEl = document.getElementById('tutorial-slide');
  if (slideEl) {
    slideEl.style.animation = 'none';
    slideEl.offsetHeight; // Trigger browser reflow
    slideEl.style.animation = null;
  }
  
  // Update dots
  const dots = document.querySelectorAll('#tut-dots .dot');
  dots.forEach((dot, idx) => {
    if (idx === tutorialSlideIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function switchScreen(screenId) {
  Object.keys(screens).forEach(key => {
    if (key === screenId) {
      screens[key].classList.add('active');
    } else {
      screens[key].classList.remove('active');
    }
  });
}

// EVENT LISTENERS SETUP
function setupEventListeners() {
  // Splash Start Button (Triggers rotation sound, schedules slide up sound, and starts background music)
  const splashStartBtn = document.getElementById('splashStartBtn');
  if (splashStartBtn) {
    splashStartBtn.addEventListener('click', () => {
      // Add .started to trigger CSS animations
      document.querySelector('.game-container').classList.add('started');
      
      // Play splash 1 (rotation) immediately
      playSound('splash1');
      
      // Play splash 2 (slide up) at 1320ms (60% of 2.2s animation time, start of slide-up)
      setTimeout(() => {
        playSound('splash2');
      }, 1320);
      
      // Play background music loop
      sounds.bgMusic.play().catch(err => console.warn("Music play blocked:", err));
    });
  }

  // Volume Popup Toggler and Sliders
  const volumePopBtn = document.getElementById('volumePopBtn');
  const volumePopup = document.getElementById('volumePopup');
  if (volumePopBtn && volumePopup) {
    volumePopBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      volumePopup.classList.toggle('active');
    });

    // Prevent clicks inside popup from closing it
    volumePopup.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Close volume popup when clicking anywhere else
    document.addEventListener('click', () => {
      volumePopup.classList.remove('active');
    });

    // Music Volume slider
    const musicVolumeSlider = document.getElementById('musicVolume');
    if (musicVolumeSlider) {
      musicVolumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        sounds.bgMusic.volume = val;
      });
    }

    // SFX Volume slider
    const sfxVolumeSlider = document.getElementById('sfxVolume');
    if (sfxVolumeSlider) {
      sfxVolumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        sfxVolume = val;
      });
    }
  }

  // Generic Button Click SFX listener
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, .lang-btn, .nav-arrow, .tab-btn, .random-avatar-btn, .judge-btn');
    // Don't play click sound on the splash start button itself since it plays splash1
    if (target && target.id !== 'splashStartBtn') {
      playSound('click');
    }
  });

  // Avatar Randomizer
  document.getElementById('randomizeAvatarBtn').addEventListener('click', () => {
    currentAvatarIndex = (currentAvatarIndex + 1) % avatars.length;
    renderAvatarPreview();
  });

  // Tutorial Arrows
  document.getElementById('tut-prev').addEventListener('click', () => {
    tutorialSlideIndex = (tutorialSlideIndex - 1 + tutorialSlides.length) % tutorialSlides.length;
    renderTutorialSlide();
  });
  
  document.getElementById('tut-next').addEventListener('click', () => {
    tutorialSlideIndex = (tutorialSlideIndex + 1) % tutorialSlides.length;
    renderTutorialSlide();
  });

  // Login Start Button
  document.getElementById('startGameBtn').addEventListener('click', () => {
    const nicknameInput = document.getElementById('nickname-input');
    const roomInput = document.getElementById('room-input');
    
    const username = nicknameInput.value.trim() || 'Anonyme';
    const lobbyId = roomInput.value.trim().toUpperCase();
    const avatar = avatars[currentAvatarIndex].key;
    
    // Join lobby room
    socket.emit('join-room', { username, avatar, lobbyId });
  });

  // Copy Lobby Code Link
  document.getElementById('copyCodeBtn').addEventListener('click', () => {
    if (!currentLobbyState) return;
    const lobbyId = currentLobbyState.lobbyId;
    
    // Copy only code or build local URL
    navigator.clipboard.writeText(lobbyId).then(() => {
      const copyBtn = document.getElementById('copyCodeBtn');
      copyBtn.textContent = "Copié !";
      setTimeout(() => {
        copyBtn.textContent = "Copier le code";
      }, 2000);
    });
  });

  // Lobby Ready Toggle
  document.getElementById('readyBtn').addEventListener('click', () => {
    socket.emit('toggle-ready');
  });

  // Questioner: Random Question trigger
  document.getElementById('randomQuestionBtn').addEventListener('click', () => {
    socket.emit('pick-random-question');
  });

  // Questioner: Submit question trigger
  document.getElementById('submitQuestionBtn').addEventListener('click', () => {
    const qInput = document.getElementById('question-input');
    const questionText = qInput.value.trim();
    const questionCategory = document.getElementById('question-category-display').textContent;
    
    if (!questionText) {
      alert("Veuillez saisir ou choisir une question !");
      return;
    }
    
    socket.emit('submit-question', { text: questionText, category: questionCategory });
    qInput.value = '';
  });

  // Guesser: Submit answer trigger
  document.getElementById('submitAnswerBtn').addEventListener('click', () => {
    const answerInput = document.getElementById('answer-input');
    const answerText = answerInput.value.trim();
    
    if (!answerText) {
      alert("Veuillez écrire une réponse !");
      return;
    }
    
    socket.emit('submit-answer', { answerText });
    answerInput.value = '';
    
    // Disable button to prevent double submits
    const submitBtn = document.getElementById('submitAnswerBtn');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = "RÉPONSE ENVOYÉE...";
  });

  // Questioner: Judge Answer Correct (Green)
  document.getElementById('judgeValidBtn').addEventListener('click', () => {
    if (!currentLobbyState) return;
    socket.emit('judge-answer', {
      answerIndex: currentLobbyState.currentAnswerIndex,
      isValid: true
    });
  });

  // Questioner: Judge Answer Incorrect (Red)
  document.getElementById('judgeInvalidBtn').addEventListener('click', () => {
    if (!currentLobbyState) return;
    socket.emit('judge-answer', {
      answerIndex: currentLobbyState.currentAnswerIndex,
      isValid: false
    });
  });

  // Results: Restart Game trigger
  document.querySelectorAll('#restartGameBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      socket.emit('restart-game');
    });
  });
}

// SOCKET MESSAGE HANDLING
socket.on('room-state', (roomState) => {
  handleStateSounds(roomState);
  currentLobbyState = roomState;
  
  // Transition screens based on state
  switch (roomState.gameState) {
    case 'LOBBY':
      renderLobbyView(roomState);
      switchScreen('lobby');
      break;
    case 'PICKING':
      renderPickingView(roomState);
      switchScreen('picking');
      break;
    case 'ANSWERING':
      renderAnsweringView(roomState);
      switchScreen('answering');
      break;
    case 'JUDGING':
      renderJudgingView(roomState);
      switchScreen('judging');
      break;
    case 'RESULTS':
      renderResultsView(roomState);
      switchScreen('results');
      break;
  }
});

// VIEW RENDERERS

// 1. LOBBY VIEW
function renderLobbyView(state) {
  document.getElementById('display-lobby-code').textContent = state.lobbyId;
  document.getElementById('player-count').textContent = state.players.length;
  
  const playersContainer = document.getElementById('lobby-players-list');
  playersContainer.innerHTML = '';
  
  state.players.forEach(p => {
    const avatarSVG = generateAvatarSVG(p.avatar);
    
    const row = document.createElement('div');
    row.className = 'player-row';
    
    const statusText = p.isReady ? 'PRÊT' : 'ATTENTE';
    const statusClass = p.isReady ? 'status-ready' : 'status-waiting';
    
    row.innerHTML = `
      <div class="player-info">
        <div class="player-avatar">${avatarSVG}</div>
        <div class="player-name">${p.username} ${p.id === socket.id ? '(Vous)' : ''}</div>
      </div>
      <div class="player-status ${statusClass}">${statusText}</div>
    `;
    
    playersContainer.appendChild(row);
  });
  
  // Ready button toggler label
  const localPlayer = state.players.find(p => p.id === socket.id);
  const readyBtn = document.getElementById('readyBtn');
  
  if (localPlayer && localPlayer.isReady) {
    readyBtn.classList.add('active');
    readyBtn.querySelector('span').textContent = "JE SUIS PRÊT !";
  } else {
    readyBtn.classList.remove('active');
    readyBtn.querySelector('span').textContent = "S'INSCRIRE COMME PRÊT";
  }
}

// 2. PICKING VIEW
function renderPickingView(state) {
  const isQuestioner = state.currentQuestioner.id === socket.id;
  
  const questionerView = document.getElementById('picking-questioner-view');
  const guesserView = document.getElementById('picking-guesser-view');
  
  if (isQuestioner) {
    questionerView.style.display = 'block';
    guesserView.style.display = 'none';
    
    // Sync picked question if it exists in state
    if (state.currentQuestion) {
      document.getElementById('question-input').value = state.currentQuestion.text;
      document.getElementById('question-category-display').textContent = state.currentQuestion.category;
    } else {
      document.getElementById('question-input').value = '';
      document.getElementById('question-category-display').textContent = 'Custom';
    }
  } else {
    questionerView.style.display = 'none';
    guesserView.style.display = 'block';
    
    document.getElementById('waiting-questioner-name').textContent = state.currentQuestioner.username;
    
    const questionerAvatarSVG = generateAvatarSVG(state.currentQuestioner.avatar);
    document.getElementById('waiting-questioner-avatar').innerHTML = questionerAvatarSVG;
  }
}

// 3. ANSWERING VIEW
function renderAnsweringView(state) {
  document.getElementById('answering-round').textContent = state.currentRound;
  document.getElementById('answering-max-rounds').textContent = state.maxRounds;
  
  // Update Timer
  const timerBox = document.getElementById('answering-timer');
  timerBox.textContent = state.timer;
  
  if (state.timer <= 10) {
    timerBox.style.backgroundColor = 'var(--bg-magenta)';
    timerBox.style.transform = 'scale(1.1)';
  } else {
    timerBox.style.backgroundColor = 'var(--neon-magenta)';
    timerBox.style.transform = 'scale(1.0)';
  }

  const isQuestioner = state.currentQuestioner.id === socket.id;
  const guesserView = document.getElementById('answering-guesser-view');
  const questionerView = document.getElementById('answering-questioner-view');

  if (!isQuestioner) {
    guesserView.style.display = 'block';
    questionerView.style.display = 'none';

    document.getElementById('answering-questioner-name').textContent = state.currentQuestioner.username;
    document.getElementById('answering-category').textContent = state.currentQuestion.category;
    document.getElementById('answering-question-text').textContent = state.currentQuestion.text;

    // Reset answer form buttons if state refreshed and player hasn't answered
    const hasAnswered = state.players.find(p => p.id === socket.id)?.hasAnswered;
    const submitBtn = document.getElementById('submitAnswerBtn');
    
    if (!hasAnswered) {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = "SOUMETTRE MA RÉPONSE";
    }
  } else {
    guesserView.style.display = 'none';
    questionerView.style.display = 'block';

    document.getElementById('answering-q-category').textContent = state.currentQuestion.category;
    document.getElementById('answering-q-text').textContent = state.currentQuestion.text;

    // Render list of who has answered
    const statusContainer = document.getElementById('answering-status-container');
    statusContainer.innerHTML = '';

    state.players.forEach(p => {
      // Questioner doesn't need to answer
      if (p.id === state.currentQuestioner.id) return;

      const item = document.createElement('div');
      item.className = 'status-item';
      
      const badgeClass = p.hasAnswered ? 'badge-done' : 'badge-pending';
      const badgeText = p.hasAnswered ? 'RÉPONDU' : 'ÉCRIT...';

      item.innerHTML = `
        <div class="player-name">${p.username}</div>
        <div class="status-badge ${badgeClass}">${badgeText}</div>
      `;
      statusContainer.appendChild(item);
    });
  }
}

// 4. JUDGING VIEW
function renderJudgingView(state) {
  document.getElementById('judging-questioner-name').textContent = state.currentQuestioner.username;
  document.getElementById('judging-question-text').textContent = state.currentQuestion.text;

  // Set up reveal info
  const currentAnswer = state.currentAnswers[state.currentAnswerIndex];
  
  if (currentAnswer) {
    document.getElementById('reveal-player-name').textContent = currentAnswer.username;
    document.getElementById('reveal-answer-bubble').textContent = `"${currentAnswer.answerText}"`;
  }

  const isQuestioner = state.currentQuestioner.id === socket.id;
  const questionerControls = document.getElementById('judging-questioner-controls');
  const guesserControls = document.getElementById('judging-guesser-controls');

  if (isQuestioner) {
    questionerControls.style.display = 'flex';
    guesserControls.style.display = 'none';
  } else {
    questionerControls.style.display = 'none';
    guesserControls.style.display = 'flex';

    document.getElementById('judging-active-questioner').textContent = state.currentQuestioner.username;
    document.getElementById('judging-progress').textContent = state.currentAnswerIndex + 1;
    document.getElementById('judging-total-answers').textContent = state.currentAnswers.length;

    const questionerAvatarSVG = generateAvatarSVG(state.currentQuestioner.avatar);
    document.getElementById('judging-waiting-avatar').innerHTML = questionerAvatarSVG;
  }
}

// 5. RESULTS VIEW
function renderResultsView(state) {
  const container = document.getElementById('results-leaderboard-container');
  container.innerHTML = '';

  // Sort players by score descending
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);

  sortedPlayers.forEach((p, idx) => {
    const avatarSVG = generateAvatarSVG(p.avatar);
    
    const row = document.createElement('div');
    row.className = 'result-row';
    
    row.innerHTML = `
      <div class="rank-badge">${idx + 1}</div>
      <div class="results-player-info">
        <div class="player-avatar" style="width: 34px; height: 34px;">${avatarSVG}</div>
        <div class="player-name">${p.username} ${p.id === socket.id ? '(Vous)' : ''}</div>
      </div>
      <div class="results-score-value">${p.score} pts</div>
    `;
    
    container.appendChild(row);
  });

  // Render Affinities Graph connections
  const affinitiesContainer = document.getElementById('affinity-connections-container');
  affinitiesContainer.innerHTML = '';

  let hasAffinities = false;

  state.players.forEach(p => {
    let maxPoints = 0;
    let bestGuesser = null;

    state.players.forEach(g => {
      if (g.id === p.id) return;
      const points = state.affinities[`${g.id}:${p.id}`] || 0;
      if (points > maxPoints) {
        maxPoints = points;
        bestGuesser = g;
      }
    });

    if (bestGuesser && maxPoints > 0) {
      hasAffinities = true;
      const targetAvatarSVG = generateAvatarSVG(p.avatar);
      const guesserAvatarSVG = generateAvatarSVG(bestGuesser.avatar);

      const card = document.createElement('div');
      card.className = 'affinity-card';

      card.innerHTML = `
        <!-- Person who was questioned (Target) -->
        <div class="bubble-node target">
          <div class="avatar-wrapper">${targetAvatarSVG}</div>
          <span>${p.username}</span>
        </div>

        <!-- Connection Link -->
        <div class="connector-link">
          <div class="affinity-badge">❤️ COMPLICITÉ</div>
          <div class="connector-line"></div>
          <div class="affinity-label">${maxPoints} pts d'amitié</div>
        </div>

        <!-- Person who guessed best (Guesser) -->
        <div class="bubble-node guesser">
          <div class="avatar-wrapper">${guesserAvatarSVG}</div>
          <span>${bestGuesser.username}</span>
        </div>
      `;

      affinitiesContainer.appendChild(card);
    }
  });

  if (!hasAffinities) {
    affinitiesContainer.innerHTML = `
      <div class="center-content" style="min-height: 80px; color: var(--color-muted); font-size: 13px;">
        Aucune bonne réponse n'a été trouvée cette partie. Tentez encore !
      </div>
    `;
  }
}
