/**
 * Conversation memory for agents
 */

export class ConversationMemory {
  constructor(maxTurns = 10) {
    this.history = [];
    this.maxTurns = maxTurns;
  }

  //adding a message to memory
  addMessage(role, content, toolCalls = null) {
    this.history.push({
      role, // 'user' or 'agent'
      content,
      toolCalls,
      timestamp: new Date().toISOString(),
    });

    //keep only last n turns in history
    if (this.history.length > this.maxTurns * 2) {
      this.history = this.history.slice(-this.maxTurns * 2);
    }
  }
  
  /**
   * Get conversation history as string
   */
  getContext() {
    return this.history
      .map((msg) => {
        const role = msg.role.toUpperCase();
        // If it's a tool, add a label so the AI knows it's an observation
        if (msg.role === 'tool') {
          return `OBSERVATION (Tool Result): ${msg.content}`;
        }
        return `${role}: ${msg.content}`;
      })
      .join('\n');
  }

  /**
   * Get full history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Clear memory
   */
  clear() {
    this.history = [];
  }

  /**
   * Get last N messages
   */
  getRecent(n = 5) {
    return this.history.slice(-n);
  }
}