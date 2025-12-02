import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

let chatHistory = [];

// chat request, post endpoint
app.post('/chat', async (req, res)=> {
    try{
        const {message} = req.body;
        chatHistory.push({role:"user", content:message});

        if(!message){
            return res.status(400).json({error:"Message is required"});
        }
        console.log("User Message: ", message);
        
        //calling groq llm
        const completion = await groq.chat.completions.create({
            model:'llama-3.3-70b-versatile',
            messages:[
                {role: "system", content: "You're a helpful assistant."},
                ...chatHistory
            ]
        });
        const reply = completion.choices[0].message.content;
        chatHistory.push({role:"assistant", content:reply});
        console.log("AI Response: ", reply);
        console.log('*' * 70);
        console.log('Chat History: ', chatHistory);
        return res.json({reply});
    }catch(error){
        console.log("Error:", error);
        return res.status(500).json({error:"Internal Server Error"});
    }
})

app.delete('/chat/delete-history', (req,res)=> {
    chatHistory = [];
    return res.json({message:"Chat history deleted successfully"});
})

app.listen(port, ()=>{
    console.log(`Server is running at http://localhost:${port}`);
})