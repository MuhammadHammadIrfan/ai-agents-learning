import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CohereClient } from 'cohere-ai';
import { vectorStore } from './vectorStore.js';

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());


const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Generating embeddings endpoint
app.post('/embed', async (req, res) => {
  try {
    const { text, id } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    if (!id) return res.status(400).json({ error: 'id is required' });

    const response = await cohere.embed({
      texts: [text],
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    });

    const embedding = response.embeddings[0];

    vectorStore.add(id, text, embedding);

    res.json({
      message: 'Embedding stored successfully',
      embeddingLength: embedding.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//search vector store endpoint

app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });

    const response = await cohere.embed({
      texts: [query],
      model: 'embed-english-v3.0',
      inputType: 'search_query',
    });

    const queryEmbedding = response.embeddings[0];
    const results = vectorStore.search(queryEmbedding, 3);

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//starting the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
