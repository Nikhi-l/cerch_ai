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
      'chat-model': openai('gpt-5'),
      'chat-model-reasoning': wrapLanguageModel({
        model: openai('o4-mini'),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      'title-model': openai('gpt-5'),
      'artifact-model': openai('gpt-5'),
    },
    imageModels: {
      'small-model': openai.image('gpt-image-1'),
    },
  });
}
