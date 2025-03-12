import { createStyles } from 'antd-style'

export const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      height: 100vh;
      min-height: 600px;
      border-radius: ${token.borderRadius}px;
      display: flex;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;

      .ant-prompts {
        color: ${token.colorText};
      }

      @media (max-width: 768px) {
        flex-direction: column;
      }
    `,
    menu: css`
      background: ${token.colorBgLayout}80;
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;

      @media (max-width: 768px) {
        width: 100%;
        height: auto;
        max-height: 60px;
      }
    `,
    menuButtons: css`
      display: flex;
      flex-direction: column;
      padding: 0 12px;
      margin-bottom: 12px;
    `,
    conversations: css`
      padding: 0 12px;
      flex: 1;
      overflow-y: auto;

      .ant-list-item {
        position: relative;
        padding-right: 40px;
        
        &:hover .deleteConversationBtn {
          opacity: 1;
        }
      }

      @media (max-width: 768px) {
        display: none;
      }
    `,
    conversationItemExtra: css`
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
    `,
    deleteConversationBtn: css`
      opacity: 0;
      transition: opacity 0.3s;
      
      &:hover {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.05);
      }
    `,
    chat: css`
      height: 100%;
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: ${token.paddingLG}px;
      gap: 16px;

      @media (max-width: 768px) {
        padding: ${token.padding}px;
      }
    `,
    messages: css`
      flex: 1;
      overflow-y: auto;
    `,
    messagesContainer: css`
      position: relative;
      flex: 1;
      overflow-y: auto;
    `,
    messageDeleteOverlay: css`
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10;
    `,
    messageOverlayItem: css`
      position: relative;
      min-height: 48px;
    `,
    messageDeleteBtn: css`
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.7;
      pointer-events: auto;
      background: transparent !important;
      margin: 14px 0 8px 16px;
      
      &:hover {
        opacity: 1;
        background: transparent !important;
      }
    `,
    messageDeleteBtnLocal: css`
      left: 8px;
    `,
    messageDeleteBtnAI: css`
      right: 8px;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
      position: sticky;
      bottom: 0;
      background: ${token.colorBgContainer};
      z-index: 1;
    `,
    logo: css`
      display: flex;
      height: 72px;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;

      img {
        width: 24px;
        height: 24px;
        display: inline-block;
      }

      span {
        display: inline-block;
        margin: 0 8px;
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }

      @media (max-width: 768px) {
        height: 60px;
        padding: 0 16px;

        span {
          font-size: 14px;
        }
      }
    `,
    addBtn: css`
      background: #1677ff0f;
      border: 1px solid #1677ff34;
      width: calc(100% - 24px);
      margin: 0 12px 12px 12px;

      @media (max-width: 768px) {
        display: none;
      }
    `,
    clearBtn: css`
      background: #ff40330f;
      border: 1px solid #ff403334;
      width: calc(100% - 24px);
      margin: 0 12px 12px 12px;

      @media (max-width: 768px) {
        display: none;
      }
    `,
    instructions: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      color: ${token.colorTextSecondary};
      font-size: 14px;
    `,
    knowledgeUpdate: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      margin: 12px;
      background-color: #f5f5f5;
      border-radius: 8px;
      font-size: 14px;
      color: ${token.colorTextSecondary};
    `,
    knowledgeText: css`
      display: flex;
      align-items: center;
      gap: 4px;
    `,
    knowledgeDeleteBtn: css`
      opacity: 0.6;
      transition: opacity 0.3s;
      
      &:hover {
        opacity: 1;
        background: transparent;
      }
    `,
  }
})

// 添加自定义样式，用于消息底部操作区域和思维链
export const messageStyles = {
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
  },
  splitView: {
    display: 'flex',
    width: '100%',
    gap: '10px',
    marginTop: '10px',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  splitColumn: {
    flex: 1,
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '250px',
    maxWidth: '100%',
    marginBottom: '10px',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  },
  splitHeader: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#1890ff',
  },
  splitContent: {
    overflow: 'auto',
    maxWidth: '100%',
  },
  thinkingContainer: {
    backgroundColor: '#f6f8fa',
    padding: '12px',
    marginTop: '10px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    lineHeight: '1.5',
    overflow: 'auto',
    maxHeight: '400px',
  },
  thinkingHeader: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'rgba(0, 0, 0, 0.65)',
    padding: '8px 0',
  },
  thinkingContent: {
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '8px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  thinkingBubble: {
    backgroundColor: '#f5f5f5',
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '8px',
  },
}