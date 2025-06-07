#!/usr/bin/env node
/**
 * MechaiKit Verification Script
 * Verifies that all components are properly configured and ready
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MechaiKit Framework Verification\n');

let allChecksPass = true;

// Check 1: Required files exist
console.log('📁 Checking core files...');
const requiredFiles = [
  'src/lite-genai/index.ts',
  'src/lite-genai/types.ts', 
  'src/lite-genai/flow-engine.ts',
  'src/lite-genai/openai-client.ts',
  'src/lite-genai/stable-diffusion.ts',
  'src/lite-genai/session-store.ts',
  'src/lite-genai/express-handler.ts',
  'src/lite-genai/client.ts',
  'src/lite-genai/utils.ts',
  'src/flows.ts',
  'src/server.ts',
  '.env'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allChecksPass = false;
  }
});

// Check 2: Package.json dependencies
console.log('\n📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = packageJson.dependencies || {};
  
  const requiredDeps = ['openai', 'uuid', 'zod', 'express'];
  const removedDeps = ['genkit', '@genkit-ai/express', '@genkit-ai/googleai'];
  
  requiredDeps.forEach(dep => {
    if (deps[dep]) {
      console.log(`  ✅ ${dep}: ${deps[dep]}`);    } else {
      console.log(`  ❌ ${dep} - MISSING!`);
      allChecksPass = false;
    }
  });
  
  removedDeps.forEach(dep => {
    if (!deps[dep]) {
      console.log(`  ✅ ${dep} - correctly removed`);
    } else {
      console.log(`  ⚠️  ${dep} - still present (should be removed)`);
    }
  });
} catch (error) {
  console.log('  ❌ Error reading package.json');
  allChecksPass = false;
}

// Check 3: Environment configuration
console.log('\n🔧 Checking environment configuration...');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  
  if (envContent.includes('OPENAI_API_KEY=')) {
    if (envContent.includes('your_openai_api_key_here') || envContent.includes('sk-test-key-placeholder')) {
      console.log('  ⚠️  OPENAI_API_KEY needs to be set to your actual API key');
    } else {
      console.log('  ✅ OPENAI_API_KEY is configured');
    }
  } else {
    console.log('  ❌ OPENAI_API_KEY not found in .env');
    allChecksPass = false;
  }
  
  if (envContent.includes('STABLE_DIFFUSION_URL=')) {
    console.log('  ✅ STABLE_DIFFUSION_URL is configured');
  } else {
    console.log('  ⚠️  STABLE_DIFFUSION_URL not configured (optional)');
  }
} catch (error) {
  console.log('  ❌ Error reading .env file');
  allChecksPass = false;
}

// Check 4: TypeScript compilation
console.log('\n🔧 Checking TypeScript compilation...');
const { exec } = require('child_process');

exec('npx tsc --noEmit --skipLibCheck', (error, stdout, stderr) => {
  if (error) {
    console.log('  ❌ TypeScript compilation errors detected');
    console.log('  📝 Run: npx tsc --noEmit to see details');
  } else {
    console.log('  ✅ TypeScript compilation successful');
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  if (allChecksPass) {
    console.log('🎉 MechaiKit Framework: READY TO USE!');
    console.log('\n📋 Next steps:');
    console.log('1. Add your OpenAI API key to .env file');
    console.log('2. Run: npm start');
    console.log('3. Open: http://localhost:4200');
    console.log('\n💡 Optional: Start Stable Diffusion server for image generation');
  } else {
    console.log('❌ MechaiKit Framework: ISSUES DETECTED');
    console.log('\n🔧 Please fix the issues above before running the application');
  }
  console.log('='.repeat(50));
});
