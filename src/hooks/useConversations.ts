import { useState, useEffect } from 'react'
import { Conversation, STORAGE_KEY, defaultConversationsItems } from '../types/conversation'

// 处理时间戳的序列化和反序列化
const serializeConversations = (conversations: Conversation[]): string => {
  return JSON.stringify(conversations)
}

interface MessageWithTimestamp {
  id: string | number
  message: string
  status: string
  timestamp?: Date | string
  [key: string]: any
}

const deserializeConversations = (json: string): Conversation[] => {
  try {
    const conversations = JSON.parse(json)
    return conversations.map((conv: Conversation) => {
      // 处理每条消息中的时间戳
      const messages = conv.messages.map((msg: MessageWithTimestamp) => {
        // 如果有timestamp且是字符串，尝试转换为Date对象
        if (msg.timestamp && typeof msg.timestamp === 'string') {
          try {
            msg.timestamp = new Date(msg.timestamp)
          } catch (e) {
            console.error('无法解析时间戳', e)
            delete msg.timestamp // 如果无法解析，删除时间戳
          }
        }
        return msg
      })

      return {
        ...conv,
        messages
      }
    })
  } catch (e) {
    console.error('解析会话数据失败', e)
    return defaultConversationsItems
  }
}

export const useConversations = () => {
  const [conversationsItems, setConversationsItems] = useState<Conversation[]>(() => {
    const savedConversations = localStorage.getItem(STORAGE_KEY)
    const conversations = savedConversations
      ? deserializeConversations(savedConversations)
      : defaultConversationsItems
    return conversations.sort((a: Conversation, b: Conversation) => Number(b.key) - Number(a.key))
  })

  const [activeKey, setActiveKey] = useState(conversationsItems[0].key)

  // 添加对 activeKey 的监听，确保它始终指向一个有效的会话
  useEffect(() => {
    // 检查当前 activeKey 是否有效
    const isValidKey = conversationsItems.some(item => item.key === activeKey)
    if (!isValidKey && conversationsItems.length > 0) {
      // 如果 activeKey 无效，切换到第一个会话
      setActiveKey(conversationsItems[0].key)
    }
  }, [conversationsItems, activeKey])

  useEffect(() => {
    // 保存时序列化
    localStorage.setItem(STORAGE_KEY, serializeConversations(conversationsItems))
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

  // 添加删除单条消息的功能
  const deleteMessage = (conversationKey: string, messageId: string | number) => {
    // 找到当前会话
    const currentConversation = conversationsItems.find(item => item.key === conversationKey)
    if (!currentConversation) return

    // 过滤掉要删除的消息
    const filteredMessages = currentConversation.messages.filter(msg => msg.id !== messageId)

    // 更新会话的消息列表
    updateConversationMessages(conversationKey, filteredMessages)
  }

  const updateConversationTitle = (key: string, title: string) => {
    setConversationsItems(prev =>
      prev.map(item =>
        item.key === key
          ? { ...item, label: title }
          : item
      )
    )
  }

  const deleteConversation = (key: string) => {
    // 过滤掉要删除的会话
    const filteredConversations = conversationsItems.filter(item => item.key !== key)

    // 如果没有会话了，创建一个新的默认会话
    if (filteredConversations.length === 0) {
      const newKey = `${Date.now()}`
      const newConversation: Conversation = {
        key: newKey,
        label: '新会话',
        messages: [],
      }
      setConversationsItems([newConversation])
      setActiveKey(newKey)
    } else {
      // 更新会话列表
      setConversationsItems(filteredConversations)
      // 如果删除的是当前活动的会话，切换到列表中的第一个会话
      if (key === activeKey) {
        setActiveKey(filteredConversations[0].key)
      }
    }
  }

  // 添加删除所有会话的功能
  const deleteAllConversations = () => {
    // 创建一个新的默认会话
    const newKey = `${Date.now()}`
    const newConversation: Conversation = {
      key: newKey,
      label: '新会话',
      messages: [],
    }

    // 重置会话列表，只保留新创建的默认会话
    setConversationsItems([newConversation])
    setActiveKey(newKey)
  }

  return {
    conversationsItems,
    activeKey,
    setActiveKey,
    addConversation,
    updateConversationMessages,
    updateConversationTitle,
    deleteConversation,
    deleteAllConversations,
    deleteMessage,
  }
} 