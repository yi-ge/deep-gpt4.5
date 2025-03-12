// 声明antd-x模块类型
declare module '@ant-design/x' {
  import * as React from 'react'

  export interface RoleConfig {
    placement: 'start' | 'end'
    typing?: { step: number; interval: number }
    styles?: { content: { borderRadius: number } }
    variant?: string
    messageRender?: (content: string) => React.ReactNode
  }

  export interface BubbleProps {
    messageRender?: (content: string) => React.ReactNode
    role?: string
    content?: string
    loading?: boolean
    typing?: { step: number; interval: number }
    styles?: { content: { borderRadius: number } }
    onEnd?: () => void
  }

  export interface ConversationsProps {
    items: Array<{
      key: string
      label?: string
      messages?: Array<any>
    }>
    activeKey?: string
    onActiveChange?: (key: string) => void
    menu?: (conversation: any) => {
      items: Array<{
        label: string
        key: string
        icon?: React.ReactNode
        danger?: boolean
        onClick?: () => void
      }>
    }
    className?: string
  }

  // 扩展Bubble组件
  export const Bubble: {
    List: React.FC<{
      items: Array<{
        key: string | number
        loading: boolean
        role: string
        content: string
        footer?: React.ReactNode
        data?: Record<string, any>
      }>
      roles: Record<string, RoleConfig>
      className?: string
    }>
  }

  export const Conversations: React.FC<ConversationsProps>
  export const Sender: React.FC<{
    value: string
    onChange: (value: string) => void
    onSubmit: (value: string) => void
    loading?: boolean
    className?: string
  }>

  export function useXAgent<T> (options: {
    request: (
      params: { message: string },
      callbacks: {
        onSuccess: (result: T) => void
        onUpdate: (partialResult: T) => void
        onError: (error: Error) => void
      }
    ) => void
  }): [
      {
        isRequesting: () => boolean
        request: (
          params: { message: string },
          callbacks?: {
            onSuccess?: (result: T) => void
            onUpdate?: (partialResult: T) => void
            onError?: (error: Error) => void
          }
        ) => void
      }
    ]
} 