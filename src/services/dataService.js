const fs = require('fs');
const path = require('path');

let questions = [];

// Load questions on module initialization
try {
  const filePath = path.join(__dirname, '../../data/questions.json');
  const data = fs.readFileSync(filePath, 'utf8');
  questions = JSON.parse(data);
  console.log(`[DataService] Loaded ${questions.length} questions successfully.`);
} catch (error) {
  console.error('[DataService] Failed to load questions:', error);
}

/**
 * Returns a random question that has not been asked in the current session.
 * @param {Array<number>} askedIds Array of IDs that have already been asked.
 * @returns {Object|null} A question object, or null if all questions have been asked.
 */
function getRandomQuestion(askedIds = []) {
  const availableQuestions = questions.filter(q => !askedIds.includes(q.id));
  
  if (availableQuestions.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  return availableQuestions[randomIndex];
}

/**
 * Gets a question by its exact ID.
 * @param {number} id 
 * @returns {Object|null}
 */
function getQuestionById(id) {
  return questions.find(q => q.id === id) || null;
}

module.exports = {
  getRandomQuestion,
  getQuestionById,
  getAllQuestions: () => questions
};
