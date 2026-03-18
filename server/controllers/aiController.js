const { GoogleGenerativeAI } = require("@google/generative-ai");
const Interview = require("../models/Interview");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


//Generate The Questions 
exports.generateQuestions = async (req, res) => {
    const { topic, count } = req.body;

    
    const prompt = `
    You are an expert technical recruiter. 
    Input: "${topic}"

    If the input contains personal details or resume content, analyze it as a Resume.
    If the input is just a technology name (e.g., "React"), analyze it as a Skill Topic.

    Provide a JSON response:
    {
      "analysis": {
        "score": (0-100 rating of the resume or the user's focus on this topic), 
        "missingKeywords": (Skills often paired with this topic),
        "strengths": (Key highlights found),
        "summary": (A brief overview)
      },
      "questions": (Exactly ${count || 10} interview questions)
    }
    
    Return ONLY JSON. No markdown.
`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Safety check to extract JSON if AI adds extra text
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        const data = JSON.parse(responseText.slice(jsonStart, jsonEnd));

        
        const newInterview = new Interview({
            userId: req.user.id,
            topic: topic.includes("RESUME_MODE") ? "Resume Analysis" : topic,
            questions: data.questions,
            resumeAnalysis: data.analysis, 
            status: 'pending'
        });

        await newInterview.save();

        res.status(200).json({
            interviewId: newInterview._id,
            questions: data.questions,
            analysis: data.analysis 
        });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "AI Generation failed" });
    }
};


//Evaluate The Answers Here
exports.evaluateAnswer = async (req, res) => {
    try {
        const { interviewId, question, userAnswer } = req.body;
        
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        
        const prompt = `
            As a technical interviewer, evaluate the following answer.
            Question: "${question}"
            User's Answer: "${userAnswer}"
            
            Return ONLY a JSON object with these keys:
            - "score": (a number from 0 to 10)
            - "feedback": (2-3 sentences explaining what was good and what was missing)
            - "correctAnswer": (a concise ideal answer)
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, "").trim();

        const evaluation = JSON.parse(text);

        await Interview.findByIdAndUpdate(interviewId, {
            $push: {
                results: {
                    question,
                    userAnswer,
                    score: evaluation.score,
                    feedback: evaluation.feedback,
                    correctAnswer: evaluation.correctAnswer
                }
            }
        });

        res.status(200).json(evaluation);
        
    } catch (error) {
        console.log("Evaluation Error", error);
        res.status(500).json({ error: "Answer Evaluation Failed" });
    }
};


//Fetch The History Of previous interviews
exports.getHistory = async (req, res) => {
    try {
        const history = await Interview.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(history);
    } catch (error) {
        console.log("History fetch error", error);
        res.status(500).json({ error: "Failed to fetch the history" });
    }
};

//Clear the history 
exports.clearHistory = async (req, res) => {
    try {
        await Interview.deleteMany({ userId: req.user.id });
        res.status(200).json({ message: "History cleared successfully" });
    } catch (error) {
        console.error("Clear History Error:", error);
        res.status(500).json({ error: "Failed to clear history" });
    }
};

//Dashboard Statistics

exports.getDashBoardStats = async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.user.id });

    const totalInterviews = interviews.length;

    let totalScore = 0;
    let answerCount = 0;

    let topicPerformance = {};

    interviews.forEach(interview => {
      interview.results.forEach(result => {
        totalScore += result.score;
        answerCount++;

        if (!topicPerformance[interview.topic]) {
          topicPerformance[interview.topic] = { sum: 0, count: 0 };
        }

        topicPerformance[interview.topic].sum += result.score;
        topicPerformance[interview.topic].count++;
      });
    });

    res.status(200).json({
      totalInterviews,
      overallAverage: answerCount > 0 ? (totalScore / answerCount).toFixed(1) : 0,
      topicPerformance
    });
  } catch (error) {
    res.status(500).json({ error: "Failed To Get The Statistics" });
  }
};