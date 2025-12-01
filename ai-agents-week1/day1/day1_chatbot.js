import Groq from 'groq-sdk';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();
//initializing groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// // Debug: Check if API key is loaded
// if (!geniniApiKey) {
//   console.error('ERROR: API key not found!');
//   console.error('Make sure you have a .env file with: gemini_api_key=YOUR_KEY');
//   process.exit(1);
// }
// console.log(`API Key loaded: ${geniniApiKey.substring(0, 10)}...`);

//settuping up readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//function that asks question from user and returns the input
function askQuestion(promptText) {
  return new Promise((resolve) => {
    rl.question(promptText, (input) => resolve(input));
  });
}

//main chat loop
async function startChat() {
  console.log("Chatbot is ready! Type 'exit' to quit.");

  while (true) {
    const userInput = await askQuestion('You: ');

    if (userInput.toLowerCase() === 'exit') {
      console.log('Exiting chat. Goodbye!');
      break;
    }
    try {
      //calling groq api
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: userInput,
          },
        ],
      });

      //extracting ai response
      const botMessage = response.choices[0].message.content;
      console.log('Bot: ', botMessage, '\n');
    } catch (error) {
      console.error('Error communicating with Groq API:', error);
    }
  }
  rl.close();
}

startChat();
