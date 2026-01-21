import { CohereClient } from 'cohere-ai';
import { toolRegistry } from './tools/toolRegistry.js';
import { ConversationMemory } from './memory.js';
import dotenv from 'dotenv';

dotenv.config();

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
/**
 * AI Agent with tool calling capabilities
 */
export class Agent {
  constructor(userId = null) {
    this.userId = userId;
    this.memory = new ConversationMemory();
    this.maxIterations = 10; //preventing infinite loops
  }
  /**
   * Main agent loop: Think → Decide → Execute → Respond
   */
  async run(userMessage) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`AGENT PROCESSING: "${userMessage}"`);
    console.log(`${'='.repeat(60)}\n`);

    // add user message to memory
    this.memory.addMessage('user', userMessage);

    let iteration = 0;
    let finalAnswer = null;

    while (iteration < this.maxIterations && !finalAnswer) {
      iteration++;
      console.log(`\n--- Iteration ${iteration}/${this.maxIterations} ---\n`);

      // Step1: Think - Agent will decide what to do (with full context)
      const decision = await this.think();

      // Step2: Decide - Check if tool required or direct answer
      if (decision.needsTool) {
        console.log(`Agent decided to use tool: ${decision.toolName}`);

        // Step3: Execute - Run the tool
        const toolResult = await this.executeTool(
          decision.toolName,
          decision.toolParams,
        );
        const observationString = JSON.stringify(toolResult);
        console.log(`Tool Result: ${observationString}`);

        // Step4: Observe - Add tool result to memory
        this.memory.addMessage('tool', observationString, {
          tool: decision.toolName,
          params: decision.toolParams,
        });

        //continue loop with tool result
      } else {
        finalAnswer = decision.response;
        console.log(`Agent final response: ${finalAnswer}`);
      }
    }
    if (!finalAnswer) {
      finalAnswer =
        "I couldn't complete the task within the allowed iterations.";
    }

    // adding agent response to memory
    this.memory.addMessage('agent', finalAnswer);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 FINAL ANSWER: ${finalAnswer}`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      answer: finalAnswer,
      iterations: iteration,
      memory: this.memory.getHistory(),
    };
  }

  /**
   * Agent thinking: Decide if tool is needed
   */
  async think() {
    const tools = toolRegistry.getToolDescriptions();
    const context = this.memory.getContext();

    const prompt = this.buildThinkingPrompt(tools, context);
    const response = await cohere.chat({
      model: 'command-r-plus-08-2024',
      message: prompt,
      temperature: 0.2,
    });

    const answer = response.text.trim();
    return this.parseDecision(answer);
  }

  /**
   * Build prompt for agent thinking
   */
  buildThinkingPrompt(tools, context) {
    const toolsDescription = tools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    return `You are an AI agent with access to tools. You must break down complex tasks into steps and use the appropriate tools.

AVAILABLE TOOLS:
${toolsDescription}

CONVERSATION HISTORY:
${context}

IMPORTANT RULES:
1. For questions about "my documents" or "database" → ALWAYS use search-documents tool first
2. For math calculations → use calculator tool with the expression parameter
3. For web searches or general knowledge → use web_search tool
4. Review tool results before deciding next action
5. DO NOT repeat the same tool - learn from results
6. Only give ANSWER when you have completed ALL steps

RESPONSE FORMAT (you MUST follow this exactly):
- Use a tool: TOOL: tool_name | PARAMS: {"param": "value"}
- Final answer: ANSWER: your complete response

Example 1:
User asks: "How many documents do I have?"
Your response: TOOL: search-documents | PARAMS: {"query": "list documents"}

Example 2:
After getting tool result with 3 documents
Your response: ANSWER: You have 3 documents in your database.

Example 3:
User asks: "Calculate 25 + 30"
Your response: TOOL: calculator | PARAMS: {"expression": "25 + 30"}

YOUR TURN - What is your next action?`;
  }

  /**
   * Parse agent's decision from response
   */
  parseDecision(response) {
    console.log('Raw agent response:', response);

    if (response.includes('TOOL:')) {
      // Extract tool name and params (support hyphens and underscores)
      const toolMatch = response.match(/TOOL:\s*([\w-]+)/i);
      const paramsMatch = response.match(/PARAMS:\s*(\{[^}]*\})/s);

      const toolName = toolMatch ? toolMatch[1].toLowerCase() : null;
      let toolParams = {};

      if (paramsMatch) {
        try {
          toolParams = JSON.parse(paramsMatch[1]);
        } catch (e) {
          console.error('Failed to parse tool params:', paramsMatch[1]);
          console.error('Error:', e.message);
        }
      }

      console.log('Parsed tool:', toolName, 'with params:', toolParams);

      return {
        needsTool: true,
        toolName,
        toolParams,
      };
    } else if (response.includes('ANSWER:')) {
      const answerMatch = response.match(/ANSWER:\s*(.*)/s);
      return {
        needsTool: false,
        response: answerMatch ? answerMatch[1].trim() : response,
      };
    } else {
      // If agent doesn't follow format, log warning but treat as answer
      console.warn(
        '⚠️  Agent did not follow TOOL/ANSWER format. Response:',
        response.substring(0, 100),
      );
      return {
        needsTool: false,
        response: response,
      };
    }
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName, toolParams) {
    try {
      // Normalize tool name (convert underscores to hyphens for consistency)
      if (toolName === 'search-documents' && this.userId) {
        toolParams.userId = this.userId;
      }
      return await toolRegistry.execute(toolName, toolParams);
    } catch (error) {
      return {
        success: false,
        message: `Error executing tool ${toolName}: ${error.message}`,
      };
    }
  }

  /**
   * Clear agent memory
   */
  reset() {
    this.memory.clear();
  }
}
