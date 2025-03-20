import React from 'react';
import { Button, message } from 'antd';
import { ShareAltOutlined, GithubOutlined } from '@ant-design/icons';

const ShareLinks: React.FC = () => {
  // 复制当前URL到剪贴板
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('链接已复制到剪贴板');
  };

  // 打开GitHub仓库
  const handleOpenGitHub = () => {
    window.open('https://github.com/yi-ge/deep-gpt4.5', '_blank');
  };

  return (
    <div>
      <Button
        icon={<ShareAltOutlined />}
        onClick={handleCopyLink}
        style={{ marginRight: 8 }}
      />
      <Button
        icon={<GithubOutlined />}
        onClick={handleOpenGitHub}
      />
    </div>
  );
};

export default ShareLinks;
