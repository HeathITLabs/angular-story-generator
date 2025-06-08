#!/usr/bin/env node

/**
 * Simple script to check OpenAI configuration
 */

async function checkOpenAIConfig() {
  console.log('🔍 Checking OpenAI Configuration...\n');

  // Check environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;
  const timeout = process.env.OPENAI_TIMEOUT;

  console.log('Environment Variables:');
  console.log(`  OPENAI_API_KEY: ${apiKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`  OPENAI_BASE_URL: ${baseUrl || '❌ Not set (will use default OpenAI)'}`);
  console.log(`  OPENAI_TIMEOUT: ${timeout || '❌ Not set (will use 60s default)'}`);
  console.log();

  if (!apiKey) {
    console.log('❌ Missing OPENAI_API_KEY environment variable');
    console.log('💡 To fix this:');
    console.log('   1. Get an API key from https://platform.openai.com/api-keys');
    console.log('   2. Set the environment variable:');
    console.log('      set OPENAI_API_KEY=your-api-key-here');
    console.log('   OR');
    console.log('   3. Create a .env file in the project root:');
    console.log('      OPENAI_API_KEY=your-api-key-here');
    return;
  }

  // Test connection with a simple request
  try {
    console.log('🧪 Testing OpenAI connection...');
    
    const OpenAI = require('openai');
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      timeout: parseInt(timeout) || 60000,
      maxRetries: 1
    });

    const response = await client.chat.completions.create({
      model: 'tdeepseek-r1-distill-llama-8b', // Your configured model
      messages: [{ role: 'user', content: 'Say "Hello, world!" in JSON format.' }],
      max_tokens: 50,
      temperature: 0.1
    });

    console.log('✅ OpenAI connection successful!');
    console.log('📝 Response:', response.choices[0]?.message?.content);

  } catch (error) {
    console.log('❌ OpenAI connection failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 Timeout suggestions:');
      console.log('   - Increase timeout: set OPENAI_TIMEOUT=120000 (2 minutes)');
      console.log('   - Check if your endpoint is running and accessible');
    }
    
    if (error.message.includes('404') || error.message.includes('model')) {
      console.log('💡 Model suggestions:');
      console.log('   - Check if "deepseek-r1-distill-llama-8b" is available on your endpoint');
    }

    if (baseUrl) {
      console.log('💡 Endpoint suggestions:');
      console.log(`   - Verify ${baseUrl} is running and accessible`);
      console.log('   - Check firewall/network settings');
    }
  }
}

checkOpenAIConfig().catch(console.error);
