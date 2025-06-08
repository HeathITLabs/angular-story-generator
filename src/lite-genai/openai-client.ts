/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import OpenAI from 'openai';
import { ChatMessage, OpenAIConfig } from './types';
import { Logger, retry } from './utils';

const logger = new Logger('OpenAIClient');

export class OpenAIClient {
  private client: OpenAI;  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout || 120000, // Increased to 2 minutes for complex story generation
      maxRetries: 2 // Built-in OpenAI retry
    });
    logger.log(`OpenAI client initialized with baseURL: ${config.baseURL || 'default'}, timeout: ${config.timeout || 120000}ms`);
  }

  async generateText(
    messages: ChatMessage[],
    model: string = 'deepseek-r1-distill-llama-8b',
    maxTokens: number = 1000,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      logger.log(`Generating text with model: ${model}`);
      
      const response = await retry(async () => {
        return await this.client.chat.completions.create({
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          max_tokens: maxTokens,
          temperature
        });
      });

      const result = response.choices[0]?.message?.content || '';
      logger.log(`Generated ${result.length} characters`);
      return result;
    } catch (error) {
      logger.error('OpenAI API Error:', error);
      throw new Error(`Failed to generate text from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCompletion(
    prompt: string,
    model: string = 'deepseek-r1-distill-llama-8b',
    maxTokens: number = 1000,
    temperature: number = 0.7
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt, timestamp: new Date() }
    ];
    return this.generateText(messages, model, maxTokens, temperature);
  }

  async generateStructuredOutput<T>(
    messages: ChatMessage[],
    schema: any,
    model: string = 'deepseek-r1-distill-llama-8b'
  ): Promise<T> {
    try {
      // Add instruction to return JSON
      const systemMessage: ChatMessage = {
        role: 'system',
        content: 'You must respond with valid JSON that matches the required schema. Do not include any additional text or formatting.',
        timestamp: new Date()
      };

      const allMessages = [systemMessage, ...messages];
      const response = await this.generateText(allMessages, model, 2000, 0.3);
      
      // Try to parse the JSON response
      try {
        return JSON.parse(response.trim());
      } catch (parseError) {
        logger.error('Failed to parse JSON response:', response);
        throw new Error('Invalid JSON response from OpenAI');
      }
    } catch (error) {
      logger.error('Structured output generation error:', error);
      throw error;
    }
  }

  // Helper method to create a prompt with conversation history
  async generateWithHistory(
    sessionMessages: ChatMessage[],
    newUserMessage: string,
    systemPrompt?: string,
    model: string = 'deepseek-r1-distill-llama-8b'
  ): Promise<string> {
    const messages: ChatMessage[] = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
        timestamp: new Date()
      });
    }
    
    // Add conversation history
    messages.push(...sessionMessages);
    
    // Add new user message
    messages.push({
      role: 'user',
      content: newUserMessage,
      timestamp: new Date()
    });
    
    return this.generateText(messages, model);
  }
}

// Create a singleton instance with environment variables
let openaiClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    openaiClient = new OpenAIClient({
      apiKey,
      baseURL: process.env['OPENAI_BASE_URL'],
      timeout: process.env['OPENAI_TIMEOUT'] ? parseInt(process.env['OPENAI_TIMEOUT']) : undefined
    });
  }
  
  return openaiClient;
}