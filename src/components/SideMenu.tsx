import { Button, Popconfirm, Tooltip } from 'antd'
import type { ConversationsProps } from '@ant-design/x'
import { Conversations } from '@ant-design/x'
import { PlusOutlined, ClearOutlined } from '@ant-design/icons'
import { Conversation } from '../types/conversation'
import Logo from './Logo'

interface SideMenuProps {
  styles: Record<string, string>
  conversationsItems: Conversation[]
  activeKey: string
  setActiveKey: (key: string) => void
  addConversation: () => void
  handleDeleteAll: () => void
  menuConfig: ConversationsProps['menu']
}

const SideMenu: React.FC<SideMenuProps> = ({
  styles,
  conversationsItems,
  activeKey,
  setActiveKey,
  addConversation,
  handleDeleteAll,
  menuConfig,
}) => {
  return (
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
        onActiveChange={(key: string) => {
          setActiveKey(key)
        }}
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
  )
}

export default SideMenu 