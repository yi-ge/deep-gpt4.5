export interface Message {
  id: string | number
  message: string
  status: 'local' | 'success' | 'loading' | 'error' | 'streaming'
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