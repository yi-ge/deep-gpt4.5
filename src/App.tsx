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
      onSuccess(`Mock success return. You said: ${message}`);
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