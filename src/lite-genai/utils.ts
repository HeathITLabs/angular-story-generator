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
    // Try to extract JSON from text that might contain other content
    let fixed = jsonString.trim();
    
    // Remove <think> tags and similar reasoning content
    fixed = fixed.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Try to find JSON object or array boundaries
    const jsonObjectMatch = fixed.match(/\{[\s\S]*\}/);
    const jsonArrayMatch = fixed.match(/\[[\s\S]*\]/);
    
    if (jsonObjectMatch) {
      fixed = jsonObjectMatch[0];
    } else if (jsonArrayMatch) {
      fixed = jsonArrayMatch[0];
    }
    
    fixed = fixed.trim();
    
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
    
    try {
      return JSON.parse(fixed);
    } catch (e2) {
      throw new Error(`Unable to parse JSON: ${jsonString}`);
    }
  }
}

/**
 * Simple retry utility
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 2000 // Increased delay between retries
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt} failed:`, error);
      
      // If it's a timeout error, increase delay more aggressively
      const isTimeout = error instanceof Error && 
        (error.message.includes('timeout') || error.message.includes('TIMEOUT'));
      
      if (attempt < maxAttempts) {
        const backoffDelay = isTimeout ? delay * attempt * 2 : delay * attempt;
        console.log(`Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
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