#!/usr/bin/env node

/**
 * Test story generation with your current OpenAI setup
 */

async function testStoryGeneration() {
  console.log('🧪 Testing Story Generation...\n');

  try {
    const { descriptionFlow, beginStoryFlow } = require('./src/flows.js');
    
    console.log('📝 Testing description flow...');
    const descResult = await descriptionFlow.handler({
      userInput: 'Fantasy adventure',
      sessionId: 'test-session-' + Date.now(),
      clearSession: true
    });
    
    console.log('✅ Description flow result:', {
      storyPremise: descResult.storyPremise.substring(0, 100) + '...',
      nextQuestion: descResult.nextQuestion,
      optionsCount: descResult.premiseOptions.length
    });
    
    console.log('\n📖 Testing story beginning flow...');
    const storyResult = await beginStoryFlow.handler({
      userInput: 'A magical forest adventure with brave elves',
      sessionId: 'test-session-' + Date.now()
    });
    
    console.log('✅ Story beginning result:', {
      storyPartsCount: storyResult.storyParts.length,
      primaryObjective: storyResult.primaryObjective,
      optionsCount: storyResult.options.length,
      progress: storyResult.progress
    });
    
    console.log('\n🎉 All tests passed! Your setup is working correctly.');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('\n💡 Timeout suggestions:');
      console.log('   - Your local model server might be slow');
      console.log('   - Try increasing OPENAI_TIMEOUT to 180000 (3 minutes)');
      console.log('   - Consider using a faster model if available');
    }
    
    if (error.message.includes('Cannot find module')) {
      console.log('\n💡 Module suggestions:');
      console.log('   - Run: npm run build');
      console.log('   - Make sure all dependencies are installed');
    }
  }
}

testStoryGeneration().catch(console.error);
