import { renderMarkdown } from './MarkdownRenderer'
import { RolesType } from '../types/messageTypes'
import { Typography } from 'antd'

export const roles: RolesType = {
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
    messageRender: (content: string) => (
      <Typography style= {{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        { content }
        </Typography>
    ),
  },
}