import { supabase } from './supabaseClient.js';
import { chunkText } from './chunker.js';
import { generateEmbeddings } from './cohere.js';

/**
 * Upload and process a document for a user
 * @param {string} userId - UUID of the user
 * @param {string} documentName - Name of the document
 * @param {string} documentText - Full text content
 * @returns {Promise<object>} Result with document_id and chunk count
 */

export async function ingestDocument(userId, documentName, documentText) {
    try{
        console.log(`Ingesting document: ${documentName} for user: ${userId}`);
        // step1: create document recode
        const {data: document, error: docError} = await supabase 
        .from('documents')
        .insert({
            user_id: userId,
            name: documentName,
        })
        .select()
        .single();

        if(docError) throw docError;

        console.log(`Document record created with ID: ${document.id}`);

        // step2: chunking the document text
        const chunks = chunkText(documentText, 500);
        console.log(`Document text chunked into ${chunks.length} chunks.`);

        // step3: generating embeddings for each chunk
        console.log(`Generating embeddings for document chunks...`);
        const embeddings = await generateEmbeddings(chunks, 'search_document');
        console.log(`Generated ${embeddings.length} embeddings.`);

        // step4: preparing chunk records with metadata
        const chunkRecords = chunks.map((chunk, index) => ({
            document_id: document.id,
            user_id: userId,
            content: chunk,
            embedding: embeddings[index],
            chunk_index: index,
        }));
    
        // step5: inserting chunk records into database
        const {data: insertedChunks, error: chunkError} = await supabase
        .from('document_chunks')
        .insert(chunkRecords)
        .select();

        if(chunkError) throw chunkError;
        console.log(`Inserted ${insertedChunks.length} chunks into database.`);

        return{
            sucess: true,
            document_id: document.id,
            document_name: documentName,
            chunks_count: insertedChunks.length,
        };

    }catch(error){
        console.error('Error ingesting document:', error.message);
        throw error;    
    }
}


/**
 * deleting a document and all its chunks
 * @param {string} documentId - UUID of the document
 * @returns {Promise<object>} Result
 */

export async function deleteDocument(documentId, userId){
    try{
        const {error} = await supabase
        .from('documents')
        .delete()
        .match({id: documentId, user_id: userId});

        if(error) throw error;
        console.log(`Document with ID: ${documentId} deleted successfully.`);
        return {
            success: true,
            document_id: documentId,
        };
    }catch(error){
        console.error('Error deleting document:', error.message);
        throw error;
    }
}


/**
 * Get all documents for a user
 * @param {string} userId - UUID of the user
 * @returns {Promise<array>} Array of documents
 */

export async function getUserDocuments(userId){
    try{
        const {data, error} = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

        if(error) throw error;

        return data;
    }catch(error){
        console.error('Error fetching user documents:', error.message);
        throw error;
    }
}