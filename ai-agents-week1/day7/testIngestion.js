import fs from 'fs';
import { supabase, testConnection } from './supabaseClient.js';
import { ingestDocument, getUserDocuments } from './ingestion.js';

async function test() {
  console.log('Testing Document Ingestion...\n');

  // Test connection
  await testConnection();

  // Step 1: Create a test user
  console.log('\nCreating test user...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ email: 'test@example.com' })
    .select()
    .single();

  if (userError) {
    console.error('User creation failed:', userError.message);
    return;
  }

  console.log(`User created: ${user.id}`);

  // Step 2: Load sample document
  const documentText = fs.readFileSync('./testData/sample.txt', 'utf-8');

  // Step 3: Ingest document
  console.log('\nIngesting document...');
  const result = await ingestDocument(user.id, 'sample.txt', documentText);

  console.log('\nIngestion Result:', result);

  // Step 4: Verify documents in DB
  console.log('\nFetching user documents...');
  const documents = await getUserDocuments(user.id);
  console.log(`Found ${documents.length} documents:`, documents);

  // Step 5: Verify chunks in DB
  const { data: chunks, error: chunksError } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index')
    .eq('user_id', user.id)
    .order('chunk_index');

  if (chunksError) {
    console.error('Error fetching chunks:', chunksError.message);
    return;
  }

  console.log(`\nFound ${chunks.length} chunks in database`);
  console.log('\nFirst chunk:', chunks[0]?.content.substring(0, 100) + '...');

  console.log('\nIngestion test complete!');
}

test().catch(console.error);
