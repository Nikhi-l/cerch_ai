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
  const modelConfig = { temperature: 0.1 } as const;

  return customProvider({
    languageModels: {
      // Primary chat model
      'chat-model': openai('gpt-5', modelConfig),
      // Reasoning variant with thinking trace extraction
      'chat-model-reasoning': wrapLanguageModel({
        model: openai('gpt-5-reasoning', modelConfig),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      // Title generation model
      'title-model': openai('gpt-5', modelConfig),
      // Artifact generation (text/code/sheet/webset)
      'artifact-model': openai('gpt-5', modelConfig),
    },
    imageModels: {
      'small-model': openai.image('gpt-image-1'),
    },
  });
}
