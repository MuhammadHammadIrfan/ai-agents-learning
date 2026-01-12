import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { testConnection, supabase } from './supabaseClient.js';
import {
  ingestDocument,
  getUserDocuments,
  deleteDocument,
} from './ingestion.js';
import { answerQuestion } from './rag.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// testing connection on startup
await testConnection();

// User EndPionts
/**
* PORT /users - create a new user
* Body: {email: string}
*/
app.post('/users', async(req, res)=>{
    try{
        const{email} = req.body;

        if(!email){
            return res.status(400).json({error: 'Email is required'});
        }
        const {data, error} = await supabase
        .from('users')
        .insert({email})
        .select()
        .single();

        if(error) throw error;

        res.json({
            success: true,
            user: data,
        });
    }catch(error){
        console.error('Error creating user:', error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

/**
 * Get /user/:userId - get user info
*/
app.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
* Delete - /users/:userId - delete a user 
*/
app.delete('/users/:userId', async(req, res)=>{
  try{
    const{userId} = req.params;
    const{data, error} = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
    .select();

    if(error) throw error;
    res.json({
      success: true,
      deletedUser: data,
    });

  }catch(error){
    console.error('Error deleting user:', error);
    res.status(500).json({error: 'Internal Server Error'});
  }
});


// Document EndPoints
/**
 * POST /documents/upload - Upload a document
 * Body: { userId: string, documentName: string, documentText: string }
 */
app.post('/documents/upload', async (req, res) => {
  try{
    const { userId, documentName, documentText } = req.body;
    if (!userId || !documentName || !documentText) {
      return res.status(400).json({ error: 'userId, documentName and documentText are required' });
    }

    //verifying if user exists
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await ingestDocument(userId, documentName, documentText);
    res.json({
      success: true,
      message: 'Document ingested successfully',
      ...result,
    });

  }catch(error){
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

/**
* Get /documents/:userId - Get all documents for a user
*/
app.get('/documents/:userId', async(req, res)=>{
  try{
    const{userId} = req.params;
    const documents = await getUserDocuments(userId);
    res.json({
      success: true,
      documents,
    });
  }catch(error){
    console.error('Error fetching documents:', error);
    res.statusCode(500).json({error: 'Internal Server Error'});
  }
})

/** 
* Delete /documents/:documentId - Delete a document
*/
app.delete('/documents/:userId/:documentId', async(req, res)=>{
  try{
    const{userId, documentId} = req.params;
    const result = await deleteDocument(documentId, userId);
    res.json({
      success: true,
      ...result,
    });
  }catch(error){
    console.error('Error deleting document:', error);
    res.status(500).json({error: 'Internal Server Error'});
  }
});


// RAG/Chat EndPoint
/**
* POST /chat/query - Ask a question (RAG)
* Body: {userId: string, question: string, topK?: number}
*/
app.post('/chat/query', async(req, res)=>{
  try{
    const{userId, question, topK} = req.body;
    if(!userId || !question){
      return res.status(400).json({error: 'userId and question are required'});
    }
    //verifying if user exists
    const{data: user} = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

    if(!user){
      res.status(404).json({error:'User not found'});
    }

    // answering the question using RAG
    const result = await answerQuestion(userId, question, topK);
    res.json({
      success: true,
      question,
      ...result,
    });
  
  }catch(error){
    console.error('Error processing chat query:', error);
    res.status(500).json({error: 'Internal Server Error'});
  }
});

// Health Check Endpoint
app.get('health', (req, res)=>{
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});


// Starting the server
app.listen(PORT, ()=>{
  console.log(`Server is running on port ${PORT}`);
  console.log('Available Endpoints:');
  console.log(`POST   /users                - Create a new user`);
  console.log(`GET    /users/:userId        - Get user info`);
  console.log(`DELETE /users/:userId        - Delete a user`);
  console.log(`POST   /documents/upload     - Upload a document`);
  console.log(`GET    /documents/:userId    - Get all documents for a user`);
  console.log(`DELETE /documents/:documentId- Delete a document`);
  console.log(`POST   /chat/query           - Ask a question (RAG)`);
  console.log(`GET    /health               - Health check`);
});