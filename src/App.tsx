import { Bubble, Conversations, Sender, useXAgent } from '@ant-design/x'
import type { BubbleProps } from '@ant-design/x'
import * as React from 'react'
import { useEffect, useState } from 'react'
import './App.css'

import {
  PlusOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  ClearOutlined,
  GithubOutlined,
} from '@ant-design/icons'
import { Button, message, Typography, Popconfirm, Tooltip } from 'antd'
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

const roles: Record<string, RoleConfig> = {
  ai: {
    placement: 'start',
    typing: { step: 5, interval: 20 },
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
    typing: { step: 5, interval: 20 },
    styles: {
      content: {
        borderRadius: 0,
      },
    },
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
  },
}

// 扩展Message类型，添加时间戳
interface MessageWithTimestamp extends Message {
  timestamp?: Date
}

const Independent: React.FC = () => {
  const { styles } = useStyle()
  const [content, setContent] = React.useState('')

  // 添加模型参数状态
  const [modelParams] = React.useState({
    model: 'gpt-4.5-preview',
    temperature: 0.7,
    max_tokens: 1000,
  })

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

  // 添加悬停状态管理
  const [hoveredMessage, setHoveredMessage] = useState<string | number | null>(
    null
  )

  // 将messages类型更新为包含时间戳
  const [messages, setMessages] = React.useState<MessageWithTimestamp[]>([])

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
                    if (choice.delta && choice.delta.thinking) {
                      console.log('思维链:', choice.delta.thinking)
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
    const aiMsgId = `msg_${Date.now() + 1}_${Math.random()
      .toString(36)
      .substring(2, 9)}`
    const newAiMessage: MessageWithTimestamp = {
      id: aiMsgId,
      message: '',
      status: 'loading',
      timestamp: new Date(), // 添加当前时间
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

    // 调用agent处理请求
    agent.request(
      { message: nextContent },
      {
        onSuccess: (result: string) => {
          // 成功完成时更新状态为success
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, message: result, status: 'success' }
                : msg
            )
          )

          // 生成标题（如果是第一条消息）
          if (isFirstMessage) {
            setTimeout(() => {
              generateTitle([
                ...chatMessages,
                { role: 'assistant', content: result },
              ])
            }, 1000)
          }
        },
        onUpdate: (partialResult: string) => {
          // 收到部分结果时更新状态为streaming
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, message: partialResult, status: 'streaming' }
                : msg
            )
          )
        },
        onError: (error: Error) => {
          // 出错时更新状态为error
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, message: `错误: ${error.message}`, status: 'error' }
                : msg
            )
          )
        },
      }
    )

    // 清空输入框
    setContent('')
  }

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

  const onConversationClick = (key: string) => {
    setActiveKey(key)
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    message.success('链接已复制到剪贴板')
  }

  // 添加删除会话的处理函数
  const handleDelete = (key: string) => {
    deleteConversation(key)
  }

  // 添加删除所有会话的处理函数
  const handleDeleteAll = () => {
    deleteAllConversations()
    message.success('已清空所有会话')
  }

  // 处理删除消息
  const handleDeleteMessage = (messageId: string | number) => {
    deleteMessage(activeKey, messageId)
  }

  const items: BubbleItem[] = messages.map(({ id, message, status }) => ({
    key: id,
    loading: status === 'loading', // 只有真正loading时才显示loading
    role:
      status === 'local'
        ? 'local'
        : status === 'streaming'
        ? 'streaming'
        : 'ai',
    content: message,
  }))

  // 修改itemExtra实现悬停显示删除按钮
  const renderItemExtra = (key: string) => {
    return (
      <div className={styles.conversationItemExtra}>
        <Popconfirm
          title='确定要删除这个会话吗？'
          onConfirm={() => handleDelete(key)}
          okText='是'
          cancelText='否'
        >
          <Button
            type='text'
            size='small'
            danger
            icon={<DeleteOutlined />}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className={styles.deleteConversationBtn}
          />
        </Popconfirm>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
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
          <Popconfirm
            title='确定要删除所有会话吗？'
            onConfirm={handleDeleteAll}
            okText='是'
            cancelText='否'
          >
            <Tooltip title='清空所有会话'>
              <Button
                type='link'
                className={styles.clearBtn}
                icon={<ClearOutlined />}
                danger
              >
                清空会话
              </Button>
            </Tooltip>
          </Popconfirm>
        </div>
        <Conversations
          items={conversationsItems}
          className={styles.conversations}
          activeKey={activeKey}
          onActiveChange={onConversationClick}
          itemExtra={renderItemExtra}
        />
      </div>
      <div className={styles.chat}>
        <div className={styles.instructions}>
          <p className='m-0'>将DeepSeek R1满血版的思维链用于 GPT4.5 的推理。</p>
          <div>
            <Button icon={<ShareAltOutlined />} onClick={handleShare} style={{ marginRight: 8 }} />
            <Button 
              icon={<GithubOutlined />} 
              onClick={() => window.open('https://github.com/yi-ge/deep-gpt4.5', '_blank')}
            />
          </div>
        </div>

        {/* 聊天消息区域包含删除功能 */}
        <div className={styles.messagesContainer}>
          <Bubble.List
            items={items}
            roles={roles as any} // 类型问题无法解决，保持使用any
            className={styles.messages}
          />

          {/* 删除按钮覆盖层 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
            }}
          >
            {items.map((item, index) => {
              // 判断是否是当前悬停的消息
              const isHovered = hoveredMessage === item.key

              // 找到对应的完整消息对象（包含时间戳）
              const fullMessage = messages.find((m) => m.id === item.key)

              // 安全处理时间戳
              let formattedTime = ''
              try {
                const timestamp = fullMessage?.timestamp
                if (timestamp) {
                  // 如果是字符串，转换为Date对象
                  const date =
                    typeof timestamp === 'string'
                      ? new Date(timestamp)
                      : timestamp
                  formattedTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString(
                    [],
                    { hour: '2-digit', minute: '2-digit' }
                  )}`
                }
              } catch (e) {
                console.error('时间格式化出错:', e)
              }

              // 计算每个消息的大致位置和高度
              const isUserMessage = item.role === 'local'
              const messageHeight = Math.max(
                52,
                30 + (item.content.length / 50) * 20
              ) // 根据内容长度估算高度
              const top = index * messageHeight

              return (
                <div
                  key={`overlay-${item.key}`}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: 0,
                    right: 0,
                    height: `${messageHeight}px`,
                    pointerEvents: 'auto',
                    background: 'transparent',
                    transition: 'background 0.3s',
                  }}
                  onMouseEnter={() => setHoveredMessage(item.key)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0px',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: isUserMessage
                          ? 'flex-end'
                          : 'flex-start',
                        padding: '0 16px 4px 16px',
                      }}
                    >
                      {/* AI消息的时间和删除按钮 */}
                      {!isUserMessage && (
                        <>
                          <Popconfirm
                            title='确定要删除这条消息吗？'
                            onConfirm={() => handleDeleteMessage(item.key)}
                            okText='是'
                            cancelText='否'
                            placement='topLeft'
                          >
                            <Button
                              type='text'
                              size='small'
                              icon={<DeleteOutlined />}
                              className={styles.messageDeleteBtn}
                            />
                          </Popconfirm>

                          {formattedTime && (
                            <span
                              style={{
                                fontSize: '12px',
                                color: 'rgba(0, 0, 0, 0.45)',
                                marginLeft: '36px',
                                marginTop: '32px',
                                alignSelf: 'center',
                                opacity: 0.7,
                                pointerEvents: 'auto',
                                background: 'transparent !important',
                              }}
                            >
                              {formattedTime}
                            </span>
                          )}
                        </>
                      )}

                      {/* 用户消息只有删除按钮 */}
                      {isUserMessage && (
                        <Popconfirm
                          title='确定要删除这条消息吗？'
                          onConfirm={() => handleDeleteMessage(item.key)}
                          okText='是'
                          cancelText='否'
                          placement='topRight'
                        >
                          <Button
                            type='text'
                            size='small'
                            icon={<DeleteOutlined />}
                            className={styles.messageDeleteBtn}
                          />
                        </Popconfirm>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
