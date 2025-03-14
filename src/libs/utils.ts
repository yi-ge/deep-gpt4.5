import markdownit from 'markdown-it'

// 初始化markdown-it
export const md = markdownit({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
})

// 添加用于分栏显示的自定义渲染函数
export const renderSplitView = (r1Content: string, gpt45Content: string, r1Status?: string, gpt45Status?: string): string => {
  const r1IsLoading = r1Status === 'loading'
  const r1IsStreaming = r1Status === 'streaming'
  const gpt45IsLoading = gpt45Status === 'loading'
  const gpt45IsStreaming = gpt45Status === 'streaming'

  return `
<div class="split-view-container">
  <div class="split-view-column">
    <div class="split-view-header" style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #1890ff; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">DeepSeek R1 ${r1IsLoading ? '<span style="color: #faad14; margin-left: 5px;">(加载中...)</span>' : r1IsStreaming ? '<span style="color: #52c41a; margin-left: 5px;">(生成中...)</span>' : ''}</div>
    <div class="split-view-content deepseek-content" style="overflow-wrap: break-word; word-break: break-word;">
      <div class="markdown-safe-container">${r1IsLoading && !r1Content ? '<div style="color: #888;">正在加载回复...</div>' : md.render(r1Content || '')}</div>
    </div>
  </div>
  <div class="split-view-column">
    <div class="split-view-header" style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #1890ff; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">GPT-4.5 ${gpt45IsLoading ? '<span style="color: #faad14; margin-left: 5px;">(加载中...)</span>' : gpt45IsStreaming ? '<span style="color: #52c41a; margin-left: 5px;">(生成中...)</span>' : ''}</div>
    <div class="split-view-content gpt45-content" style="overflow-wrap: break-word; word-break: break-word;">
      <div class="markdown-safe-container">${gpt45IsLoading && !gpt45Content ? '<div style="color: #888;">正在加载回复...</div>' : md.render(gpt45Content || '')}</div>
    </div>
  </div>
</div>`.trim()
}
