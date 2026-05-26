const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
    try {
        const { messages, system, userCtx } = req.body;
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

        const history = messages.slice(0, -1);
        const lastMsg = messages[messages.length - 1];

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMsg.parts[0].text);
        res.json({ reply: result.response.text() });
    } catch (err) {
        console.error('Gemini error:', err);
        res.status(500).json({ error: 'AI error', reply: '⚠️ AI is unavailable right now.' });
    }
});

module.exports = router;