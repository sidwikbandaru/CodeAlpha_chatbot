const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

router.post('/', async (req, res) => {
    try {
        const { messages } = req.body;
        const lastMsg = messages[messages.length - 1];
        const result = await model.generateContent(lastMsg.parts[0].text);
        res.json({ reply: result.response.text() });
    } catch (err) {
        console.error('Gemini error:', err);
        res.status(500).json({ reply: '⚠️ AI is unavailable right now.' });
    }
});

module.exports = router;