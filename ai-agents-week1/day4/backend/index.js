import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();
const port = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const sessions = {};

app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!message) return res.status(400).json({ error: 'message is required' });
    if (!sessions[userId]) {
      sessions[userId] = [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
      ];
    }
    sessions[userId].push({ role: 'user', content: message });

    //setting res headers for event stream
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    //LLM call with streaming enabled
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: sessions[userId],
      stream: true,
    });

    let fullReply = '';
    for await (const chunk of stream) {
      const delta = chunk?.choices[0]?.delta?.content || '';
      fullReply += delta;
      res.write(delta);
    }

    sessions[userId].push({ role: 'assistant', content: fullReply });
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
