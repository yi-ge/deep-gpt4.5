import { Bubble, Conversations, Sender, useXAgent } from '@ant-design/x'
import type { BubbleProps, ConversationsProps } from '@ant-design/x'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { messageStyles } from './styles/layout'
import './App.css'

import {
  PlusOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  ClearOutlined,
  GithubOutlined,
  CopyOutlined,
  SyncOutlined,
  EditOutlined,
} from '@ant-design/icons'
import {
  Button,
  message,
  Typography,
  Popconfirm,
  Tooltip,
  Modal,
  Input,
  Space,
} from 'antd'
import markdownit from 'markdown-it'

import { useStyle } from './styles/layout'
import Logo from './components/Logo'
import { useConversations } from './hooks/useConversations'
import { Message } from './types/conversation'

// 初始化markdown-it
const md = markdownit({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
})

// 定义Bubble.List需要的类型
interface BubbleItem {
  key: string | number
  loading: boolean
  role: string
  content: string
  footer?: React.ReactNode // 添加footer属性支持
  header?: React.ReactNode // 添加header属性支持
  typing?: { step: number; interval: number }
  // 添加模型数据字段，以便创建不同的UI
  data?: {
    deepseekR1Message?: string
    gpt45Message?: string
    deepseekR1Status?: string
    gpt45Status?: string
    thinking?: string
    thinkingStatus?: string
    activeModel?: 'deepseek-r1' | 'gpt4.5' | 'split'
    thinkingVisible?: boolean
  }
  style?: React.CSSProperties
}

interface RoleConfig {
  placement: 'start' | 'end'
  typing?: { step: number; interval: number }
  styles?: { content: { borderRadius: number } }
  variant?: string
  messageRender?: BubbleProps['messageRender']
}

// 创建Markdown渲染函数
const renderMarkdown: BubbleProps['messageRender'] = (content) => (
  <Typography>
    {/* dangerouslySetInnerHTML是React的特性，用于渲染HTML内容 */}
    <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
  </Typography>
)

// 定义深层类型，以修复类型错误
type RolesType = Record<string, RoleConfig>

const roles: RolesType = {
  ai: {
    placement: 'start',
    // 移除默认的typing配置，将由消息内容动态决定是否需要typing效果
    styles: {
      content: {
        borderRadius: 0,
      },
    },
    variant: 'plain',
    messageRender: renderMarkdown,
  },
  streaming: {
    placement: 'start',
    typing: { step: 8, interval: 15 }, // 加快打字机效果的速度
    styles: {
      content: {
        borderRadius: 0,
      },
    },
    variant: 'plain',
    messageRender: renderMarkdown,
  },
  thinking: {
    placement: 'start',
    variant: 'plain',
    messageRender: renderMarkdown,
  },
  local: {
    placement: 'end',
    variant: 'filled',
    styles: {
      content: {
        borderRadius: 16,
      },
    },
    messageRender: (content) => (
      <Typography style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content}
      </Typography>
    ),
  },
}

// 扩展Message类型，添加时间戳
interface MessageWithTimestamp extends Message {
  timestamp?: Date
  thinkingTime?: number // 添加思考用时字段
}

// 添加用于分栏显示的自定义渲染函数
const renderSplitView = (r1Content: string, gpt45Content: string, r1Status?: string, gpt45Status?: string): string => {
  const r1IsLoading = r1Status === 'loading';
  const r1IsStreaming = r1Status === 'streaming';
  const gpt45IsLoading = gpt45Status === 'loading';
  const gpt45IsStreaming = gpt45Status === 'streaming';
  
  return `
<div class="split-view-container">
  <div class="split-view-column">
    <div class="split-view-header" style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #1890ff; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">DeepSeek R1 ${r1IsLoading ? '<span style="color: #faad14; margin-left: 5px;">(加载中...)</span>' : r1IsStreaming ? '<span style="color: #52c41a; margin-left: 5px;">(生成中...)</span>' : ''}</div>
    <div class="split-view-content deepseek-content" style="overflow-wrap: break-word; word-break: break-word;">
      <div class="markdown-safe-container">${r1IsLoading && !r1Content ? '<div style="color: #888;">正在加载回复...</div>' : md.render(r1Content || '')}</div>
    </div>
  </div>
  <div class="split-view-column">
    <div class="split-view-header" style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #1890ff; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">GPT-4.5 ${gpt45IsLoading ? '<span style="color: #faad14; margin-left: 5px;">(加载中...)</span>' : gpt45IsStreaming ? '<span style="color: #52c41a; margin-left: 5px;">(生成中...)</span>' : ''}</div>
    <div class="split-view-content gpt45-content" style="overflow-wrap: break-word; word-break: break-word;">
      <div class="markdown-safe-container">${gpt45IsLoading && !gpt45Content ? '<div style="color: #888;">正在加载回复...</div>' : md.render(gpt45Content || '')}</div>
    </div>
  </div>
</div>`.trim();
};

const Independent: React.FC = () => {
  const { styles } = useStyle()

  const [content, setContent] = React.useState('')

  // 添加模型参数状态
  const [modelParams] = React.useState({
    model: 'gpt-4.5-preview',
    temperature: 0.7,
    max_tokens: 2048,
  })

  const [activeModelPreference, setActiveModelPreference] = useState<'deepseek-r1' | 'gpt4.5' | 'split'>('gpt4.5');

  // 添加自定义CSS样式到document中
  useEffect(() => {
    // 从localStorage读取上次的模型偏好
    const savedModelPreference = localStorage.getItem('activeModelPreference');
    if (savedModelPreference) {
      setActiveModelPreference(savedModelPreference as 'deepseek-r1' | 'gpt4.5' | 'split');
    }

    // 创建style元素
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* 分栏视图的样式 */
      .split-view-container {
        display: flex;
        width: 100%;
        gap: 12px;
        margin-top: 10px;
        flex-wrap: nowrap;
      }
      
      .split-view-column {
        flex: 0 0 calc(50% - 6px);
        width: calc(50% - 6px);
        padding: 15px;
        border: 1px solid #eee;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        overflow: hidden;
      }
      
      .split-view-content {
        overflow-wrap: break-word;
        word-break: break-word;
      }
      
      .split-view-content img {
        max-width: 100%;
        height: auto;
      }
      
      .split-view-content pre {
        overflow-x: auto;
        max-width: 100%;
      }
      
      .split-view-content code {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      /* 确保表格正确显示 */
      .split-view-content table {
        max-width: 100%;
        display: block;
        overflow-x: auto;
      }
      
      /* 移动设备适配 */
      @media (max-width: 768px) {
        .split-view-column {
          flex: 0 0 calc(50% - 6px);
          width: calc(50% - 6px);
        }
      }
    `;
    
    // 添加到document
    document.head.appendChild(styleElement);
    
    // 清理函数
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const {
    conversationsItems,
    activeKey,
    setActiveKey,
    addConversation,
    updateConversationMessages,
    updateConversationTitle,
    deleteConversation,
    deleteAllConversations,
    deleteMessage,
  } = useConversations()

  // 将messages类型更新为包含时间戳
  const [messages, setMessages] = React.useState<MessageWithTimestamp[]>([])

  // 添加重命名相关状态
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false)
  const [renameConversationKey, setRenameConversationKey] = useState<string>('')
  const [newConversationName, setNewConversationName] = useState('')

  // 打开重命名模态框
  const showRenameModal = (key: string, currentName: string) => {
    setRenameConversationKey(key)
    setNewConversationName(currentName)
    setIsRenameModalVisible(true)
  }

  // 判断消息是否需要打字效果
  const shouldUseTypingEffect = (message: MessageWithTimestamp): { step: number; interval: number; } | undefined => {
    // 用户消息不需要打字效果
    if (message.status === 'local') {
      return undefined;
    }
    
    // 根据当前选择的模型类型决定是否使用打字效果
    if (message.activeModel === 'deepseek-r1') {
      return message.deepseekR1Status === 'streaming' ? { step: 5, interval: 20 } : undefined;
    } else if (message.activeModel === 'gpt4.5') {
      return message.gpt45Status === 'streaming' ? { step: 5, interval: 20 } : undefined;
    } else if (message.activeModel === 'split') {
      // 分栏模式下不使用打字效果，因为会分别在各自的区域显示
      return undefined;
    }
    
    // 默认情况
    return message.status === 'streaming' ? { step: 5, interval: 20 } : undefined;
  }

  // 处理重命名确认
  const handleRenameConfirm = () => {
    if (newConversationName.trim()) {
      updateConversationTitle(renameConversationKey, newConversationName.trim())
      message.success('会话已重命名')
      setIsRenameModalVisible(false)
    } else {
      message.error('会话名称不能为空')
    }
  }

  // 处理重命名取消
  const handleRenameCancel = () => {
    setIsRenameModalVisible(false)
  }

  // 生成标题的函数
  const generateTitle = async (
    messages: Array<{ role: string; content: string }>
  ) => {
    try {
      const response = await fetch('/v1/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      })

      if (!response.ok) {
        console.error('标题生成请求失败')
        return
      }

      const data = await response.json()
      if (data.title) {
        updateConversationTitle(activeKey, data.title)
      }
    } catch (error) {
      console.error('生成标题出错:', error)
    }
  }

  const [agent] = useXAgent<string>({
    request: async ({ message }, { onSuccess, onUpdate, onError }) => {
      try {
        const currentConversation = conversationsItems.find(
          (item) => item.key === activeKey
        )
        const messages = currentConversation?.messages || []

        // 准备聊天消息
        const chatMessages = [
          ...messages.map((msg) => ({
            role: msg.status === 'local' ? 'user' : 'assistant',
            content: msg.message,
          })),
          { role: 'user', content: message },
        ]

        const response = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: chatMessages,
            ...modelParams, // 传递模型参数
          }),
        })

        if (!response.ok) {
          throw new Error('API request failed')
        }

        // 初始化空结果并更新状态 - 这样会立即创建一个空的回复卡片
        let result = ''
        // 使用onUpdate而不是onSuccess，以支持流式更新
        onUpdate(result)

        // 使用fetch和ReadableStream处理
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No reader available')
        }

        const decoder = new TextDecoder('utf-8')

        // 递归读取流式响应
        const readChunk = async () => {
          try {
            const { value, done } = await reader.read()

            if (done) {
              console.log('流结束')
              // 最终结果使用onSuccess
              onSuccess(result)
              return
            }

            // 解码二进制数据为文本
            const dataString = decoder.decode(value, { stream: true })

            // 处理SSE格式数据 - 使用更可靠的分割方法
            // 先分割数据块，找到所有以data:开头的行
            dataString
              .toString()
              .trim()
              .split('data: ')
              .forEach((line) => {
                if (!line || line.trim() === '') return

                const text = line.trim()

                // 处理流结束标记
                if (text === '[DONE]') {
                  console.log('SSE流结束')
                  return
                }

                try {
                  // 解析JSON数据
                  const data = JSON.parse(text)

                  // 处理OpenAI格式响应
                  if (data.choices && data.choices[0]) {
                    const choice = data.choices[0]

                    // 处理提取delta内容并更新UI
                    if (choice.delta && choice.delta.content !== undefined) {
                      result += choice.delta.content
                      // 使用onUpdate实时更新UI
                      onUpdate(result)
                    }

                    // 处理思维链
                    if (choice.delta && choice.delta.reasoning_content) {
                      console.log('思维链:', choice.delta.reasoning_content)
                    }

                    // 处理结束原因
                    if (choice.finish_reason === 'length') {
                      console.log('达到最大长度限制，可能需要继续请求')
                      // 这里可以添加继续请求的逻辑
                    } else if (choice.finish_reason === 'stop') {
                      console.log('正常结束')
                      // 完成时调用onSuccess而不是onUpdate
                      onSuccess(result)
                    }
                  }
                  // 处理错误响应
                  else if (data.error) {
                    console.error('API错误响应:', data.error)
                    onError(new Error(data.error.message || 'API错误'))
                  }
                } catch (parseError) {
                  console.error('JSON解析错误:', parseError, '原始数据:', text)
                }
              })

            // 继续读取下一个数据块
            return readChunk()
          } catch (readError) {
            console.error('读取流错误:', readError)
            onError(readError as Error)
          }
        }

        // 开始读取流
        await readChunk()
      } catch (error) {
        console.error('Error:', error)
        onError(error as Error)
      }
    },
  })

  // 复制消息内容到剪贴板
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    message.success('已复制到剪贴板')
  }

  // 重新请求AI回复
  const handleResendMessage = (messageId: string | number) => {
    // 找到这条消息的前一条用户消息
    const messageIndex = messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex > 0) {
      const prevUserMessage = messages[messageIndex - 1]
      if (prevUserMessage.status === 'local') {
        // 先从本地状态中删除当前AI消息
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
        // 更新持久化存储
        deleteMessage(activeKey, messageId)

        // 添加新的AI回复占位符，带有时间戳
        const aiMsgId = `msg_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`
        const newAiMessage: MessageWithTimestamp = {
          id: aiMsgId,
          message: '正在思考并准备回复...', // 添加加载过程中的描述文本
          status: 'loading',
          timestamp: new Date(),
          // 使用用户的偏好设置作为新消息的默认活动模型
          activeModel: activeModelPreference,
          // 分别设置两个模型的加载状态
          deepseekR1Status: 'loading',
          gpt45Status: 'loading',
          deepseekR1Message: '',
          gpt45Message: '',
          thinking: '正在获取思维链...', // 添加思维链加载文本
          thinkingStatus: 'loading',
          thinkingVisible: true,
        }

        // 只添加AI消息占位符，不添加用户消息
        setMessages((prev) => [...prev, newAiMessage])

        // 准备当前会话的历史消息
        const currentMessages = messages
          .slice(0, messageIndex)
          .filter((msg) => msg.status !== 'loading')
          .map((msg) => ({
            role: msg.status === 'local' ? 'user' : 'assistant',
            content: msg.message,
          }))

        // 请求deepseek-r1和gpt4.5
        requestDeepseekR1(
          prevUserMessage.message,
          aiMsgId,
          currentMessages,
          false
        )
      }
    }
  }

  const onRequest = (nextContent: string) => {
    if (!nextContent) return

    // 添加用户消息，带有时间戳
    const userMsgId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`
    const newUserMessage: MessageWithTimestamp = {
      id: userMsgId,
      message: nextContent,
      status: 'local',
      timestamp: new Date(), // 添加当前时间
    }

    // 添加AI回复占位符，也带有时间戳
    const aiMsgId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`
      
    // 准备初始消息内容 - 对于split模式立即使用分栏视图
    let initialMessage = '正在思考并准备回复...'; 
    
    // 如果是分栏模式，使用分栏视图而不是加载文本
    if (activeModelPreference === 'split') {
      initialMessage = renderSplitView('', '', 'loading', 'loading');
    }
    
    const newAiMessage: MessageWithTimestamp = {
      id: aiMsgId,
      message: initialMessage, // 根据模式使用不同的初始内容
      status: 'loading',
      timestamp: new Date(),
      // 使用用户的偏好设置作为新消息的默认活动模型
      activeModel: activeModelPreference,
      // 分别设置两个模型的加载状态
      deepseekR1Status: 'loading',
      gpt45Status: 'loading',
      deepseekR1Message: '',
      gpt45Message: '',
      thinking: '正在获取思维链...', // 添加思维链加载文本
      thinkingStatus: 'loading',
      thinkingVisible: true,
    }

    // 更新消息列表
    setMessages((prev) => [...prev, newUserMessage, newAiMessage])

    // 准备聊天消息用于API请求和生成标题
    const currentMessages = messages.filter((msg) => msg.status !== 'loading')
    const chatMessages = [
      ...currentMessages.map((msg) => ({
        role: msg.status === 'local' ? 'user' : 'assistant',
        content: msg.message,
      })),
      { role: 'user', content: nextContent },
    ]

    // 如果这是新对话的第一个消息，准备稍后生成标题
    const isFirstMessage = currentMessages.length === 0

    // 第一步：请求deepseek-r1模型获取思维链
    requestDeepseekR1(nextContent, aiMsgId, chatMessages, isFirstMessage)

    // 清空输入框
    setContent('')
  }

  // 请求deepseek-r1模型的函数
  const requestDeepseekR1 = async (
    userMessage: string,
    aiMsgId: string,
    chatMessages: Array<{ role: string; content: string }>,
    isFirstMessage: boolean
  ) => {
    // 创建闭包保存状态，避免linter错误
    let gpt45Requested = false
    let thinkingComplete = false
    let continueR1Requested = false; // 标记是否已经发送R1继续请求

    // 请求GPT-4.5的函数封装，确保只调用一次
    const requestGPT45Once = (
      result: string,
      thinking: string,
      thinkingTime: number
    ) => {
      if (!gpt45Requested) {
        gpt45Requested = true
        console.log(
          `请求GPT-4.5，思维链长度约${thinking.length}字符，用时${thinkingTime}秒`
        )
        // 立即调用以避免延迟
        requestGPT45(
          userMessage,
          aiMsgId,
          chatMessages,
          isFirstMessage,
          result,
          thinking,
          thinkingTime
        )
      }
    }

    try {
      // 记录思考开始时间
      const thinkingStartTime = Date.now()

      // 发送DeepSeek R1请求的函数，支持初始请求和继续请求
      const sendDeepseekR1Request = async (continueFrom = '') => {
        // 如果是继续请求，需要修改消息结构
        const requestMessages = continueFrom 
          ? [...chatMessages, { 
              role: 'assistant', 
              content: continueFrom 
            }, { 
              role: 'user', 
              content: 'continue' 
            }] 
          : chatMessages;

        const response = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: requestMessages,
            model: 'deepseek-r1', // 指定使用deepseek-r1模型
            temperature: 0.7,
            max_tokens: 2048,
            reasoning: true, // 请求包含思维链(reasoning)
          }),
        })

        if (!response.ok) {
          throw new Error('Deepseek-R1 API请求失败')
        }

        return response;
      }

      // 初始化空结果
      let result = ''
      let thinking = ''

      // 处理DeepSeek R1响应的函数 - 支持初始和继续请求
      const processDeepseekR1Response = async (response: Response, initialResult = '', initialThinking = '') => {
        // 使用传入的初始值（用于继续请求时）
        result = initialResult;
        thinking = initialThinking;

        // 使用fetch和ReadableStream处理
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No reader available')
        }

        const decoder = new TextDecoder('utf-8')

        // 递归读取流式响应
        const readChunk = async () => {
          try {
            const { value, done } = await reader.read()

            if (done) {
              console.log('deepseek-r1流结束')
              // 计算思考总时间（秒）
              const thinkingTime = Math.round(
                (Date.now() - thinkingStartTime) / 1000
              )

              // 更新思维链状态
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? {
                        ...msg,
                        thinking: thinking,
                        thinkingStatus: 'success',
                        thinkingTime: thinkingTime,
                      }
                    : msg
                )
              )

              // 确保在流结束时GPT-4.5已被请求（如果之前未请求）
              if (!gpt45Requested) {
                console.log('流结束，尚未请求GPT-4.5，立即发起请求');
                const thinkingTime = Math.round(
                  (Date.now() - thinkingStartTime) / 1000
                )
                thinkingComplete = true;
                requestGPT45Once(result, thinking, thinkingTime)
              }
              return
            }

            // 解码二进制数据为文本
            const dataString = decoder.decode(value, { stream: true })

            // 处理SSE格式数据
            dataString
              .toString()
              .trim()
              .split('data: ')
              .forEach((line) => {
                if (!line || line.trim() === '') return

                const text = line.trim()

                // 处理流结束标记
                if (text === '[DONE]') {
                  console.log('deepseek-r1 SSE流结束')
                  return
                }

                try {
                  // 解析JSON数据
                  const data = JSON.parse(text)

                  // 处理OpenAI格式响应
                  if (data.choices && data.choices[0]) {
                    const choice = data.choices[0]
                    const hasReasoningContent =
                      choice.delta && choice.delta.reasoning_content !== null && choice.delta.reasoning_content !== undefined
                    const hasContent =
                      choice.delta && choice.delta.content !== undefined && choice.delta.content !== null

                    // 处理思维链
                    if (hasReasoningContent) {
                      thinking += choice.delta.reasoning_content
                      // 实时更新思维链
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === aiMsgId
                            ? {
                                ...msg,
                                thinking: thinking,
                                thinkingStatus: 'streaming',
                              }
                            : msg
                        )
                      )
                    } else if (hasContent) {
                      // 在这里处理思维链完成的情况
                      if (!thinkingComplete) {
                        console.log(
                          '检测到思维链已完成，开始请求GPT-4.5'
                        )
                        thinkingComplete = true
                        const thinkingTime = Math.round(
                          (Date.now() - thinkingStartTime) / 1000
                        )
                        // 立即请求GPT-4.5，不等待R1完成
                        requestGPT45Once(result, thinking, thinkingTime)
                      }

                      result += choice.delta.content
                      // 实时更新deepseek-r1的回复
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === aiMsgId
                            ? {
                                ...msg,
                                deepseekR1Message: result,
                                deepseekR1Status: 'streaming',
                                // 如果当前是split模式，更新主消息状态为streaming和更新消息内容
                                ...(msg.activeModel === 'split' ? {
                                  status: 'streaming',
                                  // 在split模式下，实时更新整个分栏视图
                                  message: renderSplitView(result, msg.gpt45Message || '', 'streaming', msg.gpt45Status || 'loading')
                                } : {})
                              }
                            : msg
                        )
                      )
                    }

                    // 如果接收到结束信号或达到长度限制，且有思维链内容，但还未请求GPT-4.5
                    if (
                      (choice.finish_reason === 'length' ||
                        choice.finish_reason === 'stop') &&
                      thinking.length > 0 &&
                      !gpt45Requested
                    ) {
                      console.log(
                        '思维链完成(收到finish信号)，开始请求GPT-4.5'
                      )
                      const thinkingTime = Math.round(
                        (Date.now() - thinkingStartTime) / 1000
                      )
                      requestGPT45Once(result, thinking, thinkingTime)
                    }

                    // 处理达到最大长度限制的情况
                    if (choice.finish_reason === 'length' && !continueR1Requested) {
                      console.log('deepseek-r1达到最大长度限制，继续请求')
                      continueR1Requested = true;
                      
                      // 显示一个加载状态提示
                      const continuationText = "\n\n[正在获取更多内容...]";
                      setMessages((prev) => {
                        return prev.map((msg) => {
                          if (msg.id === aiMsgId) {
                            const updatedResult = result + continuationText;
                            return {
                              ...msg,
                              deepseekR1Message: updatedResult,
                              // 如果当前是split模式，更新主消息内容
                              ...(msg.activeModel === 'split' ? {
                                message: renderSplitView(updatedResult, msg.gpt45Message || '', 'streaming', msg.gpt45Status || 'loading')
                              } : {})
                            };
                          }
                          return msg;
                        });
                      });
                      
                      // 等待当前流完成
                      reader.cancel(); // 取消当前流
                      
                      // 延迟一小段时间后继续请求
                      setTimeout(async () => {
                        try {
                          // 发送继续请求
                          const continueResponse = await sendDeepseekR1Request(result);
                          // 处理继续请求的响应
                          await processDeepseekR1Response(continueResponse, result, thinking);
                        } catch (error) {
                          console.error('DeepSeek R1继续请求错误:', error);
                          // 更新消息以显示错误
                          setMessages((prev) => {
                            return prev.map((msg) => {
                              if (msg.id === aiMsgId) {
                                const errorMsg = result + "\n\n[继续请求失败: " + ((error as Error).message || '未知错误') + "]";
                                return {
                                  ...msg,
                                  deepseekR1Message: errorMsg,
                                  deepseekR1Status: 'error',
                                  // 如果当前是split模式，更新主消息内容
                                  ...(msg.activeModel === 'split' ? {
                                    message: renderSplitView(errorMsg, msg.gpt45Message || '', 'error', msg.gpt45Status || 'loading')
                                  } : {})
                                };
                              }
                              return msg;
                            });
                          });
                          
                          // 即使DeepSeek R1出错，也尝试请求GPT-4.5（如果尚未请求）
                          if (!gpt45Requested) {
                            const thinkingTime = Math.round(
                              (Date.now() - thinkingStartTime) / 1000
                            )
                            requestGPT45Once(result, thinking, thinkingTime)
                          }
                        }
                      }, 500);
                      
                      return; // 中断当前的readChunk
                    } else if (choice.finish_reason === 'stop') {
                      console.log('deepseek-r1正常结束')
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === aiMsgId
                            ? {
                                ...msg,
                                deepseekR1Message: result,
                                deepseekR1Status: 'success',
                                thinking: thinking,
                                thinkingStatus: 'success',
                              }
                            : msg
                        )
                      )

                      // 确保思维链完成但还未请求GPT-4.5的情况下进行请求
                      if (!gpt45Requested) {
                        console.log('流结束，尚未请求GPT-4.5，立即发起请求');
                        const thinkingTime = Math.round(
                          (Date.now() - thinkingStartTime) / 1000
                        )
                        thinkingComplete = true;
                        requestGPT45Once(result, thinking, thinkingTime)
                      }
                    }
                  }
                  // 处理错误响应
                  else if (data.error) {
                    console.error('deepseek-r1 API错误响应:', data.error)
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMsgId
                          ? {
                              ...msg,
                              deepseekR1Message: `错误: ${
                                data.error.message || 'API错误'
                              }`,
                              deepseekR1Status: 'error',
                            }
                          : msg
                      )
                    )
                  }
                } catch (parseError) {
                  console.error('JSON解析错误:', parseError, '原始数据:', text)
                }
              })

            // 继续读取下一个数据块
            return readChunk()
          } catch (readError) {
            console.error('读取流错误:', readError)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      deepseekR1Message: `错误: ${
                        (readError as Error).message || '读取流错误'
                      }`,
                      deepseekR1Status: 'error',
                    }
                  : msg
              )
            )

            // 即使出错也完成思维链流程并请求GPT-4.5
            const thinkingTime = Math.round(
              (Date.now() - thinkingStartTime) / 1000
            )
            requestGPT45Once(result, thinking, thinkingTime)
          }
        }

        // 开始读取流
        await readChunk()
      }

      // 发送初始请求并处理响应
      const initialResponse = await sendDeepseekR1Request();
      await processDeepseekR1Response(initialResponse);
    } catch (error) {
      console.error('deepseek-r1错误:', error)
      // 更新状态显示错误
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                deepseekR1Message: `错误: ${
                  (error as Error).message || 'API错误'
                }`,
                deepseekR1Status: 'error',
              }
            : msg
        )
      )

      // 即使发生异常也尝试请求GPT-4.5，保证流程完整
      const thinkingTime = Math.round((Date.now() - Date.now()) / 1000) // 0秒思考时间
      requestGPT45Once('', '', thinkingTime)
    }
  }

  // 请求GPT-4.5模型的函数
  const requestGPT45 = async (
    userMessage: string,
    aiMsgId: string,
    chatMessages: Array<{ role: string; content: string }>,
    isFirstMessage: boolean,
    _deepseekResult: string,
    thinking: string,
    thinkingTime: number = 0
  ) => {
    try {
      // 构建带有思维链的用户消息
      let enhancedUserMessage = userMessage
      if (thinking) {
        enhancedUserMessage = `${userMessage}\n\n You may refer to the following thought process (Note: the thought process may contain errors and is for reference only, not the final answer):\n${thinking}`
      }

      // 更新思维链完成的状态和时间
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                thinking: thinking,
                thinkingStatus: 'success',
                thinkingTime: thinkingTime,
              }
            : msg
        )
      )

      // 创建包含思维链的消息数组
      const enhancedChatMessages = [
        ...chatMessages.filter(
          (msg) => msg.role !== 'user' || msg.content !== userMessage
        ),
        { role: 'user', content: enhancedUserMessage },
      ]

      // 注意：不将状态设置为streaming，保持loading状态直到收到第一个token
      // 仅为主消息准备空状态，但保持loading状态
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                gpt45Message: '', // 仅清空GPT-4.5的消息
                // 在split模式下，保留主消息内容和streaming状态，但更新分栏视图
                ...(msg.activeModel !== 'split' ? {
                  message: '', // 仅在非split模式下清空主消息
                  // 保持loading状态，不设置为streaming
                  status: msg.status === 'loading' ? 'loading' : msg.status,
                } : {
                  // 在split模式下，更新分栏视图以显示GPT-4.5的加载状态
                  message: renderSplitView(
                    msg.deepseekR1Message || '', 
                    '', 
                    msg.deepseekR1Status || 'success', 
                    'loading'
                  )
                }),
                gpt45Status: 'loading',
              }
            : msg
        )
      )

      // 发送GPT-4.5请求的函数，支持初始请求和继续请求
      const sendGPT45Request = async (continueFrom = '') => {
        // 如果是继续请求，需要修改消息结构
        const requestMessages = continueFrom 
          ? [...enhancedChatMessages, { 
              role: 'assistant', 
              content: continueFrom 
            }, { 
              role: 'user', 
              content: 'continue' 
            }] 
          : enhancedChatMessages;

        const response = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: requestMessages,
            model: 'gpt-4.5-preview', // 指定使用GPT-4.5模型
            temperature: 0.7,
            max_tokens: 2048,
            stream: true, // 确保启用流式响应
          }),
        });

        if (!response.ok) {
          throw new Error('GPT-4.5 API请求失败');
        }

        return response;
      };

      // 初始化空结果
      let result = '';
      let receivedFirstToken = false; // 标记是否收到第一个token
      let continueRequested = false; // 标记是否已请求继续

      // 处理GPT-4.5响应的函数 - 支持初始和继续请求
      const processGPT45Response = async (response: Response, initialResult = '') => {
        // 使用传入的初始结果（用于继续请求时）
        result = initialResult;

        // 使用fetch和ReadableStream处理
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No reader available');
        }

        const decoder = new TextDecoder('utf-8');

        // 递归读取流式响应
        const readChunk = async () => {
          try {
            const { value, done } = await reader.read();

            if (done) {
              console.log('GPT-4.5流结束');
              // 完成处理
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? {
                        ...msg,
                        message: result, // 设置主消息为GPT-4.5的结果
                        status: 'success',
                        gpt45Message: result,
                        gpt45Status: 'success',
                      }
                    : msg
                )
              );

              // 如果是第一条消息，生成标题
              if (isFirstMessage) {
                setTimeout(() => {
                  generateTitle([
                    ...chatMessages,
                    { role: 'assistant', content: result },
                  ]);
                }, 1000);
              }
              return;
            }

            // 解码二进制数据为文本
            const dataString = decoder.decode(value, { stream: true });

            // 处理SSE格式数据
            const chunks = dataString.toString().trim().split('data: ');
            for (const line of chunks) {
              if (!line || line.trim() === '') continue;

              const text = line.trim();

              // 处理流结束标记
              if (text === '[DONE]') {
                console.log('GPT-4.5 SSE流结束');
                continue;
              }

              try {
                // 解析JSON数据
                const data = JSON.parse(text);

                // 处理OpenAI格式响应
                if (data.choices && data.choices[0]) {
                  const choice = data.choices[0];

                  // 处理提取delta内容并更新UI
                  if (choice.delta && choice.delta.content !== undefined) {
                    const newContent = choice.delta.content;
                    result += newContent;

                    // 检查是否是第一个token，并更新状态从loading到streaming
                    if (!receivedFirstToken) {
                      receivedFirstToken = true;
                      console.log('GPT-4.5收到第一个token，更新状态为streaming');
                      
                      // 更新状态为streaming
                      setMessages((prev) => {
                        return prev.map((msg) => {
                          if (msg.id === aiMsgId) {
                            return {
                              ...msg,
                              status: 'streaming',
                              gpt45Status: 'streaming'
                            };
                          }
                          return msg;
                        });
                      });
                    }

                    // 继续正常更新消息内容
                    setMessages((prev) => {
                      return prev.map((msg) => {
                        if (msg.id === aiMsgId) {
                          return {
                            ...msg,
                            message: msg.activeModel === 'split' 
                              ? renderSplitView(msg.deepseekR1Message || '', result, msg.deepseekR1Status || 'success', 'streaming')
                              : result,
                            gpt45Message: result,
                            // 保持streaming状态不变 - 尤其对split模式很重要
                            status: msg.status === 'streaming' || msg.activeModel === 'split' ? 'streaming' : msg.status,
                            gpt45Status: 'streaming'
                          };
                        }
                        return msg;
                      });
                    });
                  }

                  // 处理达到最大长度限制的情况
                  if (choice.finish_reason === 'length' && !continueRequested) {
                    console.log('GPT-4.5达到最大长度限制，继续请求');
                    continueRequested = true;
                    
                    // 显示一个加载状态提示
                    const continuationText = "\n\n[正在获取更多内容...]";
                    setMessages((prev) => {
                      return prev.map((msg) => {
                        if (msg.id === aiMsgId) {
                          const updatedResult = result + continuationText;
                          return {
                            ...msg,
                            message: msg.activeModel === 'split' 
                              ? renderSplitView(msg.deepseekR1Message || '', updatedResult, msg.deepseekR1Status || 'success', 'streaming')
                              : updatedResult,
                            gpt45Message: updatedResult,
                          };
                        }
                        return msg;
                      });
                    });
                    
                    // 等待当前流完成
                    reader.cancel(); // 取消当前流
                    
                    // 延迟一小段时间后继续请求
                    setTimeout(async () => {
                      try {
                        // 发送继续请求
                        const continueResponse = await sendGPT45Request(result);
                        // 处理继续请求的响应
                        await processGPT45Response(continueResponse, result);
                      } catch (error) {
                        console.error('GPT-4.5继续请求错误:', error);
                        // 更新消息以显示错误
                        setMessages((prev) => {
                          return prev.map((msg) => {
                            if (msg.id === aiMsgId) {
                              return {
                                ...msg,
                                message: msg.activeModel === 'split' 
                                  ? renderSplitView(
                                      msg.deepseekR1Message || '', 
                                      result + "\n\n[继续请求失败: " + ((error as Error).message || '未知错误') + "]", 
                                      msg.deepseekR1Status || 'success', 
                                      'error'
                                    )
                                  : result + "\n\n[继续请求失败: " + ((error as Error).message || '未知错误') + "]",
                                gpt45Message: result + "\n\n[继续请求失败: " + ((error as Error).message || '未知错误') + "]",
                                gpt45Status: 'error'
                              };
                            }
                            return msg;
                          });
                        });
                      }
                    }, 500);
                    
                    return; // 中断当前的readChunk
                  } else if (choice.finish_reason === 'stop') {
                    console.log('GPT-4.5正常结束');
                    // 注意：不要在这里设置status为success，让流完全结束时处理
                  }
                }
                // 处理错误响应
                else if (data.error) {
                  console.error('GPT-4.5 API错误响应:', data.error);
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMsgId
                        ? {
                            ...msg,
                            gpt45Message: `错误: ${
                              data.error.message || 'API错误'
                            }`,
                            gpt45Status: 'error',
                            // 如果deepseek-r1成功了，就使用它的结果作为主消息
                            message:
                              msg.deepseekR1Status === 'success'
                                ? msg.deepseekR1Message || ''
                                : `错误: ${data.error.message || 'API错误'}`,
                            status:
                              msg.deepseekR1Status === 'success'
                                ? 'success'
                                : 'error',
                          }
                        : msg
                    )
                  );
                }
              } catch (parseError) {
                console.error('JSON解析错误:', parseError, '原始数据:', text);
              }
            }

            // 继续读取下一个数据块
            return readChunk();
          } catch (readError) {
            console.error('读取流错误:', readError);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      gpt45Message: `错误: ${
                        (readError as Error).message || '读取流错误'
                      }`,
                      gpt45Status: 'error',
                      // 如果deepseek-r1成功了，就使用它的结果作为主消息
                      message:
                        msg.deepseekR1Status === 'success'
                          ? msg.deepseekR1Message || ''
                          : `错误: ${
                              (readError as Error).message || '读取流错误'
                            }`,
                        status:
                          msg.deepseekR1Status === 'success' ? 'success' : 'error',
                    }
                  : msg
              )
            );
          }
        };

        // 开始读取流
        await readChunk();
      };

      // 发送初始请求并处理响应
      try {
        const initialResponse = await sendGPT45Request();
        await processGPT45Response(initialResponse);
      } catch (error) {
        console.error('GPT-4.5错误:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  gpt45Message: `错误: ${(error as Error).message || 'API错误'}`,
                  gpt45Status: 'error',
                  // 如果deepseek-r1成功了，就使用它的结果作为主消息
                  message:
                    msg.deepseekR1Status === 'success'
                      ? msg.deepseekR1Message || ''
                      : `错误: ${(error as Error).message || 'API错误'}`,
                  status:
                    msg.deepseekR1Status === 'success' ? 'success' : 'error',
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('GPT-4.5错误:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                gpt45Message: `错误: ${(error as Error).message || 'API错误'}`,
                gpt45Status: 'error',
                // 如果deepseek-r1成功了，就使用它的结果作为主消息
                message:
                  msg.deepseekR1Status === 'success'
                    ? msg.deepseekR1Message || ''
                    : `错误: ${(error as Error).message || 'API错误'}`,
                status:
                  msg.deepseekR1Status === 'success' ? 'success' : 'error',
              }
            : msg
        )
      );
    }
  };

  useEffect(() => {
    const currentConversation = conversationsItems.find(
      (item) => item.key === activeKey
    )
    if (currentConversation) {
      // 确保从会话加载的消息也有唯一ID
      const messagesWithUniqueIds = currentConversation.messages.map((msg) => {
        // 如果ID是简单的数字格式，生成新的唯一ID
        if (typeof msg.id === 'string' && /^msg_\d+$/.test(msg.id)) {
          return {
            ...msg,
            id: `msg_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`,
          }
        }
        return msg
      })
      setMessages(messagesWithUniqueIds)
    } else {
      setMessages([])
    }
  }, [activeKey])

  useEffect(() => {
    const currentConversation = conversationsItems.find(
      (item) => item.key === activeKey
    )
    if (
      currentConversation &&
      JSON.stringify(currentConversation.messages) !== JSON.stringify(messages)
    ) {
      updateConversationMessages(activeKey, messages)
    }
  }, [messages, activeKey])

  // 添加点击处理来展开/折叠思维链
  useEffect(() => {
    // 思维链点击处理函数
    const handleThinkingHeaderClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const header = target.closest('.thinking-header')

      if (header) {
        const messageId = header.getAttribute('data-message-id')
        if (messageId) {
          // 切换思维链显示状态
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, thinkingVisible: !msg.thinkingVisible }
                : msg
            )
          )
        }
      }
    };

    // 添加事件监听器
    document.addEventListener('click', handleThinkingHeaderClick)

    return () => {
      document.removeEventListener('click', handleThinkingHeaderClick)
    }
  }, [])

  const onConversationClick = (key: string) => {
    setActiveKey(key)
  }

  // 添加删除所有会话的处理函数
  const handleDeleteAll = () => {
    deleteAllConversations()
    message.success('已清空所有会话')
  }

  // 处理删除消息
  const handleDeleteMessage = (messageId: string | number) => {
    // 从本地状态中删除消息
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    // 更新持久化存储
    deleteMessage(activeKey, messageId)
    message.success('消息已删除')
  }

  // 创建消息底部操作栏
  const createMessageFooter = (
    _item: BubbleItem,
    message: MessageWithTimestamp
  ) => {
    // 格式化时间戳
    const formattedTime = message.timestamp
      ? new Date(message.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : ''

    // 共用的底部容器样式
    const footerContainerStyle = {
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }

    // 按钮区域样式
    const buttonAreaStyle = {
      marginLeft: '12px',
      display: 'flex',
      alignItems: 'center',
    }

    try {
      // 用户消息底部只显示时间和删除按钮
      if (message.status === 'local') {
        return (
          <div className='message-footer-container'>
            <div className='message-footer' style={footerContainerStyle}>
              <div style={messageStyles.messageTime}>{formattedTime}</div>
              <div style={buttonAreaStyle}>
                <Tooltip title='删除消息'>
                  <Button
                    type='text'
                    size='small'
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteMessage(message.id)}
                  />
                </Tooltip>
              </div>
            </div>
          </div>
        )
      }

      // AI消息底部显示时间和操作按钮
      return (
        <div className='message-footer-container'>
          <div className='message-footer' style={footerContainerStyle}>
            <div style={messageStyles.messageTime}>{formattedTime}</div>
            <div style={buttonAreaStyle}>
              {/* 模型选择按钮组 */}
              {message.deepseekR1Message && message.gpt45Message && (
                <Space.Compact size='small' style={{ marginRight: '8px' }}>
                  <Tooltip title='显示DeepSeek R1回复'>
                    <Button
                      type={
                        message.activeModel === 'deepseek-r1'
                          ? 'primary'
                          : 'default'
                      }
                      size='small'
                      onClick={() => {
                        const newMessages = [...messages];
                        const msgIndex = newMessages.findIndex(m => m.id === message.id);
                        if (msgIndex !== -1) {
                          newMessages[msgIndex] = {
                            ...newMessages[msgIndex],
                            activeModel: 'deepseek-r1'
                          };
                          setMessages(newMessages);
                          // 保存模型偏好到localStorage
                          localStorage.setItem('activeModelPreference', 'deepseek-r1');
                          setActiveModelPreference('deepseek-r1');
                        }
                      }}
                    >
                      R1
                    </Button>
                  </Tooltip>
                  <Tooltip title='显示GPT-4.5回复'>
                    <Button
                      type={
                        message.activeModel === 'gpt4.5' ? 'primary' : 'default'
                      }
                      size='small'
                      onClick={() => {
                        const newMessages = [...messages];
                        const msgIndex = newMessages.findIndex(m => m.id === message.id);
                        if (msgIndex !== -1) {
                          newMessages[msgIndex] = {
                            ...newMessages[msgIndex],
                            activeModel: 'gpt4.5'
                          };
                          setMessages(newMessages);
                          // 保存模型偏好到localStorage
                          localStorage.setItem('activeModelPreference', 'gpt4.5');
                          setActiveModelPreference('gpt4.5');
                        }
                      }}
                    >
                      4.5
                    </Button>
                  </Tooltip>
                  <Tooltip title='分栏显示两个模型回复'>
                    <Button
                      type={
                        message.activeModel === 'split' ? 'primary' : 'default'
                      }
                      size='small'
                      onClick={() => {
                        const newMessages = [...messages];
                        const msgIndex = newMessages.findIndex(m => m.id === message.id);
                        if (msgIndex !== -1) {
                          newMessages[msgIndex] = {
                            ...newMessages[msgIndex],
                            activeModel: 'split'
                          };
                          setMessages(newMessages);
                          // 保存模型偏好到localStorage
                          localStorage.setItem('activeModelPreference', 'split');
                          setActiveModelPreference('split');
                        }
                      }}
                    >
                      对比
                    </Button>
                  </Tooltip>
                </Space.Compact>
              )}

              {/* 复制按钮 */}
              <Tooltip title='复制内容'>
                <Button
                  type='text'
                  size='small'
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyMessage(message.message)}
                />
              </Tooltip>

              {/* 重新发送按钮 */}
              <Tooltip title='重新生成回复'>
                <Button
                  type='text'
                  size='small'
                  icon={<SyncOutlined />}
                  onClick={() => handleResendMessage(message.id)}
                />
              </Tooltip>

              {/* 删除按钮 */}
              <Tooltip title='删除消息'>
                <Button
                  type='text'
                  size='small'
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteMessage(message.id)}
                />
              </Tooltip>
            </div>
          </div>
        </div>
      )
    } catch (e) {
      console.error('创建消息底部时出错:', e)
      return <div style={messageStyles.messageTime}>{formattedTime}</div>
    }
  }

  // 为每条消息添加footer属性
  const items: BubbleItem[] = []

  messages.forEach((message) => {
    // 根据activeModel字段决定显示哪个模型的回复
    let displayContent = message.message

    if (message.status !== 'local') {
      // 处理模型内容
      if (message.activeModel === 'deepseek-r1' && message.deepseekR1Message) {
        displayContent = message.deepseekR1Message
      } else if (message.activeModel === 'gpt4.5' && message.gpt45Message) {
        displayContent = message.gpt45Message
      } else if (message.activeModel === 'split') {
        // 如果是分栏显示，创建安全的HTML结构
        // 只要是split模式就显示分栏视图，不再要求两个模型都有内容
        displayContent = renderSplitView(
          message.deepseekR1Message || '', 
          message.gpt45Message || '', 
          message.deepseekR1Status, 
          message.gpt45Status
        );
      }
    }

    // 根据当前选择的模型类型决定loading状态
    let isLoading = message.status === 'loading';
    if (message.status !== 'local') {
      if (message.activeModel === 'deepseek-r1') {
        isLoading = message.deepseekR1Status === 'loading';
      } else if (message.activeModel === 'gpt4.5') {
        isLoading = message.gpt45Status === 'loading';
      } else if (message.activeModel === 'split') {
        // 对比模式下，如果两个模型都在加载且没有内容，才显示loading状态
        // 否则显示已有的内容，这样可以实现双模型同时流式更新
        isLoading = false;
      }
    }

    const item: BubbleItem = {
      key: message.id,
      loading: isLoading,
      role:
        message.status === 'local'
          ? 'local'
          : message.status === 'streaming'
          ? 'streaming'
          : 'ai',
      content: displayContent,
      // 对于非streaming状态的消息，不使用typing效果
      typing: shouldUseTypingEffect(message),
      // 将模型数据传递给消息，以便在footer中使用
      data: {
        deepseekR1Message: message.deepseekR1Message,
        gpt45Message: message.gpt45Message,
        deepseekR1Status: message.deepseekR1Status,
        gpt45Status: message.gpt45Status,
        thinking: message.thinking,
        thinkingStatus: message.thinkingStatus,
        activeModel: message.activeModel,
        thinkingVisible: message.thinkingVisible,
      },
    }

    // 只为非loading状态的消息添加footer
    if (message.status !== 'loading') {
      item.footer = createMessageFooter(item, message)
    }

    items.push(item)
  })

  // 定义会话菜单配置
  const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
      {
        label: '重命名',
        key: 'rename',
        icon: <EditOutlined />,
        onClick: () => {
          // 打开重命名对话框
          showRenameModal(conversation.key, conversation.label || '未命名会话')
        },
      },
      {
        label: '删除',
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          // 使用现有的删除功能
          deleteConversation(conversation.key)
          message.success('会话已删除')
        },
      },
    ],
  })

  // 构建所有视图元素
  return (
    <div className={styles.layout}>
      {/* 重命名模态框 */}
      <Modal
        title='重命名会话'
        open={isRenameModalVisible}
        onOk={handleRenameConfirm}
        onCancel={handleRenameCancel}
        okText='确定'
        cancelText='取消'
      >
        <Input
          placeholder='请输入会话名称'
          value={newConversationName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setNewConversationName(e.target.value)
          }
          onPressEnter={handleRenameConfirm}
          autoFocus
        />
      </Modal>

      <div className={styles.menu}>
        <Logo />
        <div className={styles.menuButtons}>
          <Button
            onClick={addConversation}
            type='link'
            className={styles.addBtn}
            icon={<PlusOutlined />}
          >
            新建对话
          </Button>
        </div>
        <Conversations
          items={conversationsItems}
          className={styles.conversations}
          activeKey={activeKey}
          onActiveChange={onConversationClick}
          menu={menuConfig}
        />
        <div className={styles.menuFooter}>
          <Popconfirm
            title='确定要删除所有会话吗？'
            onConfirm={handleDeleteAll}
            okText='是'
            cancelText='否'
          >
            <Tooltip title='清空所有会话'>
              <Button
                type='text'
                className={styles.clearBtn}
                icon={<ClearOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      </div>
      <div className={styles.chat}>
        <div className={styles.instructions}>
          <p className='m-0'>将DeepSeek R1满血版的思维链用于 GPT4.5 的推理。</p>
          <div>
            <Button
              icon={<ShareAltOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                message.success('链接已复制到剪贴板')
              }}
              style={{ marginRight: 8 }}
            />
            <Button
              icon={<GithubOutlined />}
              onClick={() =>
                window.open('https://github.com/yi-ge/deep-gpt4.5', '_blank')
              }
            />
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className={styles.messagesContainer}>
          {/* 创建新版本的items数组，在用户消息和AI回复之间添加思维链 */}
          {(() => {
            // 创建处理后的消息列表
            const processedItems: BubbleItem[] = []

            // 处理思维链的关系
            for (let i = 0; i < messages.length; i++) {
              const msg = messages[i]

              // 保留用户消息
              if (msg.status === 'local') {
                // 为用户消息创建气泡项
                const userItem: BubbleItem = {
                  key: msg.id,
                  loading: false,
                  role: 'local',
                  content: msg.message,
                  footer: createMessageFooter(
                    { key: msg.id } as BubbleItem,
                      msg
                    )
                }
                processedItems.push(userItem)
              } else {
                // 如果这条AI消息有思维链且前一条是用户消息
                if (
                  msg.thinking &&
                  i > 0 &&
                  messages[i - 1].status === 'local'
                ) {
                  const isExpanded = msg.thinkingVisible !== false
                  const isLoading = msg.thinkingStatus === 'loading'

                  // 创建思维链气泡
                  const thinkingItem: BubbleItem = {
                    key: `thinking-${msg.id}`,
                    loading: false,
                    role: 'thinking',
                    content: `
<div class="thinking-bubble">
  <div class="thinking-header" style="display: flex; align-items: center; cursor: pointer;" data-message-id="${
    msg.id
  }">
    <span style="margin-right: 8px;">${
      isLoading
        ? '正在思考...'
        : msg.thinkingTime
        ? `思考用时 ${msg.thinkingTime} 秒`
        : '思考中'
    }</span>
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transform: ${
      isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
    }">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </div>
  ${
    isExpanded && msg.thinking
      ? `
  <div style="margin-top: 8px; padding: 12px; background-color: white; border-radius: 4px; border: 1px solid #eee;">
    ${md.render(msg.thinking)}
  </div>
  `
      : ''
  }
</div>
                    `,
                  }

                  // 添加思维链气泡到处理列表
                  processedItems.push(thinkingItem)
                }

                // 处理AI回复内容
                let displayContent = msg.message
                if (
                  msg.activeModel === 'deepseek-r1' &&
                  msg.deepseekR1Message
                ) {
                  displayContent = msg.deepseekR1Message
                } else if (msg.activeModel === 'gpt4.5' && msg.gpt45Message) {
                  displayContent = msg.gpt45Message
                } else if (
                  msg.activeModel === 'split' &&
                  msg.deepseekR1Message &&
                  msg.gpt45Message
                ) {
                  // 使用相同的分栏渲染函数，确保一致性
                  displayContent = renderSplitView(msg.deepseekR1Message, msg.gpt45Message, msg.deepseekR1Status, msg.gpt45Status);
                }

                // 为AI回复创建气泡项
                const aiItem: BubbleItem = {
                  key: msg.id,
                  loading: msg.status === 'loading',
                  role: msg.status === 'streaming' ? 'streaming' : 'ai',
                  content: displayContent,
                  // 对于非streaming状态的消息，不使用typing效果
                  typing: shouldUseTypingEffect(msg),
                  data: {
                    deepseekR1Message: msg.deepseekR1Message,
                    gpt45Message: msg.gpt45Message,
                    deepseekR1Status: msg.deepseekR1Status,
                    gpt45Status: msg.gpt45Status,
                    thinking: msg.thinking,
                    thinkingStatus: msg.thinkingStatus,
                    activeModel: msg.activeModel,
                    thinkingVisible: msg.thinkingVisible,
                  },
                }

                if (msg.status !== 'loading') {
                  aiItem.footer = createMessageFooter(aiItem, msg)
                }

                // 添加AI回复气泡到处理列表
                processedItems.push(aiItem)
              }
            }

            return (
              <Bubble.List
                items={processedItems}
                roles={roles}
                className={styles.messages}
              />
            )
          })()}
        </div>

        <Sender
          value={content}
          onSubmit={onRequest}
          onChange={setContent}
          loading={agent.isRequesting()}
          className={styles.sender}
        />
      </div>
    </div>
  )
}

export default Independent
