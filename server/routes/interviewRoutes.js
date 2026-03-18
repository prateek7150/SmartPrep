const express = require('express');
const router = express.Router();   
const protect = require('../middleware/authMiddleware');
const { generateQuestions, evaluateAnswer , getHistory , clearHistory } = require('../controllers/aiController');

// Define the POST route
router.post('/generate',protect, generateQuestions);


//Evaluation Route

router.post('/evaluate', protect ,evaluateAnswer);


// GET route for history 
router.get('/history' ,protect, getHistory);


//Delete Route for History

router.delete('/history/clear' , protect , clearHistory);
module.exports = router;   