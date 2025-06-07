# MechaiKit Framework

MechaiKit is a lightweight alternative to Genkit that provides direct integration with OpenAI APIs and local Stable Diffusion servers while maintaining compatibility with existing Angular applications.

## 🎯 Overview

This project converts the genkit-angular-story-generator from using Google's Genkit framework to using a custom lightweight MechaiKit framework that:

- ✅ **Direct OpenAI Integration**: Uses OpenAI SDK directly instead of Genkit abstractions
- ✅ **Local Stable Diffusion**: Integrates with local Stable Diffusion servers (like AUTOMATIC1111)
- ✅ **Same Interface**: Maintains Genkit-compatible interfaces so Angular UI needs no changes
- ✅ **Lightweight**: Removes heavy Genkit dependencies and complex abstractions
- ✅ **TypeScript**: Full TypeScript support with proper type definitions

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required: Your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Stable Diffusion server URL (default: http://localhost:7860)
STABLE_DIFFUSION_URL=http://localhost:7860

# Optional: Model selection (default: gpt-3.5-turbo)
OPENAI_MODEL=gpt-3.5-turbo
```

### 3. Start the Application

```bash
npm start
```

### 4. Optional: Start Stable Diffusion

For image generation, run AUTOMATIC1111 Stable Diffusion WebUI:

```bash
# Install and start AUTOMATIC1111 on localhost:7860
# See: https://github.com/AUTOMATIC1111/stable-diffusion-webui
```

## 🏗️ Architecture

### Core Components

```
src/lite-genai/
├── types.ts              # TypeScript type definitions
├── utils.ts              # Utility functions (logging, retry, JSON parsing)
├── session-store.ts      # In-memory session management
├── openai-client.ts      # OpenAI API wrapper
├── stable-diffusion.ts   # Stable Diffusion HTTP client
├── flow-engine.ts        # Flow definition and execution
├── express-handler.ts    # Express middleware for flows
├── client.ts             # Client-side runFlow function
└── index.ts              # Main exports and factory functions
```

### Key Features

#### 1. OpenAI Client (`openai-client.ts`)

- **generateText()**: Chat completion with conversation history
- **generateCompletion()**: Simple text completion
- **generateStructuredOutput()**: JSON response with Zod validation
- **generateWithHistory()**: Conversation-aware responses

#### 2. Stable Diffusion Client (`stable-diffusion.ts`)

- **generateImage()**: Text-to-image generation
- HTTP client for AUTOMATIC1111 WebUI API
- Configurable parameters (size, steps, etc.)
- Base64 image response handling

#### 3. Flow Engine (`flow-engine.ts`)

- Genkit-compatible flow definitions
- Zod schema validation
- Express route handling
- Session management integration

#### 4. Session Store (`session-store.ts`)

- In-memory session storage
- Conversation history tracking
- Thread-safe operations
- Configurable session limits

## 🔄 Migration from Genkit

The MechaiKit framework maintains API compatibility with Genkit:

### Before (Genkit)

```typescript
import { flow } from "genkit";
import { generate } from "genkit/ai";

export const myFlow = flow(
  {
    name: "myFlow",
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.object({ response: z.string() }),
  },
  async (input) => {
    const result = await generate({
      model: "openai/gpt-3.5-turbo",
      prompt: input.prompt,
    });
    return { response: result.text };
  }
);
```

### After (MechaiKit)

```typescript
import { defineFlow, getOpenAIClient } from "./lite-genai";

export const myFlow = defineFlow(
  {
    name: "myFlow",
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.object({ response: z.string() }),
  },
  async (input) => {
    const client = getOpenAIClient();
    const response = await client.generateCompletion(input.prompt);
    return { response };
  }
);
```

## 📝 Available Flows

### 1. Description Flow (`descriptionFlow`)

- **Purpose**: Generate story descriptions and ask follow-up questions
- **Input**: `{ userInput: string, sessionId: string }`
- **Output**: `{ storyPremise: string, nextQuestion: string, premiseOptions: string[] }`

### 2. Begin Story Flow (`beginStoryFlow`)

- **Purpose**: Start a new story based on the established premise
- **Input**: `{ premise: string, sessionId: string }`
- **Output**: `{ story: string, userChoices: string[] }`

### 3. Continue Story Flow (`continueStoryFlow`)

- **Purpose**: Continue the story based on user choices
- **Input**: `{ userChoice: string, sessionId: string }`
- **Output**: `{ story: string, userChoices: string[] }`

### 4. Generate Image Flow (`genImgFlow`)

- **Purpose**: Generate images using Stable Diffusion
- **Input**: `{ altText: string }`
- **Output**: `{ imageUrl: string }`

## 🧪 Testing

Test the MechaiKit framework:

```bash
node test-mechaikit.mjs
```

This will verify:

- ✅ OpenAI API connection
- ✅ Stable Diffusion client initialization
- ✅ Environment configuration

## 🔧 Configuration

### Environment Variables

| Variable                   | Required | Default                     | Description             |
| -------------------------- | -------- | --------------------------- | ----------------------- |
| `OPENAI_API_KEY`           | Yes      | -                           | Your OpenAI API key     |
| `OPENAI_BASE_URL`          | No       | `https://api.openai.com/v1` | OpenAI API base URL     |
| `OPENAI_MODEL`             | No       | `gpt-3.5-turbo`             | Default model to use    |
| `OPENAI_TIMEOUT`           | No       | `30000`                     | Request timeout (ms)    |
| `STABLE_DIFFUSION_URL`     | No       | `http://localhost:7860`     | SD WebUI URL            |
| `STABLE_DIFFUSION_TIMEOUT` | No       | `60000`                     | SD request timeout (ms) |

### Model Support

#### OpenAI Models

- `gpt-3.5-turbo` (default)
- `gpt-4`
- `gpt-4-turbo`
- `gpt-4o`

#### Stable Diffusion

- Requires AUTOMATIC1111 WebUI
- Supports all SD models loaded in WebUI
- Configurable generation parameters

## 🚦 Error Handling

MechaiKit includes comprehensive error handling:

- **Retry Logic**: Automatic retry for transient failures
- **Timeout Handling**: Configurable timeouts for all API calls
- **Fallback Responses**: Graceful degradation when services unavailable
- **Detailed Logging**: Structured logging for debugging

## 🔒 Security Considerations

- **API Keys**: Store in environment variables, never commit to code
- **CORS**: Configure appropriate CORS settings for production
- **Rate Limiting**: Implement rate limiting for production deployments
- **Input Validation**: All inputs validated with Zod schemas

## 📊 Performance

### Improvements over Genkit

- **Faster Startup**: No heavy framework initialization
- **Lower Memory**: Reduced dependency footprint
- **Direct API Calls**: No abstraction layer overhead
- **Custom Optimizations**: Tailored for specific use cases

### Monitoring

- Built-in request logging
- Performance timing information
- Error tracking and reporting

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built as a lightweight alternative to Google's Genkit
- Inspired by the need for direct API integration
- Angular integration patterns from the original genkit-angular-story-generator

---

**MechaiKit** - _Lightweight AI Framework for Modern Applications_
