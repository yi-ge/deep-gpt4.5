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
    conversations: css`
      padding: 0 12px;
      flex: 1;
      overflow-y: auto;

      @media (max-width: 768px) {
        display: none;
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
      margin: 0 12px 24px 12px;

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
  }
}) 