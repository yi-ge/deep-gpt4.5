import { Bubble, Conversations, Sender, useXAgent } from '@ant-design/x'
import type { BubbleProps, ConversationsProps } from '@ant-design/x'
import * as React from 'react'
import { useEffect, useState } from 'react'
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
import { Button, message, Typography, Popconfirm, Tooltip, Space, Modal, Input } from 'antd'
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

  // 添加自定义样式，用于消息底部操作区域
  const messageStyles = {
    messageFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 8px',
      fontSize: '12px',
    },
    messageTime: {
      color: 'rgba(0, 0, 0, 0.45)',
      fontSize: '12px',
    }
  }

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

  // 将messages类型更新为包含时间戳
  const [messages, setMessages] = React.useState<MessageWithTimestamp[]>([])

  // 添加重命名相关状态
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameConversationKey, setRenameConversationKey] = useState<string>('');
  const [newConversationName, setNewConversationName] = useState('');

  // 打开重命名模态框
  const showRenameModal = (key: string, currentName: string) => {
    setRenameConversationKey(key);
    setNewConversationName(currentName);
    setIsRenameModalVisible(true);
  };

  // 处理重命名确认
  const handleRenameConfirm = () => {
    if (newConversationName.trim()) {
      updateConversationTitle(renameConversationKey, newConversationName.trim());
      message.success('会话已重命名');
      setIsRenameModalVisible(false);
    } else {
      message.error('会话名称不能为空');
    }
  };

  // 处理重命名取消
  const handleRenameCancel = () => {
    setIsRenameModalVisible(false);
  };

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
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        // 更新持久化存储
        deleteMessage(activeKey, messageId);
        
        // 添加新的AI回复占位符，带有时间戳
        const aiMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const newAiMessage: MessageWithTimestamp = {
          id: aiMsgId,
          message: '',
          status: 'loading',
          timestamp: new Date(),
        }
        
        // 只添加AI消息占位符，不添加用户消息
        setMessages((prev) => [...prev, newAiMessage]);
        
        // 调用agent处理请求
        agent.request(
          { message: prevUserMessage.message },
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

  // 添加删除所有会话的处理函数
  const handleDeleteAll = () => {
    deleteAllConversations()
    message.success('已清空所有会话')
  }

  // 处理删除消息
  const handleDeleteMessage = (messageId: string | number) => {
    // 从本地状态中删除消息
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    // 更新持久化存储
    deleteMessage(activeKey, messageId);
    message.success('消息已删除');
  }

  // 为每个消息生成Footer
  const createMessageFooter = (
    item: BubbleItem,
    message: MessageWithTimestamp
  ) => {
    const isUserMessage = item.role === 'local'
    const isAiMessage = !isUserMessage && item.role !== 'loading'

    // 格式化时间显示
    let formattedTime = ''
    try {
      const timestamp = message.timestamp
      if (timestamp) {
        const date =
          typeof timestamp === 'string' ? new Date(timestamp) : timestamp
        formattedTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString(
          [],
          { hour: '2-digit', minute: '2-digit' }
        )}`
      }
    } catch (e) {
      console.error('时间格式化出错:', e)
    }

    return (
      <div 
        style={messageStyles.messageFooter} 
        className="message-footer"
      >
        {formattedTime && (
          <span style={messageStyles.messageTime}>{formattedTime}</span>
        )}
        <Space size={4}>
          {isAiMessage && (
            <>
              <Button
                type='text'
                size='small'
                icon={<CopyOutlined />}
                onClick={() => handleCopyMessage(item.content)}
                title='复制内容'
              />
              <Button
                type='text'
                size='small'
                icon={<SyncOutlined />}
                onClick={() => handleResendMessage(item.key)}
                title='重新生成'
              />
              <Popconfirm
                title='确定要删除这条消息吗？'
                onConfirm={() => handleDeleteMessage(item.key)}
                okText='是'
                cancelText='否'
              >
                <Button
                  type='text'
                  size='small'
                  icon={<DeleteOutlined />}
                  title='删除消息'
                />
              </Popconfirm>
            </>
          )}
          {isUserMessage && (
            <Popconfirm
              title='确定要删除这条消息吗？'
              onConfirm={() => handleDeleteMessage(item.key)}
              okText='是'
              cancelText='否'
            >
              <Button
                type='text'
                size='small'
                icon={<DeleteOutlined />}
                title='删除消息'
              />
            </Popconfirm>
          )}
        </Space>
      </div>
    )
  }

  // 为每条消息添加footer属性
  const items: BubbleItem[] = messages.map((message) => {
    const item: BubbleItem = {
      key: message.id,
      loading: message.status === 'loading',
      role:
        message.status === 'local'
          ? 'local'
          : message.status === 'streaming'
          ? 'streaming'
          : 'ai',
      content: message.message,
    }

    // 只为非loading状态的消息添加footer
    if (message.status !== 'loading') {
      item.footer = createMessageFooter(item, message)
    }

    return item
  })

  // 调试DOM结构的辅助函数（用完后注释掉）
  // React.useEffect(() => {
  //   const debugDOM = () => {
  //     console.log('正在调试气泡DOM结构...');
  //     // 查找所有气泡元素的类名
  //     const bubbles = document.querySelectorAll('*');
  //     const bubbleElements = Array.from(bubbles).filter(el => {
  //       const className = el.className;
  //       return typeof className === 'string' && (
  //         className.includes('bubble') || 
  //         className.includes('message') || 
  //         className.includes('x-') || 
  //         className.includes('ant-')
  //       );
  //     });
  //     // 打印找到的元素
  //     console.log('找到疑似气泡元素:', bubbleElements.length);
  //     bubbleElements.forEach((el, index) => {
  //       if (index < 10) { // 只打印前10个
  //         console.log(`- 元素 ${index}:`, el.tagName, el.className);
  //       }
  //     });
  //   };
  //   // 延迟执行，确保DOM已渲染
  //   setTimeout(debugDOM, 2000);
  // }, [messages.length]);

  // 定义会话菜单配置
  const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
      {
        label: '重命名',
        key: 'rename',
        icon: <EditOutlined />,
        onClick: () => {
          // 打开重命名对话框
          showRenameModal(conversation.key, conversation.label || '未命名会话');
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

  return (
    <div className={styles.layout}>
      {/* 重命名模态框 */}
      <Modal
        title="重命名会话"
        open={isRenameModalVisible}
        onOk={handleRenameConfirm}
        onCancel={handleRenameCancel}
        okText="确定"
        cancelText="取消"
      >
        <Input 
          placeholder="请输入会话名称"
          value={newConversationName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewConversationName(e.target.value)}
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
          menu={menuConfig}
        />
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
          <Bubble.List
            items={items}
            roles={roles as any} // 类型问题无法解决，保持使用any
            className={styles.messages}
          />
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
