import React from 'react';
import { createStyles } from 'antd-style';

const useStyle = createStyles(({ token, css }) => ({
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
}));

const Logo: React.FC = () => {
  const { styles } = useStyle();
  
  return (
    <div className={styles.logo}>
      <img
        src="/logo.svg"
        draggable={false}
        alt="logo"
      />
      <span>DeepGPT4.5</span>
    </div>
  );
};

export default Logo; 