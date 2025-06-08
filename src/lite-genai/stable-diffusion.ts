/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { StableDiffusionConfig, ImageGenerationRequest } from './types';
import { Logger, retry } from './utils';

const logger = new Logger('StableDiffusionClient');

export class StableDiffusionClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: StableDiffusionConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout || 60000; // SD can be slow
    logger.log(`Stable Diffusion client initialized with base URL: ${this.baseUrl}`);
  }

  async generateImage(request: ImageGenerationRequest): Promise<string> {
    // TEMPORARILY SUSPENDED: Stable Diffusion image generation disabled
  logger.log('Stable Diffusion image generation temporarily suspended');
  return ''; // Return empty string instead of generating image
    // const {
    //   prompt,
    //   negativePrompt = '',
    //   width = 512,
    //   height = 512,
    //   steps = 20
    // } = request;

    // try {
    //   logger.log(`Generating image with prompt: ${prompt.substring(0, 100)}...`);
      
    //   const payload = {
    //     prompt,
    //     negative_prompt: negativePrompt,
    //     width,
    //     height,
    //     steps,
    //     cfg_scale: 7,
    //     sampler_name: 'DPM++ 2M Karras',
    //     seed: -1,
    //     batch_size: 1,
    //     n_iter: 1
    //   };

    //   const response = await retry(async () => {
    //     const controller = new AbortController();
    //     const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    //     try {
    //       const res = await fetch(`${this.baseUrl}/sdapi/v1/txt2img`, {
    //         method: 'POST',
    //         headers: {
    //           'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify(payload),
    //         signal: controller.signal
    //       });

    //       clearTimeout(timeoutId);

    //       if (!res.ok) {
    //         const errorText = await res.text();
    //         throw new Error(`Stable Diffusion API returned ${res.status}: ${errorText}`);
    //       }

    //       return res.json();
    //     } catch (error) {
    //       clearTimeout(timeoutId);
    //       throw error;
    //     }
    //   }, 2, 5000); // Retry twice with 5 second delays

    //   if (!response.images || response.images.length === 0) {
    //     throw new Error('No images returned from Stable Diffusion API');
    //   }

    //   logger.log('Image generated successfully');
    //   return response.images[0]; // Base64 encoded image
    // } catch (error) {
    //   logger.error('Stable Diffusion Error:', error);
    //   throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sdapi/v1/options`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      return response.ok;
    } catch (error) {
      logger.warn('Stable Diffusion health check failed:', error);
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sdapi/v1/sd-models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const models = await response.json();
      return models.map((model: any) => model.title || model.model_name);
    } catch (error) {
      logger.error('Failed to get models:', error);
      return [];
    }
  }
}

// Create a singleton instance with environment variables
let stableDiffusionClient: StableDiffusionClient | null = null;

export function getStableDiffusionClient(): StableDiffusionClient {
  if (!stableDiffusionClient) {
    const baseUrl = process.env['STABLE_DIFFUSION_URL'] || 'http://localhost:7860';
    const timeout = process.env['STABLE_DIFFUSION_TIMEOUT'] 
      ? parseInt(process.env['STABLE_DIFFUSION_TIMEOUT']) 
      : undefined;
    
    stableDiffusionClient = new StableDiffusionClient({
      baseUrl,
      timeout
    });
  }
  
  return stableDiffusionClient;
}