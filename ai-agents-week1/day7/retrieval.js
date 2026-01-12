import {supabase} from "./supabaseClient.js";
import { generateQueryEmbedding } from "./cohere.js";

/**
 * Search for similar chunks using vector similarity
 * @param {string} userId - UUID of the user (for filtering)
 * @param {string} query - User's question
 * @param {number} topK - Number of similar chunks to return
 * @returns {Promise<array>} Array of similar chunks with similarity scores
 */

export async function searchSimilarChunks(userId, query, topK=3){
    try{
        console.log(`Searching for ${query} for user ${userId}`);
        // step1: generate embedding for the query
        const queryEmbedding = await generateQueryEmbedding(query);
        console.log(`Query Embeddings generated (${queryEmbedding.length} dimensions)`);

        // step2: perform vector similarity search in supabase
        const {data, error} = await supabase.rpc('match_document_chunks',{
            query_embedding: queryEmbedding,
            match_threshold: 0.1,
            match_count: topK,
            filter_user_id: userId,
        });

        if(error){
            // if rpc function not found in supabase, use direct query(fallback)
            console.log('RPC not found, using direact query as fallback...');
            return await searchSimilarChunksDirect(userId, queryEmbedding, topK);
        }
        console.log(`Found ${data.length} similar chunks from Supabase`);
        return data;
    }catch(error){
        console.error('Error searching similar chunks:', error.message);
        throw error;
    }
}


/**
 * Direct vector search (fallback if RPC not available)
 * @param {string} userId - User ID
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {number} topK - Number of results
 * @returns {Promise<array>} Similar chunks
 */

async function searchSimilarChunksDirect(userId, queryEmbedding, topK){
    // this approach fetches all user chunks and sorts in-memory
    // for production with many chunks, use RPC function instead
    const {data: chunks, error} = await supabase
    .from('document_chunks')
    .select('id, content, document_id, chunk_index, embedding')
    .eq('user_id', userId);

    if(error) throw error;

    if(!chunks || chunks.length === 0){
        console.log('No chunks found for user');
        return [];
    }
    // calculating cosine similarity
    const chunksWithSimilarity = chunks.map(chunk => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // sort by similarity (decending) and taking topK
    chunksWithSimilarity.sort((a,b) => b.similarity - a.similarity);

    return chunksWithSimilarity.slice(0, topK);
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Similarity score (0-1, higher = more similar)
 */
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}