import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Agent } from './agent.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Store active agent sessions (in production, use Redis)
const agentSessions = new Map();

/**
 * POST /agent/chat - Chat with agent
 */
app.post('/agent/chat', async (req, res) => {
  try {
    const { userId, message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create agent session
    const key = `${userId || 'anon'}_${sessionId}`;

    if (!agentSessions.has(key)) {
      agentSessions.set(key, new Agent(userId));
    }

    const agent = agentSessions.get(key);

    // Run agent
    const result = await agent.run(message);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /agent/reset - Clear agent memory
 */
app.post('/agent/reset', (req, res) => {
  const { userId, sessionId = 'default' } = req.body;
  const key = `${userId || 'anon'}_${sessionId}`;

  if (agentSessions.has(key)) {
    agentSessions.get(key).reset();
  }

  res.json({ success: true, message: 'Agent memory cleared' });
});

app.listen(PORT, () => {
  console.log(`\nAgent server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`   POST /agent/chat - Chat with agent`);
  console.log(`   POST /agent/reset - Reset agent memory\n`);
});
