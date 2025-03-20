// 定义Bubble.List需要的类型
export interface BubbleItem {
  key: string | number
  loading: boolean
  role: string
  content: string
  footer?: React.ReactNode // 添加footer属性支持
  header?: React.ReactNode // 添加header属性支持
  typing?: { step: number; interval: number }
  // 添加模型数据字段，以便创建不同的UI
  data?: {
    deepseekR1Message?: string
    gpt45Message?: string
    deepseekR1Status?: string
    gpt45Status?: string
    thinking?: string
    thinkingStatus?: string
    activeModel?: 'deepseek-r1' | 'gpt4.5' | 'split'
    thinkingVisible?: boolean
  }
  style?: React.CSSProperties
}
