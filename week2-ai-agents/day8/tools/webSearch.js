/**
 * Web Search tool (mock implementation for learning)
 * In production, integrate with Tavily, Serper, or Google Custom Search
 */
import { tavily } from '@tavily/core';

// 1. Initialize with your API key from your .env file
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export const webSearchTool = {
  name: 'web_search',
  description: 'Searches the internet for current news and facts.',

  parameters: {
    query: {
      type: 'string',
      description: 'The search query string',
      required: true,
    },
    numResults: {
      type: 'number',
      description: 'Number of results (default 3)',
      required: false,
    },
  },

  async execute({ query, numResults = 3 }) {
    try {
      console.log(`Real Search: "${query}"`);

      // 2. Perform the actual search
      // search_depth: "advanced" gets better data for complex AI tasks
      const response = await tvly.search(query, {
        searchDepth: 'advanced',
        maxResults: numResults,
      });

      // 3. Map the results to a format the AI understands
      const formattedResults = response.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content, // This is the clean text snippet Tavily provides
      }));

      return {
        success: true,
        results: formattedResults,
        message: `Found ${formattedResults.length} real-time results for "${query}".`,
      };
    } catch (error) {
      // Internal logging for you, generic message for the user
      console.error('Search API Error:', error.message);
      return { success: false, message: 'Failed to fetch live web data.' };
    }
  },
};
