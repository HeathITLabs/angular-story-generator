/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from "zod";
import { 
  createLiteGenkit, 
  sessionStore as liteSessionStore, 
  getOpenAIClient, 
  getStableDiffusionClient,
  FlowContext 
} from './lite-genai';
import { beginStoryPrompt, createImgPrompt, continuePrompt, descriptionPrompt, preamblePrompt } from './prompts';
import { parsePartialJson } from './lite-genai/utils';

// Create lite-genai instance
const ai = createLiteGenkit();

// OpenAI model configuration
const DEFAULT_MODEL = process.env['OPENAI_MODEL'] || 'deepseek-r1-distill-llama-8b';

interface MyState {
  primaryObjective?: string;
  milestones?: string[];
  currentMilestone?: string;
}

const DescriptionOutput = z.object({
  storyPremise: z.string(),
  nextQuestion: z.string(),
  premiseOptions: z.array(z.string())
});

export const descriptionFlow = ai.defineFlow({
  name: 'descriptionFlow',
  inputSchema: z.object({
    userInput: z.optional(z.string()),
    sessionId: z.string(),
    clearSession: z.boolean()
  }),
  outputSchema: DescriptionOutput,
  handler: async (input: { userInput?: string; sessionId: string; clearSession: boolean }) => {
    const openaiClient = getOpenAIClient();
    const { userInput, sessionId, clearSession } = input;

    if (clearSession) {
      liteSessionStore.clearSession(sessionId);
      liteSessionStore.createSession(sessionId);
      liteSessionStore.setState(sessionId, 'initialized', true);
    } else if (!liteSessionStore.getSession(sessionId)) {
      liteSessionStore.createSession(sessionId);
    }    try {
      const messages = liteSessionStore.getMessages(sessionId);
      
      if (messages.length === 0) {
        liteSessionStore.addMessage(sessionId, {
          role: 'system',
          content: preamblePrompt,
          timestamp: new Date()
        });
      }

      console.log(`📝 Generating description with ${messages.length} previous messages`);
      const startTime = Date.now();
      
      const response = await openaiClient.generateWithHistory(
        liteSessionStore.getMessages(sessionId),
        descriptionPrompt(userInput || ''),
        undefined,
        DEFAULT_MODEL
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Description generated in ${duration}ms`);

      liteSessionStore.addMessage(sessionId, {
        role: 'user',
        content: descriptionPrompt(userInput || ''),
        timestamp: new Date()
      });
      
      liteSessionStore.addMessage(sessionId, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      return parsePartialJson(maybeStripMarkdown(response));
    } catch (error) {
      console.error('Description flow error:', error);
      
      // Provide a helpful fallback response based on user input
      const isTimeoutError = error instanceof Error && 
        (error.message.includes('timeout') || error.message.includes('TIMEOUT'));
      
      if (isTimeoutError) {
        console.error('API timeout detected. Check your OpenAI endpoint configuration.');
      }
      
      return {
        storyPremise: userInput ? `A story about ${userInput}` : 'A magical adventure story',
        nextQuestion: 'What type of story would you like to create?',
        premiseOptions: ['Fantasy Adventure', 'Sci-Fi Quest', 'Mystery Investigation', 'Epic Journey', 'Magical Quest']
      };
    }
  }
});

const StoryDetail = z.object({
  story: z.optional(z.string()),
  storyParts: z.array(z.string()),
  primaryObjective: z.string(),
  milestones: z.array(z.string()),
  progress: z.number(),
  choices: z.array(z.object({
    choice: z.string(),
    rating: z.string()
  }))
});

const StoryOutput = z.object({
  storyParts: z.array(z.string()),
  options: z.array(z.string()),
  primaryObjective: z.string(),
  progress: z.number()
});

interface BeginStoryFlowInput {
  userInput: string;
  sessionId: string;
}

interface StoryChoice {
  choice: string;
  rating: string;
}

interface StoryDetailType {
  story?: string;
  storyParts: string[];
  primaryObjective: string;
  milestones: string[];
  progress: number;
  choices: StoryChoice[];
}

interface BeginStoryFlowOutput {
  storyParts: string[];
  options: string[];
  progress: number;
  primaryObjective: string;
}

export const beginStoryFlow = ai.defineFlow({
  name: 'beginStoryFlow',
  inputSchema: z.object({
    userInput: z.string(),
    sessionId: z.string(),
  }),
  outputSchema: StoryOutput,
  handler: async (
    input: BeginStoryFlowInput
  ): Promise<BeginStoryFlowOutput> => {
    const openaiClient = getOpenAIClient();
    const { userInput, sessionId } = input;
    
    let storyParts: string[] = [];
    let options: string[] = [];
    let primaryObjective = '';
    
    try {      if (!liteSessionStore.getSession(sessionId)) {
        liteSessionStore.createSession(sessionId);
      }

      console.log(`📖 Generating story beginning`);
      const startTime = Date.now();

      const response = await openaiClient.generateWithHistory(
        liteSessionStore.getMessages(sessionId),
        beginStoryPrompt(userInput),
        undefined,
        DEFAULT_MODEL
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Story beginning generated in ${duration}ms`);

      liteSessionStore.addMessage(sessionId, {
        role: 'user',
        content: beginStoryPrompt(userInput),
        timestamp: new Date()
      });
      
      liteSessionStore.addMessage(sessionId, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      const storyDetail = parsePartialJson(maybeStripMarkdown(response)) as StoryDetailType;
      storyParts = storyDetail.storyParts || [];
      primaryObjective = storyDetail.primaryObjective || '';
      
      liteSessionStore.setState(sessionId, 'primaryObjective', primaryObjective);
      liteSessionStore.setState(sessionId, 'milestones', storyDetail.milestones || []);
      liteSessionStore.setState(sessionId, 'currentMilestone', (storyDetail.milestones || [])[0]);
        options = (storyDetail.choices || []).map(choice => choice.choice);
    } catch (e) {
      console.log('Begin story flow error:', e);
      
      // Provide fallback story content
      const fallbackStory = [
        "In a mystical realm where magic flows through ancient forests, brave adventurers gather at the edge of a dark wood.",
        "Their quest: to find the legendary Crystal of Harmony that can restore balance to their troubled land.",
        "As they prepare to enter the forest, they notice strange shadows moving between the trees and must decide their first move."
      ];
      
      return {
        storyParts: fallbackStory,
        options: [
          "Proceed cautiously into the forest",
          "Set up camp and wait for dawn",
          "Call out to the shadows",
          "Look for an alternative path",
          "Cast a protective spell"
        ],
        progress: 0,
        primaryObjective: "Find the Crystal of Harmony and restore balance to the land"
      };
    }
    
    return { storyParts, options, progress: 0, primaryObjective };
  }
});

const ContStoryDetail = z.object({
  story: z.optional(z.string()),
  storyParts: z.array(z.string()),
  rating: z.string(),
  primaryObjective: z.string(),
  achievedCurrentMilestone: z.boolean(),
  progress: z.number(),
  choices: z.array(z.object({
    choice: z.string(),
    rating: z.string()
  })),
});

export const continueStoryFlow = ai.defineFlow({
  name: 'continueStoryFlow',
  inputSchema: z.object({
    userInput: z.string(),
    sessionId: z.string()
  }),
  outputSchema: StoryOutput.extend({ rating: z.string() }),
  handler: async (input: { userInput: string; sessionId: string }, context?: FlowContext) => {
    const openaiClient = getOpenAIClient();
    const { userInput, sessionId } = input;

    let storyParts: string[] = [];
    let options: string[] = [];
    let rating: string = 'NEUTRAL';
    let primaryObjective = liteSessionStore.getState(sessionId, 'primaryObjective') || '';
    let progress = -1;    try {
      const currentMilestone = liteSessionStore.getState(sessionId, 'currentMilestone');
      
      console.log(`📖 Continuing story with choice: "${userInput}"`);
      const startTime = Date.now();
      
      const response = await openaiClient.generateWithHistory(
        liteSessionStore.getMessages(sessionId),
        continuePrompt(userInput, currentMilestone),
        undefined,
        DEFAULT_MODEL
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Story continuation generated in ${duration}ms`);

      liteSessionStore.addMessage(sessionId, {
        role: 'user',
        content: continuePrompt(userInput, currentMilestone),
        timestamp: new Date()
      });
      
      liteSessionStore.addMessage(sessionId, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      const storyDetail = parsePartialJson(maybeStripMarkdown(response)) as z.infer<typeof ContStoryDetail>;
      storyParts = storyDetail.storyParts || [];
      options = (storyDetail.choices || []).map(choice => choice.choice);
      rating = storyDetail.rating || 'NEUTRAL';
      const achievedMilestone = storyDetail.achievedCurrentMilestone || false;
      
      const progressResponse = await handleProgress(storyParts, achievedMilestone, sessionId);
      storyParts = progressResponse.storyParts;      progress = progressResponse.progress;
      primaryObjective = liteSessionStore.getState(sessionId, 'primaryObjective') || '';
    } catch (e) {
      console.log('Continue story flow error:', e);
      
      // Provide fallback continuation
      const fallbackStoryParts = [
        "The adventurers carefully consider their options and make their choice.",
        "As they move forward, new challenges and opportunities present themselves.",
        "Their journey continues as they work toward their ultimate goal."
      ];
      
      return {
        storyParts: fallbackStoryParts,
        options: [
          "Continue forward",
          "Look for clues",
          "Rest and recover",
          "Try a different approach",
          "Work together as a team"
        ],
        primaryObjective: primaryObjective || "Complete the quest",
        progress: progress >= 0 ? progress : 0,
        rating: 'NEUTRAL'
      };
    }
    
    return { storyParts, options, primaryObjective, progress, rating };
  }
});

async function handleProgress(
  storyParts: string[],
  achievedMilestone: boolean,
  sessionId: string
): Promise<{ storyParts: string[], progress: number }> {
  const currentMilestone = liteSessionStore.getState(sessionId, 'currentMilestone');
  const milestones = liteSessionStore.getState(sessionId, 'milestones') || [];
  const finalMilestone = milestones[milestones.length - 1];
  let progress = milestones.indexOf(currentMilestone) / milestones.length;
  
  if (achievedMilestone && currentMilestone === finalMilestone) {
    progress = 1;
    const storyEnding = await endStory(sessionId);
    storyParts = [...storyParts, ...storyEnding];
  } else if (achievedMilestone) {
    const nextMilestoneIndex = milestones.indexOf(currentMilestone) + 1;
    const nextMilestone = milestones[nextMilestoneIndex];
    progress = nextMilestoneIndex / milestones.length;
    liteSessionStore.setState(sessionId, 'currentMilestone', nextMilestone);
  }
  
  return { storyParts, progress };
}

async function endStory(sessionId: string): Promise<string[]> {
  const openaiClient = getOpenAIClient();
  
  try {
    const response = await openaiClient.generateWithHistory(
      liteSessionStore.getMessages(sessionId),
      `The characters have achieved their primary objective.
       Write the conclusion of the story. Don't repeat any
       of the story. This next part should be a max of 200 words.
       Split the story into 3 parts of similar length. Return an 
       array of strings with the story parts.`,
      undefined,
      DEFAULT_MODEL
    );
    
    return parsePartialJson(maybeStripMarkdown(response)) as string[];
  } catch {
    return [];
  }
}

export const genImgFlow = ai.defineFlow({
  name: 'genImgFlow',
  inputSchema: z.object({
    story: z.string(),
    sessionId: z.string()
  }),
  outputSchema: z.string(),
  handler: async (input: { story: string; sessionId: string }, context?: FlowContext) => {
    return await genImgBlob(input.story, input.sessionId);
  }
});

async function genImgBlob(story: string, sessionId: string): Promise<string> {
  const openaiClient = getOpenAIClient();
  const sdClient = getStableDiffusionClient();
  
  try {
    // Generate image description using OpenAI
    const storyImgDescr = await openaiClient.generateWithHistory(
      liteSessionStore.getMessages(sessionId),
      `Describe an image that captures the essence of this story: ${story}.
       Do not use any words indicating violence or profanity. Return a string only.
       Do not return JSON.`,
      undefined,
      DEFAULT_MODEL
    );
    
    // Create image prompt and generate with Stable Diffusion
    const imgPrompt = createImgPrompt(storyImgDescr);
    const base64Image = await sdClient.generateImage({
      prompt: imgPrompt,
      width: 512,
      height: 512,
      steps: 20
    });
    
    return `data:image/png;base64,${base64Image}`;
  } catch (e) {
    console.log('Image generation error:', e);
    return '';
  }
}

const markdownRegex = /^\s*(```json)?((.|\n)*?)(```)?\s*$/i;
function maybeStripMarkdown(withMarkdown: string) {
  let cleaned = withMarkdown;
  
  // Remove <think> tags and similar reasoning content
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // Remove markdown code blocks
  const mdMatch = markdownRegex.exec(cleaned);
  if (mdMatch) {
    cleaned = mdMatch[2];
  }
  
  return cleaned.trim();
}
