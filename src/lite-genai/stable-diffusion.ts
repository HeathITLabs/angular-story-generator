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
    const {
      prompt,
      negativePrompt = '',
      width = 512,
      height = 512,
      steps = 20
    } = request;

    try {
      logger.log(`Generating image with ComfyUI using prompt: ${prompt.substring(0, 100)}...`);
      
      // Basic ComfyUI workflow for text-to-image
      const workflow = {
        "3": {
          "inputs": {
            "seed": Math.floor(Math.random() * 1000000),
            "steps": steps,
            "cfg": 7,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
          },
          "class_type": "KSampler"
        },
        "4": {
          "inputs": {
            "ckpt_name": "sd_xl_base_1.0.safetensors"
          },
          "class_type": "CheckpointLoaderSimple"
        },
        "5": {
          "inputs": {
            "width": width,
            "height": height,
            "batch_size": 1
          },
          "class_type": "EmptyLatentImage"
        },
        "6": {
          "inputs": {
            "text": prompt,
            "clip": ["4", 1]
          },
          "class_type": "CLIPTextEncode"
        },
        "7": {
          "inputs": {
            "text": negativePrompt,
            "clip": ["4", 1]
          },
          "class_type": "CLIPTextEncode"
        },
        "8": {
          "inputs": {
            "samples": ["3", 0],
            "vae": ["4", 2]
          },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": {
            "filename_prefix": "ComfyUI",
            "images": ["8", 0]
          },
          "class_type": "SaveImage"
        }
      };

      // Submit the workflow to ComfyUI
      const promptResponse = await fetch(`${this.baseUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: workflow,
          client_id: 'genkit-story-generator'
        })
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        throw new Error(`ComfyUI prompt submission failed: ${promptResponse.status} - ${errorText}`);
      }

      const promptResult = await promptResponse.json();
      const promptId = promptResult.prompt_id;
      
      logger.log(`ComfyUI job submitted with ID: ${promptId}`);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        // Check queue status
        const queueResponse = await fetch(`${this.baseUrl}/queue`);
        const queueData = await queueResponse.json();
        
        // Check if our job is still in queue
        const isInQueue = queueData.queue_running.some((job: any) => job[1] === promptId) ||
                         queueData.queue_pending.some((job: any) => job[1] === promptId);
        
        if (!isInQueue) {
          // Job is complete, get the history
          const historyResponse = await fetch(`${this.baseUrl}/history/${promptId}`);
          const historyData = await historyResponse.json();
          
          if (historyData[promptId]) {
            const outputs = historyData[promptId].outputs;
            
            // Find the SaveImage node output
            for (const nodeId in outputs) {
              const nodeOutput = outputs[nodeId];
              if (nodeOutput.images && nodeOutput.images.length > 0) {
                const imageInfo = nodeOutput.images[0];
                const imageUrl = `${this.baseUrl}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder}&type=${imageInfo.type}`;
                
                // Fetch the image and convert to base64
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                const base64Image = Buffer.from(imageBuffer).toString('base64');
                
                logger.log('Image generated successfully with ComfyUI');
                return base64Image;
              }
            }
          }
          
          throw new Error('No images found in ComfyUI output');
        }
        
        attempts++;
        logger.log(`Waiting for ComfyUI job completion... (${attempts}/${maxAttempts})`);
      }
      
      throw new Error('ComfyUI job timed out');
      
    } catch (error) {
      logger.error('ComfyUI Error:', error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      // Check ComfyUI queue endpoint instead of sdapi
      const response = await fetch(`${this.baseUrl}/queue`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      return response.ok;
    } catch (error) {
      logger.warn('ComfyUI health check failed:', error);
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      // ComfyUI doesn't have a direct models endpoint like SD WebUI
      // We'll check for checkpoints in the object_info endpoint
      const response = await fetch(`${this.baseUrl}/object_info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ComfyUI object info: ${response.status}`);
      }

      const objectInfo = await response.json();
      
      // Look for CheckpointLoaderSimple node to get available models
      if (objectInfo.CheckpointLoaderSimple && objectInfo.CheckpointLoaderSimple.input) {
        const checkpoints = objectInfo.CheckpointLoaderSimple.input.required.ckpt_name;
        if (Array.isArray(checkpoints) && checkpoints.length > 0) {
          return checkpoints[0]; // First element contains the array of checkpoint names
        }
      }
      
      return ['sd_xl_base_1.0.safetensors']; // Default fallback
    } catch (error) {
      logger.error('Failed to get ComfyUI models:', error);
      return ['sd_xl_base_1.0.safetensors']; // Default fallback
    }
  }
}

// Create a singleton instance with environment variables
let stableDiffusionClient: StableDiffusionClient | null = null;

export function getStableDiffusionClient(): StableDiffusionClient {
  if (!stableDiffusionClient) {
    const baseUrl = process.env['STABLE_DIFFUSION_URL'] || 'http://localhost:8188';
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