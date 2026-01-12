import { searchSimilarChunks } from './retrieval.js';
import { cohere } from './cohere.js';

/**
 * answering a user's question using RAG
 * @param {string} userId - UUID of the user
 * @param {string} question - User's question
 * @param {number} topK - Number of chunks to retrieve
 * @returns {Promise<object>} Answer with metadata
 */
export async function answerQuestion(userId, question, topK = 3) {
  try {
    console.log(`RAG Query for user ${userId}: ${question}`);
    console.log(`Question: ${question}`);

    // step1: retrieve similar chunks
    const relevantChunks = await searchSimilarChunks(userId, question, topK);

    // step2: check if we found any relevant chunks
    if (!relevantChunks || relevantChunks.length === 0) {
      return {
        answer: "I don't have enough information to answer that question.",
        chunks_used: 0,
        soruces: [],
      };
    }

    // step3: build context from retrieved chunks
    const context = relevantChunks
      .map((chunk, index) => `Chunk ${index + 1}:\n${chunk.content}`)
      .join('\n\n');
    console.log(`Using ${relevantChunks.length} chunks as context.`);

    // step4: construct rag prompt
    const prompt = buildRAGPrompt(context, question);

    // step5: generate answer using llm
    const response = await cohere.chat({
      model: 'command-a-03-2025',
      message: prompt,
      temperature: 0.3,
    });

    const answer = response.text.trim();
    console.log('Generated Answer');
    return {
      answer: answer,
      chunks_used: relevantChunks.length,
      sources: relevantChunks.map((chunk) => ({
        content: chunk.content.substring(0, 100) + '...',
        similarity: chunk.similarity,
        chunk_index: chunk.chunk_index,
      })),
    };
  } catch (error) {
    console.error('Error answering question:', error.message);
    throw error;
  }
}

/**
 * building RAG prompt with context and question
 * @param {string} context - Retrieved context chunks
 * @param {string} question - User's question
 * @returns {string} Complete prompt for LLM
 */
function buildRAGPrompt(context, question) {
  return `You are a helpful AI assistant. Answer the user's question using ONLY the provided context below.

IMPORTANT RULES:
1. Use ONLY information from the context provided
2. If the context doesn't contain enough information, say so clearly
3. Do not make up or infer information beyond what's in the context
4. Be concise and direct
5. If you reference specific information, you can mention which section it comes from

CONTEXT:
${context}

USER QUESTION:
${question}

ANSWER:`;
}

/**
 * Answer with streaming (optional advanced feature)
 * @param {string} userId - User ID
 * @param {string} question - Question
 * @param {function} onChunk - Callback for each chunk
 */

export async function answerQuestionStream(userId, question, onChunk) {
  const relevantChunks = await searchSimilarChunks(userId, question, 3);

  if (!relevantChunks || relevantChunks.length === 0) {
    onChunk("I don't have any information to answer this question.");
    return;
  }

  const context = relevantChunks
    .map((chunk, index) => `Chunk ${index + 1}:\n${chunk.content}`)
    .join('\n\n');

  const prompt = buildRAGPrompt(context, question);
  const stream = await cohere.chatStream({
    model: 'command-a-03-2025',
    message: prompt,
    temperature: 0.3,
  });

  for await (const message of stream) {
    if (message.eventType === 'text-generation') {
      onChunk(message.text);
    }
  }
}
