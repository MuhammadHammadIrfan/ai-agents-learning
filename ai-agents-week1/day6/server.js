import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import {
  prepareDocumentRAG,
  answerQueryWithRAG,
  initializeCohere,
} from './rag.js';

dotenv.config();

// Initialize Cohere with API key AFTER dotenv loads
initializeCohere(process.env.COHERE_API_KEY);

const port = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

app.post('/load', async (req, res) => {
  const text = fs.readFileSync('./data/document.txt', 'utf-8');

  const result = await prepareDocumentRAG(text);
  res.json({
    message: 'Document loaded and embeddings created.',
    chunks: result.chunks,
  });
});

app.post('/ask', async (req, res) => {
  const { question } = req.body;
  const result = await answerQueryWithRAG(question);

  res.json({
    answer: result.answer,
    usedChunks: result.usedChunks,
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
