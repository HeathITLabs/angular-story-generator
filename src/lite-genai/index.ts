/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Core exports
export { FlowEngine, flowEngine, defineFlow } from './flow-engine';
export { SessionStore, sessionStore } from './session-store';
export { OpenAIClient, getOpenAIClient } from './openai-client';
export { StableDiffusionClient, getStableDiffusionClient } from './stable-diffusion';
export { createFlowRouter, expressHandler, expressHandlerWithMeta } from './express-handler';
export { parsePartialJson, retry, Logger } from './utils';
export { runFlow } from './client';

// Type exports
export type {
  FlowConfig,
  FlowContext,
  SessionData,
  ChatMessage,
  FlowRequest,
  FlowResponse,
  Chat,
  RunFlowConfig,
  OpenAIConfig,
  StableDiffusionConfig,
  ImageGenerationRequest
} from './types';

// Import for local use
import { defineFlow as defineFlowInternal } from './flow-engine';
import { sessionStore as sessionStoreInternal } from './session-store';
import { flowEngine as flowEngineInternal } from './flow-engine';

// Genkit-compatible interface object
export const genkit = {
  defineFlow: defineFlowInternal,
  definePrompt: (config: any, template: any) => {
    // Simple prompt definition - just return the template for now
    return {
      name: config.name,
      template,
      render: (vars: any) => {
        // Simple template rendering
        let rendered = template;
        if (typeof template === 'function') {
          rendered = template(vars);
        } else if (typeof template === 'string') {
          // Simple variable substitution
          Object.keys(vars || {}).forEach(key => {
            rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), vars[key]);
          });
        }
        return rendered;
      }
    };
  }
};

// Main factory function to create a lite-genkit instance
export function createLiteGenkit(config?: { plugins?: any[] }) {
  return {
    defineFlow: defineFlowInternal,
    definePrompt: genkit.definePrompt,
    sessionStore: sessionStoreInternal,
    flowEngine: flowEngineInternal
  };
}