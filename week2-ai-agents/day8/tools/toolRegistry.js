import { calculatorTool } from './calculator.js';
import { databaseTool } from './database.js';
import { webSearchTool } from './webSearch.js';

/**
 * Central registry of all available tools
 */
export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  registerDefaultTools() {
    this.register(calculatorTool);
    this.register(databaseTool);
    this.register(webSearchTool);
  }

  register(tool) {
    this.tools.set(tool.name.toLowerCase(), tool);
    console.log(`Registered tool: ${tool.name}`);
  }

  get(toolName) {
    return this.tools.get(toolName.toLowerCase());
  }

  getAll() {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool descriptions for LLM prompt
   */
  getToolDescriptions() {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Execute a tool by name
   */
  async execute(toolName, params) {
    const tool = this.get(toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return await tool.execute(params);
  }
}

export const toolRegistry = new ToolRegistry();
