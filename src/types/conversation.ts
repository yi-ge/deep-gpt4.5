export interface Message {
  id: string | number
  message: string
  status: 'local' | 'success' | 'loading' | 'error' | 'streaming'
  deepseekR1Message?: string
  gpt45Message?: string
  deepseekR1Status?: 'success' | 'loading' | 'error' | 'streaming'
  gpt45Status?: 'success' | 'loading' | 'error' | 'streaming'
  thinking?: string
  thinkingStatus?: 'success' | 'loading' | 'error' | 'streaming'
  activeModel?: 'deepseek-r1' | 'gpt4.5' | 'split'
  thinkingVisible?: boolean
}

export interface Conversation {
  key: string
  label: string
  messages: Message[]
}

export const STORAGE_KEY = 'deepgpt_conversations'

export const defaultConversationsItems: Conversation[] = [
  {
    key: '0',
    label: '新的会话',
    messages: [],
  },
] 