/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Request, Response, Router, RequestHandler } from 'express';
import { flowEngine } from './flow-engine';
import { FlowRequest } from './types';
import { Logger } from './utils';

const logger = new Logger('ExpressHandler');

export function createFlowRouter(): Router {
  const router = Router();
  // Generic flow handler
  router.post('/:flowName', async (req: Request, res: Response) => {
    const flowName = req.params['flowName'];
    const requestBody = req.body as FlowRequest;

    try {
      logger.log(`Handling request for flow: ${flowName}`);
      const result = await flowEngine.runFlow(flowName, requestBody);
      res.json(result);
    } catch (error) {
      logger.error(`Flow '${flowName}' error:`, error);
      res.status(500).json({
        result: null,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      flows: flowEngine.listFlows(),
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

// Express handler function compatible with Genkit's expressHandler
export function expressHandler(flowDefinition: any): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const flowName = flowDefinition.name;
      logger.log(`Handling request for flow: ${flowName}`);
      
      const requestBody: FlowRequest = {
        input: req.body,
        sessionId: req.body.sessionId
      };

      const result = await flowEngine.runFlow(flowName, requestBody);
      
      if (result.error) {
        res.status(400).json(result);
      } else {
        res.json(result.result);
      }
    } catch (error) {
      logger.error('Express handler error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}

// Alternative handler that returns the full response object
export function expressHandlerWithMeta(flowDefinition: any): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const flowName = flowDefinition.name;
      logger.log(`Handling request for flow: ${flowName}`);
      
      const requestBody: FlowRequest = {
        input: req.body,
        sessionId: req.body.sessionId
      };

      const result = await flowEngine.runFlow(flowName, requestBody);
      res.json(result);
    } catch (error) {
      logger.error('Express handler error:', error);
      res.status(500).json({
        result: null,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}