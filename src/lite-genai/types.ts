/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';

export interface FlowConfig<I = any, O = any> {
  name: string;
  inputSchema?: z.ZodSchema<I>;
  outputSchema?: z.ZodSchema<O>;
  handler: (input: I, context?: FlowContext) => Promise<O>;
}

export interface FlowContext {
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface SessionData {
  id: string;
  messages: ChatMessage[];
  state?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface FlowRequest {
  input: any;
  sessionId?: string;
}

export interface FlowResponse<T = any> {
  result: T;
  sessionId?: string;
  error?: string;
}

export interface Chat {
  id: string;
  sessionId: string;
  send(message: string): Promise<string>;
  getMessages(): ChatMessage[];
  addMessage(role: 'user' | 'assistant', content: string): void;
}

export interface RunFlowConfig {
  url: string;
  input: any;
}

// OpenAI related types
export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

// Stable Diffusion related types
export interface StableDiffusionConfig {
  baseUrl: string;
  timeout?: number;
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
}