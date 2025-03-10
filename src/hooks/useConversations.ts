import { useState, useEffect } from 'react'
import { Conversation, STORAGE_KEY, defaultConversationsItems } from '../types/conversation'

export const useConversations = () => {
  const [conversationsItems, setConversationsItems] = useState<Conversation[]>(() => {
    const savedConversations = localStorage.getItem(STORAGE_KEY)
    const conversations = savedConversations ? JSON.parse(savedConversations) : defaultConversationsItems
    return conversations.sort((a: Conversation, b: Conversation) => Number(b.key) - Number(a.key))
  })

  const [activeKey, setActiveKey] = useState(conversationsItems[0].key)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationsItems))
  }, [conversationsItems])

  const addConversation = () => {
    const newKey = `${Date.now()}`
    const newConversation: Conversation = {
      key: newKey,
      label: `新会话 ${conversationsItems.length}`,
      messages: [],
    }
    setConversationsItems(prev => [newConversation, ...prev])
    setActiveKey(newKey)
  }

  const updateConversationMessages = (key: string, messages: Conversation['messages']) => {
    setConversationsItems(prev =>
      prev.map(item =>
        item.key === key
          ? { ...item, messages }
          : item
      )
    )
  }

  return {
    conversationsItems,
    activeKey,
    setActiveKey,
    addConversation,
    updateConversationMessages,
  }
} 