import { Message } from './conversation'

// 扩展消息类型，添加时间戳
export interface MessageWithTimestamp extends Message {
  timestamp?: Date
  thinkingTime?: number // 添加思考用时字段
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

// 扩展Message类型，添加时间戳
export interface MessageWithTimestamp extends Message {
  timestamp?: Date
  thinkingTime?: number // 添加思考用时字段
}
