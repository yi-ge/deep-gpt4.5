import { Typography } from 'antd'
import type { BubbleProps } from '@ant-design/x'
import { md } from '../libs/utils'

/**
 * Markdown内容渲染器
 * 将Markdown文本渲染为HTML并安全显示
 */
export const renderMarkdown: BubbleProps['messageRender'] = (content) => (
  <Typography>
    <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
  </Typography>
)

