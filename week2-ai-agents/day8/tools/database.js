import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Database query tool - searches user's documents
 */
export const databaseTool = {
  name: 'search-documents',
  description:
    'Search user documents in the database. Use this tool when asked about personal files or "my documents".',
  parameters: {
    userId: { type: 'string', required: true },
    query: { type: 'string', required: true },
  },

  // 1. Corrected spelling to 'execute'
  async execute(params) {
    try {
      const { userId, query } = params;

      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, name, created_at')
        .eq('user_id', userId);

      if (error) throw error;
      if (!documents || documents.length === 0) {
        return { success: true, documents: [], message: 'No documents found.' };
      }

      // 2. Corrected Promise.caller to Promise.all
      const docWithChunks = await Promise.all(
        documents.map(async (doc) => {
          const { count } = await supabase
            .from('document_chunks')
            .select('id', { count: 'exact', head: true })
            .eq('document_id', doc.id);

          return { ...doc, chunk_count: count };
        }),
      );

      return {
        success: true,
        documents: docWithChunks,
        message: `Found ${docWithChunks.length} documents for the user.`,
      };
    } catch (error) {
      console.error('Database Tool Error:', error);
      return { success: false, message: 'Error searching documents' };
    }
  },
};