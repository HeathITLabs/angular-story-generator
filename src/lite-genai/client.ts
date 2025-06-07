/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Client-side interface compatible with Genkit's runFlow
export interface RunFlowConfig {
  url: string;
  input: any;
}

export async function runFlow<T = any>(config: RunFlowConfig): Promise<T> {
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config.input)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Return the result directly to match Genkit's behavior
    return data.result || data;
  } catch (error) {
    console.error('Flow execution error:', error);
    throw error;
  }
}
