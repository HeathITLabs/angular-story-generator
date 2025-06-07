/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
import { FlowConfig, FlowContext, FlowRequest, FlowResponse } from './types';
import { sessionStore } from './session-store';
import { Logger } from './utils';

const logger = new Logger('FlowEngine');

export class FlowEngine {
  private flows = new Map<string, FlowConfig>();

  defineFlow<I, O>(config: FlowConfig<I, O>): FlowDefinition<I, O> {
    this.flows.set(config.name, config);
    logger.log(`Defined flow: ${config.name}`);
    
    // Return a flow definition object that matches Genkit's interface
    return new FlowDefinition(config);
  }

  async runFlow<I = any, O = any>(
    flowName: string,
    request: FlowRequest
  ): Promise<FlowResponse<O>> {
    const flow = this.flows.get(flowName);
    if (!flow) {
      const error = `Flow '${flowName}' not found`;
      logger.error(error);
      return {
        result: null as any,
        error
      };
    }

    try {
      logger.log(`Running flow: ${flowName}`);
      
      // Validate input if schema provided
      if (flow.inputSchema) {
        try {
          flow.inputSchema.parse(request.input);
        } catch (validationError) {
          const error = `Input validation failed for flow '${flowName}': ${validationError}`;
          logger.error(error);
          return {
            result: null as any,
            sessionId: request.sessionId,
            error
          };
        }
      }

      // Create or get session
      let sessionId = request.sessionId;
      if (!sessionId) {
        sessionId = sessionStore.createSession();
      } else if (!sessionStore.getSession(sessionId)) {
        sessionId = sessionStore.createSession(sessionId);
      }

      const context: FlowContext = {
        sessionId,
        metadata: {}
      };

      // Execute flow
      const result = await flow.handler(request.input, context);

      // Validate output if schema provided
      if (flow.outputSchema) {
        try {
          flow.outputSchema.parse(result);
        } catch (validationError) {
          const error = `Output validation failed for flow '${flowName}': ${validationError}`;
          logger.error(error);
          return {
            result: null as any,
            sessionId,
            error
          };
        }
      }

      logger.log(`Flow '${flowName}' completed successfully`);
      return {
        result,
        sessionId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Flow '${flowName}' error:`, error);
      return {
        result: null as any,
        sessionId: request.sessionId,
        error: errorMessage
      };
    }
  }

  getFlow(name: string): FlowConfig | undefined {
    return this.flows.get(name);
  }

  listFlows(): string[] {
    return Array.from(this.flows.keys());
  }

  async executeFlow<I, O>(flowName: string, input: I, sessionId?: string): Promise<O> {
    const response = await this.runFlow<I, O>(flowName, { input, sessionId });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.result;
  }
}

// FlowDefinition class to match Genkit's interface
class FlowDefinition<I, O> {
  constructor(private config: FlowConfig<I, O>) {}

  get name(): string {
    return this.config.name;
  }

  get inputSchema(): z.ZodSchema<I> | undefined {
    return this.config.inputSchema;
  }

  get outputSchema(): z.ZodSchema<O> | undefined {
    return this.config.outputSchema;
  }

  async run(input: I, context?: FlowContext): Promise<O> {
    return this.config.handler(input, context);
  }
}

// Global instance
export const flowEngine = new FlowEngine();

// Convenience function for flow definition
export function defineFlow<I, O>(config: FlowConfig<I, O>): FlowDefinition<I, O> {
  return flowEngine.defineFlow(config);
}