/**
 * Simple test to verify flow definitions are working
 */

// Test imports
try {
  const flows = require('./src/flows.ts');
  console.log('✅ Flows imported successfully');
  console.log('Available flows:', Object.keys(flows));
  
  // Test that flows have the expected structure
  if (flows.descriptionFlow && flows.beginStoryFlow && flows.continueStoryFlow && flows.genImgFlow) {
    console.log('✅ All expected flows are present');
  } else {
    console.log('❌ Missing some flows');
  }
  
} catch (error) {
  console.error('❌ Error importing flows:', error.message);
}

console.log('Flow test completed.');
