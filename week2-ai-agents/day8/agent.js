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
    this.maxIterations = 5; //preventing infinite loops
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
      // If we ran out of iterations, try to synthesize from memory
      const recentContext = this.memory.getRecent(8);
      const hasResults = recentContext.some((msg) => msg.role === 'tool');

      if (hasResults) {
        finalAnswer =
          'Based on the information I gathered: ' +
          recentContext
            .filter((msg) => msg.role === 'tool')
            .map((msg) => {
              try {
                const result = JSON.parse(msg.content);
                if (result.message) return result.message;
                if (result.result) return `Result: ${result.result}`;
                return JSON.stringify(result);
              } catch {
                return msg.content;
              }
            })
            .join('. ') +
          '. (Note: Reached iteration limit)';
      } else {
        finalAnswer =
          "I couldn't complete the task within the allowed iterations.";
      }
    }

    // adding agent response to memory
    this.memory.addMessage('agent', finalAnswer);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`FINAL ANSWER: ${finalAnswer}`);
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

    const toolsDescription = tools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    const prompt = `You are an autonomous AI agent that solves tasks by using available tools.

AVAILABLE TOOLS:
${toolsDescription}

CONVERSATION HISTORY:
${context}

AGENT DECISION-MAKING PROCESS:

1. ANALYZE THE TASK:
   - What is the user asking for?
   - What information do I need to complete this task?
   - What tools can help me get that information?

2. CHECK CONVERSATION HISTORY:
   - Review previous tool results carefully
   - Have I already obtained the information I need?
   - What step comes next in the task?

3. DECIDE YOUR NEXT ACTION:
   Option A - Use a Tool:
   - If you need information you don't have yet
   - If you need to perform a calculation
   - If you need to search for something
   - Format: TOOL: tool_name | PARAMS: {"param": "value"}
   
   Option B - Provide Final Answer:
   - If you have all the information needed
   - If the task is complete
   - Synthesize all gathered information into a complete response
   - Format: ANSWER: [your complete response]

4. IMPORTANT RULES:
   - NEVER repeat the same tool call if you already have the result
   - Use tool results from the conversation history
   - Break complex tasks into logical steps
   - Each tool call should move you closer to the final answer
   - When you have everything needed, provide the ANSWER immediately

RESPONSE FORMAT (strict):
TOOL: tool_name | PARAMS: {"param": "value"}
OR
ANSWER: your complete answer here

What is your next action?`;

    const response = await cohere.chat({
      model: 'command-r-plus-08-2024',
      message: prompt,
      temperature: 0.2,
    });

    const answer = response.text.trim();
    return this.parseDecision(answer);
  }

  /**
   * Parse agent's decision from response
   */
  parseDecision(response) {
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
          console.error('Failed to parse tool params:', e.message);
        }
      }

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
        'Agent did not follow TOOL/ANSWER format. Response:',
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
      console.log(`Error executing tool ${toolName}:`, error.message);
      return {
        success: false,
        message: `Error executing tool ${toolName}`,
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
