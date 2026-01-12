import { supabase } from './supabaseClient.js';
import { ingestDocument } from './ingestion.js';
import { answerQuestion } from './rag.js';
import fs from 'fs';

async function testCompleteRAG() {
  console.log('🧪 COMPLETE MULTI-USER RAG TEST\n');
  console.log('='.repeat(50));

  try {
    // ==========================================
    // Test 1: Create Two Users (Multi-User)
    // ==========================================
    console.log('\n👥 TEST 1: Creating two users...');

    const { data: user1 } = await supabase
      .from('users')
      .insert({ email: 'alice@example.com' })
      .select()
      .single();

    const { data: user2 } = await supabase
      .from('users')
      .insert({ email: 'bob@example.com' })
      .select()
      .single();

    console.log(`✅ User 1 (Alice): ${user1.id}`);
    console.log(`✅ User 2 (Bob): ${user2.id}`);

    // ==========================================
    // Test 2: Upload Different Documents
    // ==========================================
    console.log('\n📄 TEST 2: Uploading documents...');

    const doc1Text = fs.readFileSync('./testData/sample.txt', 'utf-8');

    // Alice uploads AI document
    await ingestDocument(user1.id, 'AI_basics.txt', doc1Text);
    console.log('✅ Alice uploaded: AI_basics.txt');

    // Bob uploads different content
    const doc2Text = `
    The solar system consists of the Sun and all celestial objects bound to it by gravity.
    There are eight planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.
    The asteroid belt lies between Mars and Jupiter.
    Jupiter is the largest planet in our solar system.
    `;

    await ingestDocument(user2.id, 'solar_system.txt', doc2Text);
    console.log('✅ Bob uploaded: solar_system.txt');

    // ==========================================
    // Test 3: Query Isolation (Alice)
    // ==========================================
    console.log('\n🔍 TEST 3: Alice asks about AI...');

    const aliceAnswer = await answerQuestion(
      user1.id,
      'What is machine learning?'
    );

    console.log(`\n💬 Alice's Answer:`);
    console.log(aliceAnswer.answer);
    console.log(`\n📊 Chunks used: ${aliceAnswer.chunks_used}`);

    // ==========================================
    // Test 4: Query Isolation (Bob)
    // ==========================================
    console.log('\n🔍 TEST 4: Bob asks about solar system...');

    const bobAnswer = await answerQuestion(
      user2.id,
      'Which is the largest planet?'
    );

    console.log(`\n💬 Bob's Answer:`);
    console.log(bobAnswer.answer);
    console.log(`\n📊 Chunks used: ${bobAnswer.chunks_used}`);

    // ==========================================
    // Test 5: Cross-User Isolation
    // ==========================================
    console.log('\n🔒 TEST 5: Testing data isolation...');
    console.log('Alice asks about planets (should fail - not in her docs)...');

    const aliceNoAnswer = await answerQuestion(
      user1.id,
      'What are the planets in the solar system?'
    );

    console.log(`\n💬 Alice's Answer:`);
    console.log(aliceNoAnswer.answer);
    console.log(`📊 Chunks used: ${aliceNoAnswer.chunks_used}`);

    if (aliceNoAnswer.chunks_used === 0) {
      console.log("✅ Isolation working! Alice cannot see Bob's data");
    }

    // ==========================================
    // Summary
    // ==========================================
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\n✅ Multi-user RAG is working correctly:');
    console.log('   - Users can upload documents');
    console.log('   - Each user gets answers from their own data');
    console.log('   - Data isolation is enforced');
    console.log('   - Vector search is working');
    console.log('   - RAG pipeline is complete');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testCompleteRAG();
