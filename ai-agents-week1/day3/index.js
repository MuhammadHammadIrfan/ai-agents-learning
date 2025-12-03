import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;
const groq = new Groq({apiKey: process.env.GROQ_API_KEY});

// In-memory chat sessions
//  sessions = {
//     user1:[{role, content},..],
//     user2:[...]
// }

const sessions = {};

app.post('/chat', async (req, res) => {
    try{
        const{userId, message} = req.body;
        if(!userId)
            return res.status(400).json({ error: 'User ID is required' });
        if(!message)
            return res.status(400).json({ error: 'Message is required' });

        if(!sessions[userId]){
            sessions[userId] = [{role: "system", content: "You are a helpful assistant."}]
        }

        const userSession = sessions[userId];
        userSession.push({ role: 'user', content: message });

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: userSession
        });

        const reply = completion.choices[0].message.content;
        userSession.push({ role: 'assistant', content: reply });

        console.log(`Chat with ${userId}:`, userSession);
        return res.json({reply});

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/chat/delete-history', (req, res)=>{
    const {userId} = req.body;
    if(!userId){
        return res.status(400).json({error:"userId is required."})
    }

    delete sessions[userId];
    return res.json({message:`Chat history for user ${userId} deleted successfully.`});
})


app.listen(port, ()=>{
    console.log(`Server is running at http://localhost:${port}`);
})