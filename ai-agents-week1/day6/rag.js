import { CohereClient } from 'cohere-ai';
import { vectorStore } from './vectorStore.js';
import { chunkText } from './chunker.js';

let cohere;

// Initialize Cohere client with API key
export function initializeCohere(apiKey) {
  cohere = new CohereClient({
    token: apiKey,
  });
}

export async function prepareDocumentRAG(docText) {
  vectorStore.data = [];

  const chunks = chunkText(docText, 300);

  for (let i = 0; i < chunks.length; i++) {
    const response = await cohere.embed({
      model: 'embed-english-v3.0',
      texts: [chunks[i]],
      inputType: 'search_document',
    });

    const embedding = response.embeddings[0];
    vectorStore.add(`chunk_${i}`, chunks[i], embedding);
  }

  return { chunks: chunks.length };
}

export async function answerQueryWithRAG(query) {
  const q = await cohere.embed({
    model: 'embed-english-v3.0',
    texts: [query],
    inputType: 'search_query',
  });

  const queryEmbedding = q.embeddings[0];
  const topChunks = vectorStore.search(queryEmbedding, 3);

  const context = topChunks.map((c) => c.text).join(`\n\n`);

  const prompt = `Use only the provided context to answer the question.
    
Context: 
${context}

Question: ${query}

Answer based only on the context above:`;

  const answerResponse = await cohere.chat({
    model: 'command-r-plus-08-2024',
    message: prompt,
    temperature: 0.3,
  });

  return {
    answer: answerResponse.text,
    usedChunks: topChunks,
  };
}
