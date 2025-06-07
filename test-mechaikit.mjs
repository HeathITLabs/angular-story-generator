#!/usr/bin/env node
/**
 * Test script to verify MechaiKit framework functionality
 */

import { config } from 'dotenv';
import { getOpenAIClient, getStableDiffusionClient } from './src/lite-genai/index.js';

// Load environment variables
config();

async function testMechaiKit() {
  console.log('🧪 Testing MechaiKit Framework...\n');
  
  try {
    // Test OpenAI Client
    console.log('📝 Testing OpenAI Client...');
    const openaiClient = getOpenAIClient();
    
    const testPrompt = 'Hello! Please respond with "MechaiKit is working!" to confirm the connection.';
    const response = await openaiClient.generateCompletion(testPrompt, 'gpt-3.5-turbo', 50, 0.7);
    
    console.log('✅ OpenAI Response:', response);
    console.log('');
    
    // Test Stable Diffusion Client (optional, might not be running)
    console.log('🎨 Testing Stable Diffusion Client...');
    try {
      const sdClient = getStableDiffusionClient();
      // Just test if we can create the client, don't actually generate an image
      console.log('✅ Stable Diffusion client initialized successfully');
      console.log('⚠️  Note: Actual image generation requires Stable Diffusion server running on localhost:7860');
    } catch (sdError) {
      console.log('⚠️  Stable Diffusion client test skipped:', sdError.message);
    }
    console.log('');
    
    console.log('🎉 MechaiKit Framework is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add your OpenAI API key to .env file');
    console.log('2. Optional: Start Stable Diffusion server on localhost:7860');
    console.log('3. Run: npm start');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure you have set OPENAI_API_KEY in your .env file');
    console.log('2. Check your internet connection');
    console.log('3. Verify your OpenAI API key is valid');
  }
}

testMechaiKit();
