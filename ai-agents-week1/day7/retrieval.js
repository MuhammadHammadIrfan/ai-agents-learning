import {supabase} from "./supabaseClient.js";
import { generateEmbeddings } from "./cohere.js";

/**
 * Search for similar chunks using vector similarity
 * @param {string} userId - UUID of the user (for filtering)
 * @param {string} query - User's question
 * @param {number} topK - Number of similar chunks to return
 * @returns {Promise<array>} Array of similar chunks with similarity scores
 */

export async function searchSimilarChunks(userId, query, topK=5){
    return 1;
}