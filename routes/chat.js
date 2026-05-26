const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || '').trim());
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

router.post('/', async (req, res) => {
    try {
        const { messages } = req.body;
        const lastMsg = messages[messages.length - 1];
        const prompt = `You are BusPass AI, a helpful bus ticket booking assistant. Answer concisely.\n\nUser: ${lastMsg.parts[0].text}`;
        const result = await model.generateContent(prompt);
        res.json({ reply: result.response.text() });
    } catch (err) {
        console.error('Gemini error:', err);
        res.status(500).json({ reply: '⚠️ AI is unavailable right now.' });
    }
});

module.exports = router;