export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'GPT-5',
    description: 'Primary model for all-purpose chat and tools',
  },
  {
    id: 'chat-model-reasoning',
    name: 'GPT-5 Reasoning',
    description: 'Advanced reasoning with tool calling',
  },
];
