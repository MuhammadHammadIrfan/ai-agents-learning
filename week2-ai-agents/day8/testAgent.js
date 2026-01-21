import {Agent} from './agent.js'

async function testAgentCapabilities(){
    console.log('Testing AI Agent Capabilities...\n');
    const agent = new Agent();

    //Test 1: Calculator Tool
    console.log('Test 1: Calculator Tool');
    const calcResponse = await agent.run('What is the result of 84 multiplied by 47 plus 109?');
    console.log(`Agent Response: ${calcResponse.answer}\n`);
    agent.reset();


    //Test 2: Complex Maths
      console.log('\nTEST 2: Complex Math');
      const calc2 = await agent.run('Calculate the square root of 144 plus 25');
      console.log('Result:', calc2.answer);

      agent.reset();

    //Test 3: Web Search Tool
    console.log('\nTEST 3: Web Search Tool');
    const searchResponse = await agent.run('What are the latest advancements in AI technology as of 2026?');
    console.log(`Agent Response: ${searchResponse.answer}\n`);
    agent.reset();
    
    //Test 4: Direct Answer (no tool)
    console.log('\nTEST 4: Direct Answer (No Tool)');
    const directResponse = await agent.run('Who is the current president for USA in 2026?');
    console.log(`Agent Response: ${directResponse.answer}\n`);
    agent.reset();

    //Test 5: Multi-turn conversation
    console.log('\nTEST 5: Multi-turn Conversation');
    let agent2 = new Agent();
    let response1 = await agent2.run('What is the population of Japan?');
    console.log(`Agent Response: ${response1.answer}\n`);
    let response2 = await agent2.run('And what about its GDP?');
    console.log(`Agent Response: ${response2.answer}\n`);
    agent2.reset();

    console.log('All tests completed.');
}
testAgentCapabilities().catch(console.error);