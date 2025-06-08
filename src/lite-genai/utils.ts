/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Parse partial JSON strings - useful for streaming responses
 */
export function parsePartialJson(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.log('Initial JSON parse failed, attempting to fix...', {
      length: jsonString.length,
      preview: jsonString.substring(0, 200) + '...'
    });
    
    // Try to fix common issues with partial JSON
    let fixed = jsonString.trim();
    
    // Remove <think> tags and similar reasoning content FIRST
    fixed = fixed.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Clean up any remaining whitespace after removing think tags
    fixed = fixed.trim();
    
    // Remove markdown code blocks (```json...``` or ```...```)
    const markdownMatch = fixed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
      fixed = markdownMatch[1].trim();
    } else {
      // If no closing ```, try to extract from opening ```json to end
      const partialMarkdownMatch = fixed.match(/```(?:json)?\s*([\s\S]*?)$/i);
      if (partialMarkdownMatch) {
        fixed = partialMarkdownMatch[1].trim();
      }
    }
    
    // Try to find JSON object boundaries more aggressively
    // Look for the first { and the last } to extract the JSON object
    const firstBrace = fixed.indexOf('{');
    const lastBrace = fixed.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      fixed = fixed.substring(firstBrace, lastBrace + 1);
    } else if (firstBrace !== -1) {
      // If we found opening brace but no closing, try to fix it
      fixed = fixed.substring(firstBrace);
    }
    
    fixed = fixed.trim();
    
    // Handle incomplete string values by closing them
    // Look for incomplete strings at the end (quotes that aren't closed)
    if (fixed.match(/:\s*"[^"]*$/)) {
      fixed = fixed.replace(/:\s*"([^"]*)$/, ': "$1"');
    }
    
    // Handle incomplete arrays by closing them
    if (fixed.match(/\[\s*"[^"]*$/)) {
      fixed = fixed.replace(/\[\s*"([^"]*)$/, '["$1"]');
    }
    
    // Add missing closing braces
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const missingBraces = openBraces - closeBraces;
    
    if (missingBraces > 0) {
      fixed += '}'.repeat(missingBraces);
    }
    
    // Add missing closing brackets
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    const missingBrackets = openBrackets - closeBrackets;
    
    if (missingBrackets > 0) {
      fixed += ']'.repeat(missingBrackets);
    }
    
    console.log('Attempting to parse fixed JSON:', {
      fixedLength: fixed.length,
      fixedPreview: fixed.substring(0, 200) + (fixed.length > 200 ? '...' : '')
    });
    
    try {
      const result = JSON.parse(fixed);
      console.log('Successfully parsed JSON after fixes');
      return result;
    } catch (e2) {
      console.error('Failed to parse JSON after all attempts:', {
        original: jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : ''),
        processed: fixed.substring(0, 500) + (fixed.length > 500 ? '...' : ''),
        error: e2
      });
      throw new Error(`Unable to parse JSON: ${jsonString.substring(0, 200)}...`);
    }
  }
}

/**
 * Simple retry utility
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Simple logging utility
 */
export class Logger {
  constructor(private prefix: string) {}
  
  log(...args: any[]) {
    console.log(`[${this.prefix}]`, ...args);
  }
  
  error(...args: any[]) {
    console.error(`[${this.prefix}]`, ...args);
  }
  
  warn(...args: any[]) {
    console.warn(`[${this.prefix}]`, ...args);
  }
}