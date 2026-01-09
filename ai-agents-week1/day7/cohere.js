import { CohereClient } from 'cohere-ai';
import dotenv from 'dotenv';

dotenv.config();

//initialize cohere client
const cohereApiKey = process.env.COHERE_API_KEY;

if(!cohereApiKey) {
    throw new Error("Missing Cohere API key in environment variables");
}
export const cohere = new CohereClient({
  token: cohereApiKey,
});

/**
generate embeddings for text chunks
* @param {string[]} texts - Array of text chunks to generate embeddings for
* @param {string} inputType - Type of input, e.g., 'text' or 'document'
* @param {Promise<number[][]>} - Array of embeddings
*/
export async function generateEmbeddings(texts, inputType='search_document'){
    try{
        const response = await cohere.embed({
            model: 'embed-english-v3.0',
            texts: texts,
            inputType: inputType,
        });
        return response.embeddings;
    }catch(error){
        console.error('Error generating embeddings:', error.message);
        throw error;
    }
}

export async function generateQueryEmbedding(query){
    const embeddings = await generateEmbeddings([query], 'search_query');
    return embeddings[0];
}