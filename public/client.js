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
  
  // Resume background music on reconnect if the game has already started
  const container = document.querySelector('.game-container');
  if (container && container.classList.contains('started') && sounds.bgMusic.volume > 0) {
    if (sounds.bgMusic.paused && (!currentLobbyState || currentLobbyState.gameState !== 'RESULTS')) {
      sounds.bgMusic.play().catch(err => console.warn("Failed to resume background music on reconnect:", err));
    }
  }
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
let lastQuestionId = null;
let currentLanguage = localStorage.getItem('lang') || 'fr';

const i18n = {
  fr: {
    lancerJeu: "LANCER LE JEU",
    logoSub: "VOYONS QUI SONT TES VRAIS POTES !",
    joinOrCreate: "🎮 REJOINDRE OU CRÉER",
    chooseAvatar: "CHOISIS UN PERSONNAGE ET UN SURNOM",
    nicknamePlaceholder: "POULITO94",
    tabCreate: "🎮 CRÉER",
    tabJoin: "⚡ REJOINDRE",
    createLobby: "🎮 CRÉER UN SALON",
    roomInputPlaceholder: "EX: XYZ123",
    joinLobby: "REJOINDRE ⚡",
    howToPlay: "COMMENT JOUER",
    playersLabel: "JOUEURS",
    lobbyTitle: "SALON DE JEU",
    lobbyCodeLabel: "CODE DU SALON",
    copyCodeBtnLabel: "Copier le code",
    readyBtnLabel: "S'INSCRIRE COMME PRÊT",
    readyBtnActive: "JE SUIS PRÊT !",
    yourTurnTitle: "C'EST VOTRE TOUR DE CHOISIR !",
    pickingInstructions: "Proposez une question pour que les autres joueurs essaient de deviner votre réponse. Vous pouvez écrire votre propre question ou en choisir une au hasard.",
    yourQuestionLabel: "VOTRE QUESTION",
    questionPlaceholder: "Saisissez une question ici...",
    randomBtnLabel: "ALÉATOIRE",
    launchQuestionBtnLabel: "LANCER LA QUESTION",
    waitingForQuestionerTitle: "EN ATTENTE DU QUESTIONNEUR...",
    roundLabel: "Manche",
    yourAnswerLabel: "VOTRE RÉPONSE (QUE DIRAIENT-ILS ?)",
    answerPlaceholder: "Écrivez votre réponse ici...",
    submitAnswerBtnLabel: "SOUMETTRE MA RÉPONSE",
    answerSubmitted: "RÉPONSE ENVOYÉE...",
    othersAnsweringTitle: "LES AUTRES JOUEURS RÉPONDENT...",
    judgingTitle: "RÉVÉLATION & JUGEMENT",
    isAnswerCorrectLabel: "EST-CE QUE CETTE RÉPONSE EST CORRECTE ?",
    incorrectBtnLabel: "INCORRECT",
    correctBtnLabel: "CORRECT",
    resultsTitle: "TABLEAU DES RÉSULTATS (AFFINITÉS)",
    resultsIntro: "Voici qui vous connaît le mieux !",
    complicityTitle: "🧬 LES COMPLICITÉS DÉCOUVERTES",
    playAgainBtnLabel: "REJOUER UNE PARTIE",
    termsLink: "CONDITIONS D'UTILISATION",
    privacyLink: "CONFIDENTIALITÉ",
    contactLink: "CONTACT",
    musicSliderLabel: "🎵 Musique",
    sfxSliderLabel: "🔊 Effets",
    settingsTitle: "⚙️ PARAMÈTRES",
    lobbyRulesInfo: "Le jeu se déroule en <strong>3 manches</strong> de questions. Chaque joueur passera au rôle de Questionneur à son tour.",
    lobbyWarningInfo: "Le jeu démarrera automatiquement dès que tous les joueurs connectés cliqueront sur \"PRÊT\" !",
    randomizeAvatarTooltip: "Changer de personnage",
    settingsBtnTooltip: "Réglages",
    volumePopBtnTooltip: "Réglages du son",
    alertNoRoomCode: "Veuillez saisir un code de salon !",
    alertNoQuestion: "Veuillez saisir ou choisir une question !",
    alertNoAnswer: "Veuillez écrire une réponse !",
    leaveLobbyBtnLabel: "QUITTER LE SALON",
    abandonBtnLabel: "ABANDONNER 🏳️",
    noAnswerText: "[Pas de réponse à temps]"
  },
  en: {
    lancerJeu: "START GAME",
    logoSub: "FIND OUT WHO YOUR REAL FRIENDS ARE!",
    joinOrCreate: "🎮 JOIN OR CREATE",
    chooseAvatar: "CHOOSE A CHARACTER AND A NICKNAME",
    nicknamePlaceholder: "POULITO94",
    tabCreate: "🎮 CREATE",
    tabJoin: "⚡ JOIN",
    createLobby: "🎮 CREATE LOBBY",
    roomInputPlaceholder: "EG: XYZ123",
    joinLobby: "JOIN LOBBY ⚡",
    howToPlay: "HOW TO PLAY",
    playersLabel: "PLAYERS",
    lobbyTitle: "GAME LOBBY",
    lobbyCodeLabel: "LOBBY CODE",
    copyCodeBtnLabel: "Copy code",
    readyBtnLabel: "MARK AS READY",
    readyBtnActive: "I AM READY!",
    yourTurnTitle: "IT'S YOUR TURN TO CHOOSE!",
    pickingInstructions: "Propose a question for other players to guess your answer. You can write your own or choose a random one.",
    yourQuestionLabel: "YOUR QUESTION",
    questionPlaceholder: "Type a question here...",
    randomBtnLabel: "RANDOM",
    launchQuestionBtnLabel: "LAUNCH QUESTION",
    waitingForQuestionerTitle: "WAITING FOR QUESTIONER...",
    roundLabel: "Round",
    yourAnswerLabel: "YOUR ANSWER (WHAT WOULD THEY SAY?)",
    answerPlaceholder: "Type your answer here...",
    submitAnswerBtnLabel: "SUBMIT MY ANSWER",
    answerSubmitted: "ANSWER SUBMITTED...",
    othersAnsweringTitle: "OTHER PLAYERS ARE ANSWERING...",
    judgingTitle: "REVEAL & JUDGMENT",
    isAnswerCorrectLabel: "IS THIS ANSWER CORRECT?",
    incorrectBtnLabel: "INCORRECT",
    correctBtnLabel: "CORRECT",
    resultsTitle: "LEADERBOARD (AFFINITIES)",
    resultsIntro: "Here is who knows you best!",
    complicityTitle: "🧬 COMPLICITIES DISCOVERED",
    playAgainBtnLabel: "PLAY AGAIN",
    termsLink: "TERMS OF USE",
    privacyLink: "PRIVACY POLICY",
    contactLink: "CONTACT",
    musicSliderLabel: "🎵 Music",
    sfxSliderLabel: "🔊 Effects",
    settingsTitle: "⚙️ SETTINGS",
    lobbyRulesInfo: "The game takes place in <strong>3 rounds</strong> of questions. Each player will take turns being the Questioner.",
    lobbyWarningInfo: "The game will start automatically as soon as all connected players click \"READY\"!",
    randomizeAvatarTooltip: "Change character",
    settingsBtnTooltip: "Settings",
    volumePopBtnTooltip: "Sound settings",
    alertNoRoomCode: "Please enter a lobby code!",
    alertNoQuestion: "Please write or pick a question!",
    alertNoAnswer: "Please write an answer!",
    leaveLobbyBtnLabel: "LEAVE LOBBY",
    abandonBtnLabel: "ABANDON 🏳️",
    noAnswerText: "[No answer in time]"
  },
  es: {
    lancerJeu: "INICIAR JUEGO",
    logoSub: "¡DESCUBRE QUIÉNES SON TUS VERDADEROS AMIGOS!",
    joinOrCreate: "🎮 UNIRSE O CREAR",
    chooseAvatar: "ELIGE UN PERSONAJE Y UN APODO",
    nicknamePlaceholder: "POULITO94",
    tabCreate: "🎮 CREAR",
    tabJoin: "⚡ UNIRSE",
    createLobby: "🎮 CREAR SALA",
    roomInputPlaceholder: "EJ: XYZ123",
    joinLobby: "UNIRSE ⚡",
    howToPlay: "CÓMO JUGAR",
    playersLabel: "JUGADORES",
    lobbyTitle: "SALA DE JUEGO",
    lobbyCodeLabel: "CÓDIGO DE SALA",
    copyCodeBtnLabel: "Copiar código",
    readyBtnLabel: "MARCAR COMO LISTO",
    readyBtnActive: "¡ESTOY LISTO!",
    yourTurnTitle: "¡ES TU TURN DE ELEGIR!",
    pickingInstructions: "Propón una pregunta para que los demás intenten adivinar tu respuesta. Puedes escribir la tuya o elegir una al azar.",
    yourQuestionLabel: "TU PREGUNTA",
    questionPlaceholder: "Escribe una pregunta aquí...",
    randomBtnLabel: "ALEATORIO",
    launchQuestionBtnLabel: "LANZAR PREGUNTA",
    waitingForQuestionerTitle: "ESPERANDO AL INTERROGADOR...",
    roundLabel: "Ronda",
    yourAnswerLabel: "TU RESPUESTA (¿QUÉ DIRÍAN ELLOS?)",
    answerPlaceholder: "Escribe tu respuesta aquí...",
    submitAnswerBtnLabel: "ENVIAR MI RESPUESTA",
    answerSubmitted: "RESPUESTA ENVIADA...",
    othersAnsweringTitle: "LOS OTROS JUGADORES ESTÁN RESPONDIENDO...",
    judgingTitle: "REVELACIÓN Y JUICIO",
    isAnswerCorrectLabel: "¿ES CORRECTA ESTA RESPUESTA?",
    incorrectBtnLabel: "INCORRECTO",
    correctBtnLabel: "CORRECTO",
    resultsTitle: "TABLA DE RESULTADOS (AFINIDADES)",
    resultsIntro: "¡Aquí está quién te conoce mejor!",
    complicityTitle: "🧬 COMPLICIDADES DESCUBIERTAS",
    playAgainBtnLabel: "JUGAR DE NUEVO",
    termsLink: "CONDICIONES DE USO",
    privacyLink: "POLÍTICA DE PRIVACIDAD",
    contactLink: "CONTACTO",
    musicSliderLabel: "🎵 Música",
    sfxSliderLabel: "🔊 Efectos",
    settingsTitle: "⚙️ AJUSTES",
    lobbyRulesInfo: "El juego se desarrolla en <strong>3 rondas</strong> de preguntas. Cada jugador se turnará para ser el Interrogador.",
    lobbyWarningInfo: "¡El juego comenzará automáticamente tan pronto como todos los jugadores conectados hagan clic en \"LISTO\"!",
    randomizeAvatarTooltip: "Cambiar personaje",
    settingsBtnTooltip: "Ajustes",
    volumePopBtnTooltip: "Ajustes de sonido",
    alertNoRoomCode: "¡Por favor, introduce un código de sala!",
    alertNoQuestion: "¡Por favor, escribe o elige una pregunta!",
    alertNoAnswer: "¡Por favor, escribe una respuesta!",
    leaveLobbyBtnLabel: "ABANDONAR SALA",
    abandonBtnLabel: "ABANDONAR 🏳️",
    noAnswerText: "[Sin respuesta a tiempo]"
  },
  zh: {
    lancerJeu: "开始游戏",
    logoSub: "看看谁是你真正的朋友！",
    joinOrCreate: "🎮 加入或创建",
    chooseAvatar: "选择角色和昵称",
    nicknamePlaceholder: "POULITO94",
    tabCreate: "🎮 创建",
    tabJoin: "⚡ 加入",
    createLobby: "🎮 创建房间",
    roomInputPlaceholder: "例如: XYZ123",
    joinLobby: "加入 ⚡",
    howToPlay: "游戏玩法",
    playersLabel: "玩家",
    lobbyTitle: "游戏大厅",
    lobbyCodeLabel: "房间代码",
    copyCodeBtnLabel: "复制代码",
    readyBtnLabel: "标记为准备",
    readyBtnActive: "我准备好了！",
    yourTurnTitle: "轮到你选择了！",
    pickingInstructions: "提出一个问题，让其他玩家猜你的答案。你可以自己写，或者随机选择一个问题。",
    yourQuestionLabel: "你的问题",
    questionPlaceholder: "在这里输入问题...",
    randomBtnLabel: "随机",
    launchQuestionBtnLabel: "发布问题",
    waitingForQuestionerTitle: "等待出题者...",
    roundLabel: "回合",
    yourAnswerLabel: "你的答案（他们会怎么说？）",
    answerPlaceholder: "在这里输入你的答案...",
    submitAnswerBtnLabel: "提交我的答案",
    answerSubmitted: "答案已提交...",
    othersAnsweringTitle: "其他玩家正在回答...",
    judgingTitle: "揭晓与判定",
    isAnswerCorrectLabel: "这个答案正确吗？",
    incorrectBtnLabel: "不正确",
    correctBtnLabel: "正确",
    resultsTitle: "积分榜（亲密度）",
    resultsIntro: "谁最了解你！",
    complicityTitle: "🧬 发现的默契",
    playAgainBtnLabel: "再玩一局",
    termsLink: "服务条款",
    privacyLink: "隐私政策",
    contactLink: "联系我们",
    musicSliderLabel: "🎵 音乐",
    sfxSliderLabel: "🔊 音效",
    settingsTitle: "⚙️ 设置",
    lobbyRulesInfo: "游戏分为 <strong>3 回合</strong>。每个玩家将轮流担任出题者。",
    lobbyWarningInfo: "一旦所有已连接的玩家都点击“准备”，游戏将自动开始！",
    randomizeAvatarTooltip: "更换角色",
    settingsBtnTooltip: "设置",
    volumePopBtnTooltip: "音量设置",
    alertNoRoomCode: "请输入房间代码！",
    alertNoQuestion: "请写一个或选择一个问题！",
    alertNoAnswer: "请输入你的答案！",
    leaveLobbyBtnLabel: "退出房间",
    abandonBtnLabel: "放弃游戏 🏳️",
    noAnswerText: "[未及时回答]"
  }
};

const tutorialSlidesTranslations = {
  fr: [
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
  ],
  en: [
    {
      title: "📞 MAKE A CALL!",
      desc: "Launch a voice call with your friends (Discord, Zoom...) and share the lobby code with them!",
      badge: "STEP 1",
      html: `<div class="comic-panel-wrapper color-purple">
        <img src="avatar_02.png" class="comic-char-img" alt="Pigeon">
        <div class="comic-bubble">Hello? 📞</div>
      </div>`
    },
    {
      title: "❓ ASK YOUR QUESTION",
      desc: "Write a secret question about yourself, or pick a random one from our wacky topics!",
      badge: "STEP 2",
      html: `<div class="comic-panel-wrapper color-cyan">
        <img src="avatar_03.png" class="comic-char-img" alt="Grenouille">
        <div class="comic-bubble">Secret! 🤫</div>
      </div>`
    },
    {
      title: "🤔 GUESS THE SECRETS",
      desc: "Other players simultaneously type what they think is your real answer. No mercy!",
      badge: "STEP 3",
      html: `<div class="comic-panel-wrapper color-yellow">
        <img src="avatar_04.png" class="comic-char-img" alt="Renard">
        <div class="comic-bubble">I know! 💡</div>
      </div>`
    },
    {
      title: "🏆 JUDGE & WIN!",
      desc: "Validate the correct answers. Each success awards affinity points. Who knows you best?",
      badge: "STEP 4",
      html: `<div class="comic-panel-wrapper color-green">
        <img src="avatar_05.png" class="comic-char-img" alt="Chat">
        <div class="comic-bubble">Won! 🏆</div>
      </div>`
    }
  ],
  es: [
    {
      title: "📞 ¡HAZ UNA LLAMADA!",
      desc: "¡Inicia una llamada de voz con tus amigos (Discord, Zoom...) y comparte el código secreto de la sala!",
      badge: "PASO 1",
      html: `<div class="comic-panel-wrapper color-purple">
        <img src="avatar_02.png" class="comic-char-img" alt="Pigeon">
        <div class="comic-bubble">¿Allo? 📞</div>
      </div>`
    },
    {
      title: "❓ HAZ TU PREGUNTA",
      desc: "¡Escribe una pregunta secreta sobre ti, o elige una pregunta aleatoria de nuestros temas locos!",
      badge: "PASO 2",
      html: `<div class="comic-panel-wrapper color-cyan">
        <img src="avatar_03.png" class="comic-char-img" alt="Grenouille">
        <div class="comic-bubble">¡Secreto! 🤫</div>
      </div>`
    },
    {
      title: "🤔 ADIVINA LOS SECRETOS",
      desc: "Los otros jugadores escriben simultáneamente lo que creen que es tu respuesta real. ¡Sin piedad!",
      badge: "PASO 3",
      html: `<div class="comic-panel-wrapper color-yellow">
        <img src="avatar_04.png" class="comic-char-img" alt="Renard">
        <div class="comic-bubble">¡Lo sé! 💡</div>
      </div>`
    },
    {
      title: "🏆 ¡JUZGA Y GANA!",
      desc: "Valida las respuestas correctas. Cada éxito otorga puntos de afinidad. ¿Quién te conoce mejor?",
      badge: "PASO 4",
      html: `<div class="comic-panel-wrapper color-green">
        <img src="avatar_05.png" class="comic-char-img" alt="Chat">
        <div class="comic-bubble">¡Ganado! 🏆</div>
      </div>`
    }
  ],
  zh: [
    {
      title: "📞 打个电话！",
      desc: "和你的朋友发起语音通话（Discord、Zoom...）并与他们分享房间代码！",
      badge: "步骤 1",
      html: `<div class="comic-panel-wrapper color-purple">
        <img src="avatar_02.png" class="comic-char-img" alt="Pigeon">
        <div class="comic-bubble">喂? 📞</div>
      </div>`
    },
    {
      title: "❓ 提出你的问题",
      desc: "写一个关于你自己的秘密问题，或者从我们的怪异主题中随机选择一个！",
      badge: "步骤 2",
      html: `<div class="comic-panel-wrapper color-cyan">
        <img src="avatar_03.png" class="comic-char-img" alt="Grenouille">
        <div class="comic-bubble">秘密! 🤫</div>
      </div>`
    },
    {
      title: "🤔 猜猜秘密",
      desc: "其他玩家同时输入他们认为的你的真实答案。不要留情！",
      badge: "步骤 3",
      html: `<div class="comic-panel-wrapper color-yellow">
        <img src="avatar_04.png" class="comic-char-img" alt="Renard">
        <div class="comic-bubble">我知道了! 💡</div>
      </div>`
    },
    {
      title: "🏆 判定并获胜！",
      desc: "验证正确答案。每一次成功都会奖励亲密度。谁最了解你？",
      badge: "步骤 4",
      html: `<div class="comic-panel-wrapper color-green">
        <img src="avatar_05.png" class="comic-char-img" alt="Chat">
        <div class="comic-bubble">赢了! 🏆</div>
      </div>`
    }
  ]
};

function updateUILanguage() {
  const lang = currentLanguage;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) {
      // Translate title tooltip if present in keys
      const tooltipKey = key + "Tooltip";
      if (i18n[lang][tooltipKey]) {
        el.setAttribute('title', i18n[lang][tooltipKey]);
      }

      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.setAttribute('placeholder', i18n[lang][key]);
      } else {
        const span = el.querySelector('span:not([class*="-icon"])') || el.querySelector('span');
        if (span) {
          span.textContent = i18n[lang][key];
        } else {
          // If translation has HTML formatting (like strong tags), use innerHTML
          if (i18n[lang][key].includes('<') || i18n[lang][key].includes('>')) {
            el.innerHTML = i18n[lang][key];
          } else {
            el.textContent = i18n[lang][key];
          }
        }
      }
    }
  });

  const langFlagImg = document.getElementById('langFlagImg');
  const langLabel = document.getElementById('langLabel');
  if (langFlagImg && langLabel) {
    const flagSrcs = {
      fr: 'flags/france.png',
      en: 'flags/united-states.png',
      es: 'flags/spain.png',
      zh: 'flags/china.png'
    };
    const flagLabels = {
      fr: 'FR',
      en: 'EN',
      es: 'ES',
      zh: 'ZH'
    };
    // If the user preferred 'US' for the English option, we can map 'en' to 'US' or 'EN'. 
    // Since the prompt requested "FR, EN, ES, US", we will map English (en) to 'EN' but also support showing 'US' or 'EN'.
    // Let's use 'EN' since the language code is 'en', but write 'US' if the user explicitly prefers 'US'.
    // Let's write 'EN' as requested by "FR, EN, ES, US".
    langFlagImg.src = flagSrcs[lang] || 'flags/france.png';
    langFlagImg.alt = lang.toUpperCase();
    langLabel.textContent = flagLabels[lang] || lang.toUpperCase();
  }

  renderTutorialSlide();
}

// AVATARS SYSTEM (Inline SVG vectors for zero external asset dependencies)
const avatars = [
  { key: 'avatar_01', name: 'Poulet Rigolo', path: 'avatar_01.png' },
  { key: 'avatar_02', name: 'Canard Casqué', path: 'avatar_02.png' },
  { key: 'avatar_03', name: 'Grenouille Couronne', path: 'avatar_03.png' },
  { key: 'avatar_04', name: 'Renard Feuille', path: 'avatar_04.png' },
  { key: 'avatar_05', name: 'Chat Lunettes', path: 'avatar_05.png' },
  { key: 'avatar_06', name: 'Charlie Chaplin', path: 'avatar_06.png' }
];
function generateAvatarSVG(avatarKey) {
  const std = avatars.find(a => a.key === avatarKey);
  const path = std ? std.path : 'avatar_01.png';
  return `<img src="${path}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
}

// TUTORIAL STEPS


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
  updateUILanguage();
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
  const slides = tutorialSlidesTranslations[currentLanguage] || tutorialSlidesTranslations.fr;
  const slide = slides[tutorialSlideIndex];
  if (!slide) return;
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
    const slides = tutorialSlidesTranslations[currentLanguage] || tutorialSlidesTranslations.fr;
    tutorialSlideIndex = (tutorialSlideIndex - 1 + slides.length) % slides.length;
    renderTutorialSlide();
  });
  
  document.getElementById('tut-next').addEventListener('click', () => {
    const slides = tutorialSlidesTranslations[currentLanguage] || tutorialSlidesTranslations.fr;
    tutorialSlideIndex = (tutorialSlideIndex + 1) % slides.length;
    renderTutorialSlide();
  });

  // Create Lobby Button
  const createLobbyBtn = document.getElementById('createLobbyBtn');
  if (createLobbyBtn) {
    createLobbyBtn.addEventListener('click', () => {
      const nicknameInput = document.getElementById('nickname-input');
      const username = nicknameInput.value.trim() || 'Anonyme';
      const avatar = avatars[currentAvatarIndex].key;
      // Emit join-room with action 'create' to generate a new random room code
      socket.emit('join-room', { username, avatar, lobbyId: "", action: 'create' });
    });
  }

  // Join Lobby Button
  const joinLobbyBtn = document.getElementById('joinLobbyBtn');
  if (joinLobbyBtn) {
    joinLobbyBtn.addEventListener('click', () => {
      const nicknameInput = document.getElementById('nickname-input');
      const roomInput = document.getElementById('room-input');
      
      const username = nicknameInput.value.trim() || 'Anonyme';
      const lobbyId = roomInput.value.trim().toUpperCase();
      const avatar = avatars[currentAvatarIndex].key;
      
      if (!lobbyId) {
        alert(i18n[currentLanguage].alertNoRoomCode || "Veuillez saisir un code de salon !");
        return;
      }
      
      socket.emit('join-room', { username, avatar, lobbyId, action: 'join' });
    });
  }

  // Copy Lobby Code Link
  document.getElementById('copyCodeBtn').addEventListener('click', () => {
    if (!currentLobbyState) return;
    const lobbyId = currentLobbyState.lobbyId;
    
    // Copy only code
    const copyMessages = {
      fr: { copied: "Copié !", label: "Copier le code" },
      en: { copied: "Copied!", label: "Copy code" },
      es: { copied: "¡Copiado!", label: "Copiar código" },
      zh: { copied: "已复制!", label: "复制代码" }
    };
    const lang = currentLanguage;
    navigator.clipboard.writeText(lobbyId).then(() => {
      const copyBtn = document.getElementById('copyCodeBtn');
      copyBtn.textContent = copyMessages[lang].copied;
      setTimeout(() => {
        copyBtn.textContent = copyMessages[lang].label;
      }, 2000);
    });
  });

  // Lobby Ready Toggle
  document.getElementById('readyBtn').addEventListener('click', () => {
    socket.emit('toggle-ready');
  });

  // Lobby Leave Trigger
  const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
  if (leaveLobbyBtn) {
    leaveLobbyBtn.addEventListener('click', () => {
      socket.emit('leave-room');
      currentLobbyState = null;
      lastQuestionId = null; // Reset last question tracking
      switchScreen('login');
      // Hide global counter and abandon button
      const roundCounter = document.getElementById('global-round-counter');
      if (roundCounter) roundCounter.style.display = 'none';
      const abandonBtn = document.getElementById('abandonGameBtn');
      if (abandonBtn) abandonBtn.style.display = 'none';
    });
  }

  // Abandon Game Trigger
  const abandonGameBtn = document.getElementById('abandonGameBtn');
  if (abandonGameBtn) {
    abandonGameBtn.addEventListener('click', () => {
      const confirmMsg = {
        fr: "Voulez-vous vraiment abandonner la partie et retourner au menu principal ?",
        en: "Do you really want to abandon the game and return to the main menu?",
        es: "¿De verdad quieres abandonar la partida y volver al menú principal?",
        zh: "您确定要放弃游戏并返回主菜单吗？"
      };
      if (confirm(confirmMsg[currentLanguage] || confirmMsg.fr)) {
        socket.emit('leave-room');
        currentLobbyState = null;
        lastQuestionId = null; // Reset last question tracking
        switchScreen('login');
        const roundCounter = document.getElementById('global-round-counter');
        if (roundCounter) roundCounter.style.display = 'none';
        abandonGameBtn.style.display = 'none';
      }
    });
  }

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
      alert(i18n[currentLanguage].alertNoQuestion || "Veuillez saisir ou choisir une question !");
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
      alert(i18n[currentLanguage].alertNoAnswer || "Veuillez écrire une réponse !");
      return;
    }
    
    socket.emit('submit-answer', { answerText });
    answerInput.value = '';
    
    // Hide form container and show success confirmation
    const formContainer = document.getElementById('guesser-form-container');
    const submittedContainer = document.getElementById('guesser-submitted-container');
    if (formContainer) formContainer.style.display = 'none';
    if (submittedContainer) submittedContainer.style.display = 'flex';
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

  // Footer Links Modals
  const infoModal = document.getElementById('infoModal');
  const infoModalBody = document.getElementById('infoModalBody');
  const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');

  function openInfoModal(type) {
    const lang = currentLanguage;
    const content = (modalContent[lang] && modalContent[lang][type]) || (modalContent.fr && modalContent.fr[type]);
    if (content && infoModalBody && infoModal) {
      infoModalBody.innerHTML = content;
      infoModal.classList.add('active');
    }
  }

  function closeInfoModal() {
    if (infoModal) {
      infoModal.classList.remove('active');
    }
  }

  const termsLink = document.getElementById('link-terms');
  if (termsLink) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoModal('terms');
    });
  }

  const privacyLink = document.getElementById('link-privacy');
  if (privacyLink) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoModal('privacy');
    });
  }

  const contactLink = document.getElementById('link-contact');
  if (contactLink) {
    contactLink.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoModal('contact');
    });
  }

  if (infoModalCloseBtn) {
    infoModalCloseBtn.addEventListener('click', closeInfoModal);
  }

  if (infoModal) {
    infoModal.addEventListener('click', (e) => {
      if (e.target === infoModal) {
        closeInfoModal();
      }
    });
  }

  // Settings Modal Logic
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsModalCloseBtn = document.getElementById('settingsModalCloseBtn');

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      const musicInput = document.getElementById('settingsMusicVolume');
      const sfxInput = document.getElementById('settingsSfxVolume');
      if (musicInput) musicInput.value = sounds.bgMusic.volume;
      if (sfxInput) sfxInput.value = sfxVolume;
      settingsModal.classList.add('active');
    });
  }

  function closeSettingsModal() {
    if (settingsModal) {
      settingsModal.classList.remove('active');
    }
  }

  if (settingsModalCloseBtn) {
    settingsModalCloseBtn.addEventListener('click', closeSettingsModal);
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }

  // Bind settings music volume slider
  const settingsMusicVolume = document.getElementById('settingsMusicVolume');
  if (settingsMusicVolume) {
    settingsMusicVolume.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      sounds.bgMusic.volume = val;
      const oldSlider = document.getElementById('musicVolume');
      if (oldSlider) oldSlider.value = val;
    });
  }

  // Bind settings sfx volume slider
  const settingsSfxVolume = document.getElementById('settingsSfxVolume');
  if (settingsSfxVolume) {
    settingsSfxVolume.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      sfxVolume = val;
      const oldSlider = document.getElementById('sfxVolume');
      if (oldSlider) oldSlider.value = val;
    });
  }

  // Mobile settings legal links bindings
  const termsMobile = document.getElementById('link-terms-mobile');
  if (termsMobile) {
    termsMobile.addEventListener('click', () => {
      closeSettingsModal();
      openInfoModal('terms');
    });
  }

  const privacyMobile = document.getElementById('link-privacy-mobile');
  if (privacyMobile) {
    privacyMobile.addEventListener('click', () => {
      closeSettingsModal();
      openInfoModal('privacy');
    });
  }

  const contactMobile = document.getElementById('link-contact-mobile');
  if (contactMobile) {
    contactMobile.addEventListener('click', () => {
      closeSettingsModal();
      openInfoModal('contact');
    });
  }

  // Action Tab Selector Logic
  const tabBtnCreate = document.getElementById('tabBtnCreate');
  const tabBtnJoin = document.getElementById('tabBtnJoin');
  const actionPathCreate = document.getElementById('action-path-create');
  const actionPathJoin = document.getElementById('action-path-join');

  if (tabBtnCreate && tabBtnJoin && actionPathCreate && actionPathJoin) {
    tabBtnCreate.addEventListener('click', () => {
      tabBtnCreate.classList.add('active');
      tabBtnJoin.classList.remove('active');
      actionPathCreate.style.display = 'block';
      actionPathJoin.style.display = 'none';
    });

    tabBtnJoin.addEventListener('click', () => {
      tabBtnJoin.classList.add('active');
      tabBtnCreate.classList.remove('active');
      actionPathCreate.style.display = 'none';
      actionPathJoin.style.display = 'block';
    });
  }

  // Language Button Click Toggle
  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const order = ['fr', 'en', 'es', 'zh'];
      const nextIdx = (order.indexOf(currentLanguage) + 1) % order.length;
      currentLanguage = order[nextIdx];
      localStorage.setItem('lang', currentLanguage);
      updateUILanguage();
    });
  }

  // Dark Mode Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    const updateToggleIcon = () => {
      const isDark = document.documentElement.classList.contains('dark-theme');
      themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    };

    themeToggleBtn.addEventListener('click', () => {
      // Toggle ONLY on <html> — same element the init script uses
      document.documentElement.classList.toggle('dark-theme');
      // Keep body in sync for any CSS rules targeting .dark-theme on body
      document.body.classList.toggle('dark-theme', document.documentElement.classList.contains('dark-theme'));
      const isDark = document.documentElement.classList.contains('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateToggleIcon();
    });

    // Initialize button icon from current HTML element state
    updateToggleIcon();
  }
}

// SOCKET MESSAGE HANDLING
socket.on('room-state', (roomState) => {
  handleStateSounds(roomState);
  currentLobbyState = roomState;
  
  // Clear answer/question inputs if the question changes
  const currentQId = roomState.currentQuestion ? roomState.currentQuestion.id : null;
  if (currentQId !== lastQuestionId) {
    lastQuestionId = currentQId;
    const answerInput = document.getElementById('answer-input');
    if (answerInput) answerInput.value = '';
    const questionInput = document.getElementById('question-input');
    if (questionInput) questionInput.value = '';
  }
  
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

  // Update round counter global display
  const isLobby = roomState.gameState === 'LOBBY';
  const isResults = roomState.gameState === 'RESULTS';
  const inGame = !isLobby && !isResults;

  const globalRoundCounter = document.getElementById('global-round-counter');
  if (globalRoundCounter) {
    if (inGame) {
      globalRoundCounter.style.display = 'inline-block';
      document.getElementById('global-round-current').textContent = roomState.currentRound;
      document.getElementById('global-round-max').textContent = roomState.maxRounds;
    } else {
      globalRoundCounter.style.display = 'none';
    }
  }

  // Show/hide abandon button (visible in game and results)
  const abandonBtn = document.getElementById('abandonGameBtn');
  if (abandonBtn) {
    abandonBtn.style.display = (inGame || isResults) ? 'inline-block' : 'none';
  }

  // Show reaction bar only during active game phases (not lobby / results)
  const reactionBar = document.getElementById('reaction-bar');
  if (reactionBar) {
    const activePhases = ['PICKING', 'ANSWERING', 'JUDGING'];
    reactionBar.style.display = activePhases.includes(roomState.gameState) ? 'flex' : 'none';
  }
});

// ---- EMOJI REACTIONS ----

// Spawn a floating emoji on screen at random horizontal position
function spawnFloatingEmoji(emoji, username) {
  const stage = document.getElementById('reaction-stage');
  if (!stage) return;

  const el = document.createElement('div');
  el.className = 'floating-emoji';
  el.style.left = (10 + Math.random() * 80) + '%';
  // Slight random size variation for depth feel
  const scale = 0.85 + Math.random() * 0.5;
  el.style.fontSize = (36 * scale) + 'px';
  // Slight random duration variation
  const dur = 2.0 + Math.random() * 0.8;
  el.style.animationDuration = dur + 's';

  el.innerHTML = `${emoji}<div class="floating-emoji-label">${username}</div>`;
  stage.appendChild(el);

  // Remove from DOM after animation finishes
  setTimeout(() => el.remove(), dur * 1000 + 100);
}

// Listen for reactions from server → animate on screen
socket.on('reaction-received', ({ emoji, username }) => {
  spawnFloatingEmoji(emoji, username);
});

// Listen for join errors (e.g. room code not found)
socket.on('join-error', ({ message }) => {
  const msgs = {
    fr: 'Ce code de salon est introuvable ! Vérifie le code et réessaie.',
    en: 'Room not found! Check the code and try again.',
    es: '¡Sala no encontrada! Verifica el código e inténtalo de nuevo.',
    zh: '找不到房间！请检查代码并重试。'
  };
  alert(msgs[currentLanguage] || msgs.fr);
});

// Reaction bar: click to send + animate button
document.addEventListener('DOMContentLoaded', () => {
  // Use event delegation on the bar
  const bar = document.getElementById('reaction-bar');
  if (!bar) return;

  let localCooldownUntil = 0;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.reaction-btn');
    if (!btn) return;

    const emoji = btn.dataset.emoji;
    if (!emoji) return;

    const now = Date.now();
    if (now < localCooldownUntil) return; // client-side rate limit

    localCooldownUntil = now + 800;

    // Visual feedback on button
    btn.classList.remove('fired');
    void btn.offsetWidth; // force reflow to restart animation
    btn.classList.add('fired');
    setTimeout(() => btn.classList.remove('fired'), 300);

    socket.emit('send-reaction', { emoji });
  });
});

// VIEW RENDERERS

// 1. LOBBY VIEW
function renderLobbyView(state) {
  document.getElementById('display-lobby-code').textContent = state.lobbyId;
  document.getElementById('player-count').textContent = state.players.length;
  
  const playersContainer = document.getElementById('lobby-players-list');
  playersContainer.innerHTML = '';
  
  const statusTexts = {
    fr: { ready: 'PRÊT', waiting: 'ATTENTE', you: '(Vous)' },
    en: { ready: 'READY', waiting: 'WAITING', you: '(You)' },
    es: { ready: 'LISTO', waiting: 'ESPERA', you: '(Tú)' },
    zh: { ready: '已准备', waiting: '等待中', you: '(你)' }
  };
  const lang = currentLanguage;
  
  state.players.forEach(p => {
    const avatarSVG = generateAvatarSVG(p.avatar);
    const row = document.createElement('div');
    row.className = 'player-row';
    
    const statusText = p.isReady ? statusTexts[lang].ready : statusTexts[lang].waiting;
    const statusClass = p.isReady ? 'status-ready' : 'status-waiting';
    const youLabel = p.id === socket.id ? statusTexts[lang].you : '';
    
    row.innerHTML = `
      <div class="player-info">
        <div class="player-avatar">${avatarSVG}</div>
        <div class="player-name">${p.username} ${youLabel}</div>
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
    readyBtn.querySelector('span').textContent = i18n[lang].readyBtnActive;
  } else {
    readyBtn.classList.remove('active');
    readyBtn.querySelector('span').textContent = i18n[lang].readyBtnLabel;
  }
}

// 2. PICKING VIEW
function renderPickingView(state) {
  const isQuestioner = state.currentQuestioner.id === socket.id;
  const questionerView = document.getElementById('picking-questioner-view');
  const guesserView = document.getElementById('picking-guesser-view');
  const lang = currentLanguage;
  
  if (isQuestioner) {
    questionerView.style.display = 'block';
    guesserView.style.display = 'none';
    
    // Sync picked question if it exists in state
    if (state.currentQuestion) {
      const qText = typeof state.currentQuestion.text === 'object'
        ? (state.currentQuestion.text[lang] || state.currentQuestion.text.fr)
        : state.currentQuestion.text;
      const qCategory = typeof state.currentQuestion.category === 'object'
        ? (state.currentQuestion.category[lang] || state.currentQuestion.category.fr)
        : state.currentQuestion.category;
      document.getElementById('question-input').value = qText;
      document.getElementById('question-category-display').textContent = qCategory;
    } else {
      document.getElementById('question-input').value = '';
      document.getElementById('question-category-display').textContent = 'Custom';
    }
  } else {
    questionerView.style.display = 'none';
    guesserView.style.display = 'block';
    
    const waitTexts = {
      fr: " choisit une question...",
      en: " is choosing a question...",
      es: " está eligiendo una pregunta...",
      zh: " 正在选择问题..."
    };
    const pulseText = document.querySelector('#picking-guesser-view .pulse-text');
    pulseText.innerHTML = `<span id="waiting-questioner-name">${state.currentQuestioner.username}</span>${waitTexts[lang]}`;
    
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
  const lang = currentLanguage;

  const qText = typeof state.currentQuestion.text === 'object'
    ? (state.currentQuestion.text[lang] || state.currentQuestion.text.fr)
    : state.currentQuestion.text;
  const qCategory = typeof state.currentQuestion.category === 'object'
    ? (state.currentQuestion.category[lang] || state.currentQuestion.category.fr)
    : state.currentQuestion.category;

  if (!isQuestioner) {
    guesserView.style.display = 'block';
    questionerView.style.display = 'none';

    document.getElementById('answering-category').textContent = qCategory;
    document.getElementById('answering-question-text').textContent = qText;

    const guessTitle = {
      fr: `DEVINEZ LA RÉPONSE DE <span id="answering-questioner-name">${state.currentQuestioner.username}</span> !`,
      en: `GUESS <span id="answering-questioner-name">${state.currentQuestioner.username}</span>'S ANSWER!`,
      es: `¡ADIVINA LA RESPUESTA DE <span id="answering-questioner-name">${state.currentQuestioner.username}</span>!`,
      zh: `猜猜 <span id="answering-questioner-name">${state.currentQuestioner.username}</span> 的答案！`
    };
    guesserView.querySelector('.panel-title').innerHTML = guessTitle[lang];

    // Reset answer form buttons if state refreshed and player hasn't answered
    const hasAnswered = state.players.find(p => p.id === socket.id)?.hasAnswered;
    const submitBtn = document.getElementById('submitAnswerBtn');
    const formContainer = document.getElementById('guesser-form-container');
    const submittedContainer = document.getElementById('guesser-submitted-container');
    
    if (!hasAnswered) {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = i18n[currentLanguage].submitAnswerBtnLabel;
      if (formContainer) formContainer.style.display = 'block';
      if (submittedContainer) submittedContainer.style.display = 'none';

      // Auto-submit if timer is low and player typed something
      if (state.timer <= 2) {
        const answerInput = document.getElementById('answer-input');
        const answerText = answerInput ? answerInput.value.trim() : '';
        if (answerText) {
          socket.emit('submit-answer', { answerText });
          answerInput.value = '';
          if (formContainer) formContainer.style.display = 'none';
          if (submittedContainer) submittedContainer.style.display = 'flex';
        }
      }
    } else {
      if (formContainer) formContainer.style.display = 'none';
      if (submittedContainer) submittedContainer.style.display = 'flex';
    }
  } else {
    guesserView.style.display = 'none';
    questionerView.style.display = 'block';

    document.getElementById('answering-q-category').textContent = qCategory;
    document.getElementById('answering-q-text').textContent = qText;

    // Render list of who has answered
    const statusContainer = document.getElementById('answering-status-container');
    statusContainer.innerHTML = '';

    const statusTexts = {
      fr: { done: 'RÉPONDU', pending: 'ÉCRIT...' },
      en: { done: 'ANSWERED', pending: 'TYPING...' },
      es: { done: 'RESPONDIDO', pending: 'ESCRIBIENDO...' },
      zh: { done: '已回答', pending: '正在输入...' }
    };

    state.players.forEach(p => {
      // Questioner doesn't need to answer
      if (p.id === state.currentQuestioner.id) return;

      const item = document.createElement('div');
      item.className = 'status-item';
      
      const badgeClass = p.hasAnswered ? 'badge-done' : 'badge-pending';
      const badgeText = p.hasAnswered ? statusTexts[lang].done : statusTexts[lang].pending;

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
  const lang = currentLanguage;
  const qText = typeof state.currentQuestion.text === 'object'
    ? (state.currentQuestion.text[lang] || state.currentQuestion.text.fr)
    : state.currentQuestion.text;

  document.getElementById('judging-question-text').textContent = qText;

  const askedBy = {
    fr: `Question posée par <span id="judging-questioner-name">${state.currentQuestioner.username}</span> :`,
    en: `Question asked by <span id="judging-questioner-name">${state.currentQuestioner.username}</span>:`,
    es: `Pregunta hecha por <span id="judging-questioner-name">${state.currentQuestioner.username}</span>:`,
    zh: `由 <span id="judging-questioner-name">${state.currentQuestioner.username}</span> 提出的问题 :`
  };
  document.querySelector('.judged-q-header').innerHTML = askedBy[lang];

  // Set up reveal info
  const currentAnswer = state.currentAnswers[state.currentAnswerIndex];
  
  if (currentAnswer) {
    const proposedBy = {
      fr: `RÉPONSE PROPOSÉE PAR <span id="reveal-player-name">${currentAnswer.username}</span>`,
      en: `ANSWER PROPOSED BY <span id="reveal-player-name">${currentAnswer.username}</span>`,
      es: `RESPUESTA PROPUESTA POR <span id="reveal-player-name">${currentAnswer.username}</span>`,
      zh: `由 <span id="reveal-player-name">${currentAnswer.username}</span> 提供的答案`
    };
    document.querySelector('.reveal-badge').innerHTML = proposedBy[lang];
    
    let answerDisplay = currentAnswer.answerText;
    if (answerDisplay === '__NO_ANSWER__') {
      answerDisplay = i18n[lang].noAnswerText || "[No answer]";
    }
    document.getElementById('reveal-answer-bubble').textContent = `"${answerDisplay}"`;
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

    const suffix = {
      fr: ` évalue les réponses (${state.currentAnswerIndex + 1} / ${state.currentAnswers.length})...`,
      en: ` is evaluating the answers (${state.currentAnswerIndex + 1} / ${state.currentAnswers.length})...`,
      es: ` está evaluando las respuestas (${state.currentAnswerIndex + 1} / ${state.currentAnswers.length})...`,
      zh: ` 正在评估答案 (${state.currentAnswerIndex + 1} / ${state.currentAnswers.length})...`
    };
    const pulseText = document.querySelector('#judging-guesser-controls .pulse-text');
    pulseText.innerHTML = `<span id="judging-active-questioner">${state.currentQuestioner.username}</span>${suffix[lang]}`;

    const questionerAvatarSVG = generateAvatarSVG(state.currentQuestioner.avatar);
    document.getElementById('judging-waiting-avatar').innerHTML = questionerAvatarSVG;
  }
}

// 5. RESULTS VIEW
function renderResultsView(state) {
  const container = document.getElementById('results-leaderboard-container');
  container.innerHTML = '';
  const lang = currentLanguage;

  // Sort players by score descending
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);

  const youLabels = { fr: '(Vous)', en: '(You)', es: '(Tú)', zh: '(你)' };
  const youLabelText = youLabels[lang] || '(Vous)';

  sortedPlayers.forEach((p, idx) => {
    const avatarSVG = generateAvatarSVG(p.avatar);
    
    const row = document.createElement('div');
    row.className = 'result-row result-row-animated';
    row.style.animationDelay = `${idx * 0.15}s`;
    
    const youLabel = p.id === socket.id ? youLabelText : '';
    
    // Podium medal emojis for top 3
    const medals = ['🏆', '🥈', '🥉'];
    const medal = idx < 3 ? `<span class="podium-medal">${medals[idx]}</span>` : '';
    
    row.innerHTML = `
      <div class="rank-badge">${idx + 1}</div>
      <div class="results-player-info">
        <div class="player-avatar" style="width: 34px; height: 34px;">${avatarSVG}</div>
        <div class="player-name">${medal} ${p.username} ${youLabel}</div>
      </div>
      <div class="results-score-value">${p.score} pts</div>
    `;
    
    container.appendChild(row);
  });

  // 🎉 Launch confetti!
  launchConfetti();
  const affinitiesContainer = document.getElementById('affinity-connections-container');
  affinitiesContainer.innerHTML = '';

  let hasAffinities = false;

  const complicityLabels = { fr: 'COMPLICITÉ', en: 'AFFINITY', es: 'AFINIDAD', zh: '默契' };
  const complicityLabel = complicityLabels[lang] || 'COMPLICITÉ';

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

      const friendshipPoints = {
        fr: `${maxPoints} pts d'amitié`,
        en: `${maxPoints} friendship pts`,
        es: `${maxPoints} pts de amistad`,
        zh: `${maxPoints} 友谊点`
      };
      const friendshipText = friendshipPoints[lang] || `${maxPoints} pts d'amitié`;

      card.innerHTML = `
        <!-- Person who was questioned (Target) -->
        <div class="bubble-node target">
          <div class="avatar-wrapper">${targetAvatarSVG}</div>
          <span>${p.username}</span>
        </div>

        <!-- Connection Link -->
        <div class="connector-link">
          <div class="affinity-badge">❤️ ${complicityLabel}</div>
          <div class="connector-line"></div>
          <div class="affinity-label">${friendshipText}</div>
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
    const noAffinitiesText = {
      fr: "Aucune bonne réponse n'a été trouvée cette partie. Tentez encore !",
      en: "No correct answers were found this game. Try again!",
      es: "No se encontraron respuestas correctas en esta partida. ¡Inténtalo de nuevo!",
      zh: "这局游戏中没有找到正确的答案。再试一次吧！"
    };
    affinitiesContainer.innerHTML = `
      <div class="center-content" style="min-height: 80px; color: var(--color-muted); font-size: 13px;">
        ${noAffinitiesText[lang] || noAffinitiesText.fr}
      </div>
    `;
  }
}

// MODALS CONTENT (Terms, Privacy, Contact)
const modalContent = {
  fr: {
    terms: `
      <h2>⚖️ Conditions d'Utilisation</h2>
      <p>Bienvenue sur <strong>DoYouKnowMe?</strong>, le crash test ultime de tes amitiés !</p>
      <ul>
        <li><strong>Gratuité :</strong> Le jeu est entièrement gratuit et accessible sans inscription.</li>
        <li><strong>Règle d'or :</strong> Soyez respectueux dans les questions personnalisées et vos réponses. Pas d'insultes ni de contenu offensant.</li>
        <li><strong>Clause de fun :</strong> Le créateur (Lumhax) se dégage de toute responsabilité en cas de dispute de couple, de rupture amicale ou de dossier honteux révélé en cours de partie.</li>
        <li><strong>Modifications :</strong> Le jeu peut être mis à jour à tout moment pour ajouter de nouvelles questions.</li>
      </ul>
      <p>En jouant, vous acceptez de vous amuser dans la bienveillance !</p>
    `,
    privacy: `
      <h2>🛡️ Confidentialité</h2>
      <p>Nous respectons votre vie privée et celle de vos potes.</p>
      <ul>
        <li><strong>Zéro Cookie :</strong> Pas de cookie de traçage publicitaire.</li>
        <li><strong>Pas de base de données :</strong> Vos questions, réponses et pseudos transitent en temps réel via des WebSockets pour le bon déroulement de la partie. Rien n'est conservé de manière persistante sur le serveur après la fermeture de votre salon.</li>
        <li><strong>Données locales :</strong> Seuls vos réglages de volume peuvent être stockés localement sur votre navigateur.</li>
      </ul>
      <p>Jouez l'esprit tranquille, vos dossiers restent secrets !</p>
    `,
    contact: `
      <h2>📬 Contact</h2>
      <p>Tu as rencontré un bug ? Tu as une idée de question géniale à soumettre ? Ou tu souhaites juste m'envoyer un message sympa ?</p>
      <p>Écris-moi directement par mail :</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="mailto:lumhaxdev@gmail.com" style="font-size: 15px; font-weight: 900; background: var(--neon-cyan); border: 2.5px solid var(--color-dark); padding: 10px 20px; border-radius: 8px; box-shadow: 3px 3px 0 var(--color-dark); display: inline-block; text-decoration: none; color: var(--color-dark); text-transform: uppercase;">
          ✉️ lumhaxdev@gmail.com
        </a>
      </p>
      <p>Tu peux également me suivre ou m'envoyer un message privé sur Twitter / X :</p>
      <p style="text-align: center; font-weight: bold;">
        <a href="https://x.com/lumhaxdev" target="_blank">@lumhaxdev</a>
      </p>
    `
  },
  en: {
    terms: `
      <h2>⚖️ Terms of Service</h2>
      <p>Welcome to <strong>DoYouKnowMe?</strong>, the ultimate test of your friendships!</p>
      <ul>
        <li><strong>Free:</strong> The game is completely free and accessible without registration.</li>
        <li><strong>Golden Rule:</strong> Be respectful in custom questions and answers. No insults or offensive content.</li>
        <li><strong>Fun Clause:</strong> The creator (Lumhax) is not responsible for any couples breaking up, friendship fights, or embarrassing secrets revealed during play.</li>
        <li><strong>Modifications:</strong> The game may be updated at any time to add new features or questions.</li>
      </ul>
      <p>By playing, you agree to have fun and be kind!</p>
    `,
    privacy: `
      <h2>🛡️ Privacy Policy</h2>
      <p>We respect your privacy and that of your friends.</p>
      <ul>
        <li><strong>Zero Cookies:</strong> No ad tracking cookies.</li>
        <li><strong>No database:</strong> Your questions, answers, and nicknames are sent in real-time via WebSockets to run the game. Nothing is stored persistently on the server after your lobby is closed.</li>
        <li><strong>Local Data:</strong> Only your volume settings may be stored locally in your browser.</li>
      </ul>
      <p>Play with peace of mind, your secrets remain secret!</p>
    `,
    contact: `
      <h2>📬 Contact</h2>
      <p>Encountered a bug? Got a cool question idea? Or just want to send a friendly message?</p>
      <p>Email me directly:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="mailto:lumhaxdev@gmail.com" style="font-size: 15px; font-weight: 900; background: var(--neon-cyan); border: 2.5px solid var(--color-dark); padding: 10px 20px; border-radius: 8px; box-shadow: 3px 3px 0 var(--color-dark); display: inline-block; text-decoration: none; color: var(--color-dark); text-transform: uppercase;">
          ✉️ lumhaxdev@gmail.com
        </a>
      </p>
      <p>You can also follow or DM me on Twitter / X:</p>
      <p style="text-align: center; font-weight: bold;">
        <a href="https://x.com/lumhaxdev" target="_blank">@lumhaxdev</a>
      </p>
    `
  },
  es: {
    terms: `
      <h2>⚖️ Condiciones de uso</h2>
      <p>¡Bienvenido a <strong>DoYouKnowMe?</strong>, la prueba definitiva de tus amistades!</p>
      <ul>
        <li><strong>Gratuito:</strong> El juego es completamente gratuito y accesible sin registro.</li>
        <li><strong>Regla de oro:</strong> Sé respetuoso en las preguntas y respuestas personalizadas. Sin insultos ni contenido ofensivo.</li>
        <li><strong>Cláusula de diversión:</strong> El creador (Lumhax) no se hace responsable de discusiones de pareja, rupturas de amistad o secretos vergonzosos revelados durante la partida.</li>
        <li><strong>Modificaciones:</strong> El juego puede ser actualizado en cualquier momento.</li>
      </ul>
      <p>¡Al jugar, aceptas divertirte con amabilidad!</p>
    `,
    privacy: `
      <h2>🛡️ Privacidad</h2>
      <p>Respetamos tu privacidad y la de tus amigos.</p>
      <ul>
        <li><strong>Cero cookies:</strong> Sin cookies de seguimiento publicitario.</li>
        <li><strong>Sin base de datos:</strong> Tus preguntas, respuestas y apodos se transmiten en tiempo real a través de WebSockets. Nada se guarda de forma permanente en el servidor.</li>
        <li><strong>Datos locales:</strong> Solo tus ajustes de volumen se guardan localmente.</li>
      </ul>
      <p>¡Juega con tranquilidad, tus secretos están a salvo!</p>
    `,
    contact: `
      <h2>📬 Contacto</h2>
      <p>¿Encontraste un bug? ¿Tienes una gran idea de pregunta? ¿O solo quieres enviar un mensaje amistoso?</p>
      <p>Escríbeme directamente por correo electrónico:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="mailto:lumhaxdev@gmail.com" style="font-size: 15px; font-weight: 900; background: var(--neon-cyan); border: 2.5px solid var(--color-dark); padding: 10px 20px; border-radius: 8px; box-shadow: 3px 3px 0 var(--color-dark); display: inline-block; text-decoration: none; color: var(--color-dark); text-transform: uppercase;">
          ✉️ lumhaxdev@gmail.com
        </a>
      </p>
      <p>También puedes seguirme o enviarme un mensaje directo en Twitter / X:</p>
      <p style="text-align: center; font-weight: bold;">
        <a href="https://x.com/lumhaxdev" target="_blank">@lumhaxdev</a>
      </p>
    `
  },
  zh: {
    terms: `
      <h2>⚖️ 服务条款</h2>
      <p>欢迎来到 <strong>DoYouKnowMe?</strong>，友情的大考验！</p>
      <ul>
        <li><strong>免费：</strong> 游戏完全免费，无需注册即可使用。</li>
        <li><strong>黄金法则：</strong> 在自定义问题和回答中保持尊重。严禁侮辱或攻击性内容。</li>
        <li><strong>免责声明：</strong> 开发者（Lumhax）对游戏过程中导致的任何情侣争吵、朋友绝交或尴尬秘密的泄露不承担责任。</li>
      </ul>
      <p>通过游戏，即表示您同意在友善中寻找乐趣！</p>
    `,
    privacy: `
      <h2>🛡️ 隐私政策</h2>
      <p>我们尊重您和您朋友的隐私。</p>
      <ul>
        <li><strong>零 Cookie：</strong> 无广告追踪 Cookie。</li>
        <li><strong>无数据库：</strong> 您的昵称、问题和回答通过 WebSockets 实时传输。关闭房间后，服务器上不会保留任何持久数据。</li>
        <li><strong>本地数据：</strong> 只有您的音量设置可以保存在浏览器的本地存储中。</li>
      </ul>
      <p>请放心游戏，您的秘密依然是秘密！</p>
    `,
    contact: `
      <h2>📬 联系我们</h2>
      <p>遇到 Bug 啦？有超棒的新问题想法？或者只是想发一条友好的留言？</p>
      <p>请直接通过邮箱联系我：</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="mailto:lumhaxdev@gmail.com" style="font-size: 15px; font-weight: 900; background: var(--neon-cyan); border: 2.5px solid var(--color-dark); padding: 10px 20px; border-radius: 8px; box-shadow: 3px 3px 0 var(--color-dark); display: inline-block; text-decoration: none; color: var(--color-dark); text-transform: uppercase;">
          ✉️ lumhaxdev@gmail.com
        </a>
      </p>
      <p>你也可以在 Twitter / X 上关注我或向我发送私信：</p>
      <p style="text-align: center; font-weight: bold;">
        <a href="https://x.com/lumhaxdev" target="_blank">@lumhaxdev</a>
      </p>
    `
  }
};

// Resume background music when tab becomes active again (fixes browser suspension)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const container = document.querySelector('.game-container');
    // If the game has started (splash screen passed) and music is not set to 0 volume
    if (container && container.classList.contains('started') && sounds.bgMusic.volume > 0) {
      // Only play if we are not on the RESULTS screen (where victory SFX plays instead)
      if (sounds.bgMusic.paused && (!currentLobbyState || currentLobbyState.gameState !== 'RESULTS')) {
        sounds.bgMusic.play().catch(err => console.warn("Failed to resume background music on tab focus:", err));
      }
    }
  }
});

// =============================================
// 🎉 CONFETTI CANNON (Canvas-based)
// =============================================
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#ff5757','#ffc048','#2ecc71','#00b8d4','#e056fd','#fdcb6e','#6c5ce7','#ff6b81','#1dd1a1','#54a0ff'];
  const particles = [];
  const PARTICLE_COUNT = 150;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 100,
      y: canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 18,
      vy: -Math.random() * 22 - 5,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 15,
      gravity: 0.35 + Math.random() * 0.15,
      opacity: 1,
      decay: 0.006 + Math.random() * 0.008
    });
  }

  let running = true;
  function animate() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    particles.forEach(p => {
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      p.opacity -= p.decay;
      if (p.opacity <= 0) return;
      alive = true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (alive) {
      requestAnimationFrame(animate);
    } else {
      running = false;
      canvas.remove();
      window.removeEventListener('resize', resize);
    }
  }
  requestAnimationFrame(animate);
}

// =============================================
// 🔔 TOAST NOTIFICATION SYSTEM
// =============================================

// Create a fixed container for toasts
(function initToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
})();

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { join: '👋', leave: '🚪', score: '⭐', info: 'ℹ️' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span>`;

  container.appendChild(toast);

  // Auto-dismiss after 3.5s
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Socket listeners for toasts
socket.on('player-joined', ({ username }) => {
  const msgs = {
    fr: `${username} a rejoint le salon !`,
    en: `${username} joined the room!`,
    es: `¡${username} se unió a la sala!`,
    zh: `${username} 加入了房间！`
  };
  showToast(msgs[currentLanguage] || msgs.fr, 'join');
});

socket.on('player-left', ({ username }) => {
  const msgs = {
    fr: `${username} a quitté le salon`,
    en: `${username} left the room`,
    es: `${username} dejó la sala`,
    zh: `${username} 离开了房间`
  };
  showToast(msgs[currentLanguage] || msgs.fr, 'leave');
});

// =============================================
// ✨ SCORE ANIMATION (+10 pts popup)
// =============================================
socket.on('score-awarded', ({ playerId, username, points }) => {
  // Show toast
  const msgs = {
    fr: `${username} gagne +${points} pts ! ✨`,
    en: `${username} earned +${points} pts! ✨`,
    es: `¡${username} ganó +${points} pts! ✨`,
    zh: `${username} 获得了 +${points} 分！✨`
  };
  showToast(msgs[currentLanguage] || msgs.fr, 'score');

  // Spawn floating "+10" on the reveal bubble area
  const bubble = document.getElementById('reveal-answer-bubble');
  if (bubble) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    // Position above the bubble
    const rect = bubble.getBoundingClientRect();
    popup.style.left = rect.left + rect.width / 2 + 'px';
    popup.style.top = rect.top + 'px';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
  }
});
