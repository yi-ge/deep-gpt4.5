import {
  Bubble,
  Conversations,
  Sender,
  useXAgent,
  useXChat,
} from '@ant-design/x';
import React, { useEffect } from 'react';
import './App.css';

import {
  PlusOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Button, type GetProp, message } from 'antd';

import { useStyle } from './styles/layout';
import Logo from './components/Logo';
import { useConversations } from './hooks/useConversations';

const roles: GetProp<typeof Bubble.List, 'roles'> = {
  ai: {
    placement: 'start',
    typing: { step: 5, interval: 20 },
    styles: {
      content: {
        borderRadius: 16,
      },
    },
  },
  local: {
    placement: 'end',
    variant: 'shadow',
  },
};

const Independent: React.FC = () => {
  const { styles } = useStyle();
  const [content, setContent] = React.useState('');
  
  const {
    conversationsItems,
    activeKey,
    setActiveKey,
    addConversation,
    updateConversationMessages,
  } = useConversations();

  const [agent] = useXAgent<string>({
    request: async ({ message }, { onSuccess }) => {
      try {
        const currentConversation = conversationsItems.find(item => item.key === activeKey);
        const messages = currentConversation?.messages || [];
        
        const response = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...messages.map(msg => ({
                role: msg.status === 'local' ? 'user' : 'assistant',
                content: msg.message
              })),
              { role: 'user', content: message }
            ],
          }),
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        // 使用fetch和ReadableStream处理
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No reader available');
        }

        let result = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // 解码二进制数据为文本
          const chunk = new TextDecoder().decode(value);
          
          // 处理SSE格式数据
          const parts = chunk.split('\n\n');
          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const data = part.substring(6);
              if (data && data.trim()) {
                try {
                  // 所有响应现在都是JSON格式
                  const jsonData = JSON.parse(data);
                  
                  // 处理纯文本错误消息
                  if (jsonData.text && typeof jsonData.text === 'string') {
                    if (jsonData.text.startsWith('Error:')) {
                      console.error('API错误:', jsonData.text);
                    } else {
                      result += jsonData.text;
                    }
                  } 
                  // 处理标准的OpenAI响应格式
                  else if (jsonData.choices && jsonData.choices[0]) {
                    // 提取content部分
                    if (jsonData.choices[0].delta?.content) {
                      result += jsonData.choices[0].delta.content;
                    }
                    
                    // 如果有思维链，记录到控制台
                    if (jsonData.choices[0].delta?.thinking) {
                      console.log('思维链:', jsonData.choices[0].delta.thinking);
                      // 这里可以添加思维链的特殊处理逻辑
                    }
                  }
                  // 处理错误响应
                  else if (jsonData.error) {
                    console.error('处理错误:', jsonData.error);
                  }
                } catch (e) {
                  // 如果JSON解析失败，可能是纯文本（旧格式的响应）
                  console.error('JSON解析错误:', e);
                  result += data;
                }
                
                // 更新UI，始终展示累积的文本内容
                onSuccess(result);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error:', error);
        onSuccess('抱歉，发生了错误，请稍后重试。');
      }
    },
  });

  const { onRequest, messages, setMessages } = useXChat<string>({
    agent,
  });

  useEffect(() => {
    const currentConversation = conversationsItems.find(item => item.key === activeKey);
    if (currentConversation) {
      setMessages(currentConversation.messages);
    } else {
      setMessages([]);
    }
  }, [activeKey]);

  useEffect(() => {
    const currentConversation = conversationsItems.find(item => item.key === activeKey);
    if (currentConversation && JSON.stringify(currentConversation.messages) !== JSON.stringify(messages)) {
      updateConversationMessages(activeKey, messages);
    }
  }, [messages, activeKey]);

  const onSubmit = (nextContent: string) => {
    if (!nextContent) return;
    onRequest(nextContent);
    setContent('');
  };

  const onConversationClick: GetProp<typeof Conversations, 'onActiveChange'> = (key) => {
    setActiveKey(key);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('链接已复制到剪贴板');
  };

  const items: GetProp<typeof Bubble.List, 'items'> = messages.map(({ id, message, status }) => ({
    key: id,
    loading: status === 'loading',
    role: status === 'local' ? 'local' : 'ai',
    content: message,
  }));

  return (
    <div className={styles.layout}>
      <div className={styles.menu}>
        <Logo />
        <Button
          onClick={addConversation}
          type="link"
          className={styles.addBtn}
          icon={<PlusOutlined />}
        >
          新建对话
        </Button>
        <Conversations
          items={conversationsItems}
          className={styles.conversations}
          activeKey={activeKey}
          onActiveChange={onConversationClick}
        />
      </div>
      <div className={styles.chat}>
        <div className={styles.instructions}>
          <p className="m-0">
            将DeepSeek大模型的思维链用于 GPT4.5 的推理。
          </p>
          <Button icon={<ShareAltOutlined />} onClick={handleShare} />
        </div>
        <Bubble.List
          items={items}
          roles={roles}
          className={styles.messages}
        />
        <Sender
          value={content}
          onSubmit={onSubmit}
          onChange={setContent}
          loading={agent.isRequesting()}
          className={styles.sender}
        />
      </div>
    </div>
  );
};

export default Independent;