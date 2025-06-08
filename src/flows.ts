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
const DEFAULT_MODEL = 'deepseek-r1-distill-llama-8b';

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
    }

    try {
      const messages = liteSessionStore.getMessages(sessionId);
      
      if (messages.length === 0) {
        liteSessionStore.addMessage(sessionId, {
          role: 'system',
          content: preamblePrompt,
          timestamp: new Date()
        });
      }      const response = await openaiClient.generateWithHistory(
        liteSessionStore.getMessages(sessionId),
        descriptionPrompt(userInput || ''),
        undefined,
        DEFAULT_MODEL,
        2048 // Increased token limit for description flow
      );

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
      return {
        storyPremise: '',
        nextQuestion: 'Tell me more about the story',
        premiseOptions: []
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
    
    try {
      if (!liteSessionStore.getSession(sessionId)) {
        liteSessionStore.createSession(sessionId);
      }      const response = await openaiClient.generateWithHistory(
        liteSessionStore.getMessages(sessionId),
        beginStoryPrompt(userInput),
        undefined,
        DEFAULT_MODEL,
        2500 // Higher token limit for story generation
      );

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
      console.log(e);
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
    let progress = -1;

    try {
      const currentMilestone = liteSessionStore.getState(sessionId, 'currentMilestone');
        const response = await openaiClient.generateWithHistory(
        liteSessionStore.getMessages(sessionId),
        continuePrompt(userInput, currentMilestone),
        undefined,
        DEFAULT_MODEL,
        2500 // Higher token limit for story continuation
      );

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
      storyParts = progressResponse.storyParts;
      progress = progressResponse.progress;
      primaryObjective = liteSessionStore.getState(sessionId, 'primaryObjective') || '';
    } catch (e) {
      console.log(e);
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
  
  try {    const response = await openaiClient.generateWithHistory(
      liteSessionStore.getMessages(sessionId),
      `The characters have achieved their primary objective.
       Write the conclusion of the story. Don't repeat any
       of the story. This next part should be a max of 200 words.
       Split the story into 3 parts of similar length. Return an 
       array of strings with the story parts.`,
      undefined,
      DEFAULT_MODEL,
      1000 // Moderate token limit for conclusion
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
  
  try {    // Generate image description using OpenAI
    const storyImgDescr = await openaiClient.generateWithHistory(
      liteSessionStore.getMessages(sessionId),
      `Describe an image that captures the essence of this story: ${story}.
       Do not use any words indicating violence or profanity. Return a string only.
       Do not return JSON.`,
      undefined,
      DEFAULT_MODEL,
      500 // Small token limit for image description
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
  const mdMatch = markdownRegex.exec(withMarkdown);
  if (!mdMatch) {
    return withMarkdown;
  }
  return mdMatch[2];
}
