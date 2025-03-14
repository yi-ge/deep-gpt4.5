import { Message } from './conversation'

// 扩展消息类型，添加时间戳
export interface MessageWithTimestamp extends Message {
  timestamp?: Date
  thinkingTime?: number // 添加思考用时字段
}

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

// 定义深层类型，以修复类型错误
export type RolesType = Record<string, RoleConfig>

export interface RoleConfig {
  placement: 'start' | 'end'
  typing?: { step: number; interval: number }
  styles?: { content: { borderRadius: number } }
  variant?: string
  messageRender?: any // 使用适当的类型
}

// 模型参数类型
export interface ModelParams {
  model: string
  temperature: number
  max_tokens: number
}

