const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const dataService = require('./services/dataService');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css') || filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Centralized game rooms storage
const rooms = {};

// Helper: Broadcast room state to all clients in a room
function broadcastState(lobbyId) {
  const room = rooms[lobbyId];
  if (!room) return;

  // Map state to clean up references and send simple payload
  const cleanPlayers = room.players.map(p => ({
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    score: p.score,
    isReady: p.isReady,
    hasAnswered: room.answers.some(a => a.playerId === p.id)
  }));

  const currentQuestioner = room.players[room.currentQuestionerIndex];

  const statePayload = {
    lobbyId: room.lobbyId,
    gameState: room.gameState,
    currentRound: room.currentRound,
    maxRounds: room.maxRounds,
    language: room.language || 'fr',
    currentQuestioner: currentQuestioner ? {
      id: currentQuestioner.id,
      username: currentQuestioner.username,
      avatar: currentQuestioner.avatar
    } : null,
    currentQuestion: room.currentQuestion,
    timer: room.timerCountdown,
    players: cleanPlayers,
    // Hide actual answers during ANSWERING, show during JUDGING
    currentAnswers: room.gameState === 'JUDGING' ? room.answers.map((a, idx) => ({
      index: idx,
      playerId: a.playerId,
      username: a.username,
      answerText: a.answerText,
      isValid: a.isValid
    })) : [],
    currentAnswerIndex: room.currentAnswerIndex,
    affinities: room.affinities || {}
  };

  io.to(lobbyId).emit('room-state', statePayload);
}

// Helper: Start room timer
function startRoomTimer(lobbyId) {
  const room = rooms[lobbyId];
  if (!room) return;

  clearInterval(room.timerInterval);
  room.timerCountdown = 45; // 45 seconds for answering

  room.timerInterval = setInterval(() => {
    room.timerCountdown--;
    
    if (room.timerCountdown <= 0) {
      clearInterval(room.timerInterval);
      transitionToJudging(lobbyId);
    } else {
      broadcastState(lobbyId);
    }
  }, 1000);

  broadcastState(lobbyId);
}

const noAnswerText = {
  fr: "[Pas de réponse à temps]",
  en: "[No answer in time]",
  es: "[Sin respuesta a tiempo]",
  zh: "[未及时回答]"
};

// Transition helper: Move from Answering to Judging
function transitionToJudging(lobbyId) {
  const room = rooms[lobbyId];
  if (!room) return;

  clearInterval(room.timerInterval);
  room.gameState = 'JUDGING';
  room.currentAnswerIndex = 0;
  
  // Fill missing answers from players who didn't submit
  const questioner = room.players[room.currentQuestionerIndex];
  room.players.forEach(p => {
    if (p.id !== questioner.id && !room.answers.some(a => a.playerId === p.id)) {
      room.answers.push({
        playerId: p.id,
        username: p.username,
        answerText: noAnswerText[room.language || 'fr'] || "[No answer]",
        isValid: null
      });
    }
  });

  broadcastState(lobbyId);
}

// Helper: Move to next turn or end game
function nextTurn(lobbyId) {
  const room = rooms[lobbyId];
  if (!room) return;

  room.answers = [];
  room.currentAnswerIndex = 0;
  room.currentQuestion = null;

  // Move to next questioner
  room.currentQuestionerIndex++;
  
  // If everyone has been the questioner for this round
  if (room.currentQuestionerIndex >= room.players.length) {
    room.currentQuestionerIndex = 0;
    room.currentRound++;
    
    // Check if game is finished (after 3 rounds)
    if (room.currentRound > room.maxRounds) {
      room.gameState = 'RESULTS';
      saveFinalScores(room);
    } else {
      room.gameState = 'PICKING';
    }
  } else {
    room.gameState = 'PICKING';
  }

  broadcastState(lobbyId);
}

// Save scores to NoSQL placeholder
function saveFinalScores(room) {
  const scoreData = {
    lobbyId: room.lobbyId,
    timestamp: new Date().toISOString(),
    scores: room.players.map(p => ({ username: p.username, score: p.score }))
  };
  console.log('[NoSQL DB] Saving final scores:', JSON.stringify(scoreData, null, 2));
  // Integrate standard NoSQL database persistence here in production
}

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // 1. Join / Create Room
  socket.on('join-room', ({ username, avatar, lobbyId }) => {
    let targetLobbyId = lobbyId ? lobbyId.toUpperCase().trim() : null;

    // Create a new lobby if not provided or doesn't exist
    if (!targetLobbyId || !rooms[targetLobbyId]) {
      targetLobbyId = targetLobbyId || Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[targetLobbyId] = {
        lobbyId: targetLobbyId,
        gameState: 'LOBBY',
        currentRound: 1,
        maxRounds: 3,
        currentQuestionerIndex: 0,
        currentQuestion: null,
        askedQuestionIds: [],
        players: [],
        answers: [],
        currentAnswerIndex: 0,
        timerCountdown: 0,
        timerInterval: null,
        affinities: {},
        language: 'fr'
      };
    }

    const room = rooms[targetLobbyId];

    // Cancel deletion timeout if active
    if (room.cleanupTimeout) {
      clearTimeout(room.cleanupTimeout);
      room.cleanupTimeout = null;
      console.log(`[Socket] Room ${targetLobbyId} cleanup cancelled (player joined).`);
    }

    // Avoid duplicate usernames inside the same lobby
    const finalUsername = room.players.some(p => p.username === username)
      ? `${username}#${Math.floor(Math.random() * 900) + 100}`
      : username;

    const newPlayer = {
      id: socket.id,
      username: finalUsername,
      avatar: avatar || 'avatar_01',
      score: 0,
      isReady: false
    };

    room.players.push(newPlayer);
    socket.join(targetLobbyId);
    socket.lobbyId = targetLobbyId;

    console.log(`[Socket] Player ${finalUsername} joined lobby ${targetLobbyId}`);
    
    // Notify all players in the room about the new arrival
    io.to(targetLobbyId).emit('player-joined', { username: finalUsername });

    // Broadcast updated state
    broadcastState(targetLobbyId);
  });

  // 2. Ready Toggle
  socket.on('toggle-ready', () => {
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      
      // If all players are ready, automatically start the game
      const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);
      if (allReady && room.gameState === 'LOBBY') {
        room.gameState = 'PICKING';
        room.currentQuestionerIndex = 0;
        room.currentRound = 1;
        room.askedQuestionIds = [];
      }
      
      broadcastState(lobbyId);
    }
  });

  // 3. Questioner picks a random question
  socket.on('pick-random-question', () => {
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];
    if (!room || room.gameState !== 'PICKING') return;

    const questioner = room.players[room.currentQuestionerIndex];
    if (socket.id !== questioner.id) return;

    const question = dataService.getRandomQuestion(room.askedQuestionIds);
    
    if (question) {
      room.currentQuestion = question;
      // Send question preview to the room (or just the questioner)
      broadcastState(lobbyId);
    } else {
      // If all questions are exhausted, reset the asked questions tracking
      room.askedQuestionIds = [];
      const retryQuestion = dataService.getRandomQuestion([]);
      if (retryQuestion) {
        room.currentQuestion = retryQuestion;
        broadcastState(lobbyId);
      }
    }
  });

  // 3.5. Change Language
  socket.on('change-language', ({ language }) => {
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];
    if (room) {
      room.language = language;
      broadcastState(lobbyId);
    }
  });

  // 4. Questioner submits the selected question (transitions to answering)
  socket.on('submit-question', ({ text, category }) => {
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];
    if (!room || room.gameState !== 'PICKING') return;

    const questioner = room.players[room.currentQuestionerIndex];
    if (socket.id !== questioner.id) return;

    let finalQuestionText;
    let finalQuestionCategory;

    // Check if the submitted text matches one of the translations of the current random question
    const isRandomQ = room.currentQuestion && (
      (typeof room.currentQuestion.text === 'string' && room.currentQuestion.text === text) ||
      (typeof room.currentQuestion.text === 'object' && Object.values(room.currentQuestion.text).includes(text))
    );

    if (isRandomQ) {
      finalQuestionText = room.currentQuestion.text;
      finalQuestionCategory = room.currentQuestion.category;
      room.askedQuestionIds.push(room.currentQuestion.id);
    } else {
      // Custom question
      finalQuestionText = { fr: text, en: text, es: text, zh: text };
      finalQuestionCategory = { fr: category || 'Custom', en: category || 'Custom', es: category || 'Custom', zh: category || 'Custom' };
    }

    room.currentQuestion = {
      id: room.currentQuestion ? room.currentQuestion.id : Date.now(),
      text: finalQuestionText,
      category: finalQuestionCategory
    };

    room.gameState = 'ANSWERING';
    room.answers = [];
    room.currentAnswerIndex = 0;

    startRoomTimer(lobbyId);
  });

  // 5. Player submits an answer
  socket.on('submit-answer', ({ answerText }) => {
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];
    if (!room || room.gameState !== 'ANSWERING') return;

    const player = room.players.find(p => p.id === socket.id);
    const questioner = room.players[room.currentQuestionerIndex];

    // Questioner doesn't write an answer
    if (!player || player.id === questioner.id) return;

    // Avoid double answers
    if (room.answers.some(a => a.playerId === socket.id)) return;

    room.answers.push({
      playerId: socket.id,
      username: player.username,
      answerText: answerText || "[Vide]",
      isValid: null
    });

    // Check if everyone (except the questioner) has answered
    const requiredAnswersCount = room.players.length - 1;
    const currentAnswersCount = room.answers.length;

    if (currentAnswersCount >= requiredAnswersCount) {
      // Instantly move to Judging phase (zero out timer)
      transitionToJudging(lobbyId);
    } else {
      broadcastState(lobbyId);
    }
  });

  // 6. Questioner validates or invalidates an answer
  socket.on('judge-answer', ({ answerIndex, isValid }) => {
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];
    if (!room || room.gameState !== 'JUDGING') return;

    const questioner = room.players[room.currentQuestionerIndex];
    if (socket.id !== questioner.id) return;

    const answer = room.answers[answerIndex];
    if (answer && answer.isValid === null) {
      answer.isValid = isValid;

      // Update player score if valid (e.g. +10 points)
      if (isValid) {
        const targetPlayer = room.players.find(p => p.id === answer.playerId);
        if (targetPlayer) {
          targetPlayer.score += 10;

          // Emit score-awarded event for animated +10 popup
          io.to(lobbyId).emit('score-awarded', {
            playerId: answer.playerId,
            username: answer.username,
            points: 10
          });
        }
        
        // Track affinity: player who guessed knows the questioner
        const key = `${answer.playerId}:${questioner.id}`;
        room.affinities[key] = (room.affinities[key] || 0) + 10;
      }

      // Check if there are more answers to judge
      if (room.currentAnswerIndex + 1 < room.answers.length) {
        room.currentAnswerIndex++;
      } else {
        // All answers judged, proceed to next turn after a small delay
        setTimeout(() => {
          nextTurn(lobbyId);
        }, 1500);
      }

      broadcastState(lobbyId);
    }
  });

  // 7. Restart Game
  socket.on('restart-game', () => {
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];
    if (!room) return;

    room.gameState = 'LOBBY';
    room.currentRound = 1;
    room.currentQuestionerIndex = 0;
    room.currentQuestion = null;
    room.askedQuestionIds = [];
    room.answers = [];
    room.currentAnswerIndex = 0;
    room.affinities = {};
    room.players.forEach(p => {
      p.score = 0;
      p.isReady = false;
    });

    broadcastState(lobbyId);
  });

  // 8. Emoji Reactions (rate-limited: 1 per player per second)
  const reactionCooldowns = new Map(); // socketId -> timestamp
  socket.on('send-reaction', ({ emoji }) => {
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];
    if (!room) return;

    // Whitelist allowed emojis
    const allowed = ['🔥','😂','❤️','😱','👏','💀','🤣','🥶'];
    if (!allowed.includes(emoji)) return;

    // Rate limit: 1 reaction per second per player
    const now = Date.now();
    const lastSent = reactionCooldowns.get(socket.id) || 0;
    if (now - lastSent < 800) return;
    reactionCooldowns.set(socket.id, now);

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(lobbyId).emit('reaction-received', {
      emoji,
      username: player.username,
      senderId: socket.id
    });
  });

  // 8. Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    const lobbyId = socket.lobbyId;
    const room = rooms[lobbyId];

    if (room) {
      // Remove player
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        const removedPlayer = room.players.splice(index, 1)[0];
        console.log(`[Socket] Player ${removedPlayer.username} left room ${lobbyId}`);

        // Notify remaining players about the departure
        io.to(lobbyId).emit('player-left', { username: removedPlayer.username });
      }

      // Clean up room if empty (with a grace period to handle transient disconnects)
      if (room.players.length === 0) {
        clearInterval(room.timerInterval);
        if (room.cleanupTimeout) clearTimeout(room.cleanupTimeout);
        
        room.cleanupTimeout = setTimeout(() => {
          if (rooms[lobbyId] && rooms[lobbyId].players.length === 0) {
            delete rooms[lobbyId];
            console.log(`[Socket] Room ${lobbyId} is empty. Deleted after grace period.`);
          }
        }, 15000); // 15 seconds grace period
      } else {
        // If current questioner disconnected, adjust index or proceed
        if (room.currentQuestionerIndex >= room.players.length) {
          room.currentQuestionerIndex = 0;
        }
        
        // If state was ANSWERING and count decreased, check if transition is needed
        if (room.gameState === 'ANSWERING') {
          const requiredAnswersCount = room.players.length - 1;
          const currentAnswersCount = room.answers.length;
          if (currentAnswersCount >= requiredAnswersCount) {
            transitionToJudging(lobbyId);
            return;
          }
        }

        broadcastState(lobbyId);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`[Server] "DoYouKnowMe?" listening on port ${PORT}`);
  console.log(`=============================================`);
});
