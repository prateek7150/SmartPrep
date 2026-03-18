const mongoose = require('mongoose');
const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, required: true },
  questions: [String],
  

  resumeAnalysis: {
    score: Number,
    missingKeywords: [String],
    strengths: [String],
    summary: String
  },

  
  results: [{
    question: String,
    userAnswer: String, 
    score: Number,
    feedback: String,
    correctAnswer: String 
  }],

  createdAt: { type: Date, default: Date.now } 
});

module.exports = mongoose.model('Interview', interviewSchema);