import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

export function getProvider(apiKey?: string) {
  if (isTestEnvironment) {
    return customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    });
  }

  const key = apiKey || process.env.OPENAI_API_KEY;
  const openai = createOpenAI({ apiKey: key });

  return customProvider({
    languageModels: {
      // Primary chat model - GPT-4o (most capable, fastest)
      'chat-model': openai('gpt-4o'),
      // Reasoning variant with thinking trace extraction
      'chat-model-reasoning': wrapLanguageModel({
        model: openai('gpt-4o'),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      // Title generation model - faster model for simple tasks
      'title-model': openai('gpt-4o-mini'),
      // Artifact generation (text/code/sheet/webset)
      'artifact-model': openai('gpt-4o'),
    },
    imageModels: {
      'small-model': openai.image('dall-e-3'),
    },
  });
}
