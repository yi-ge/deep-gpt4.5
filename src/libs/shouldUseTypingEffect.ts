import { MessageWithTimestamp } from "../types/messageTypes"

// 判断消息是否需要打字效果
export const shouldUseTypingEffect = (message: MessageWithTimestamp): { step: number; interval: number } | undefined => {
  // 用户消息不需要打字效果
  if (message.status === 'local') {
    return undefined
  }

  // 根据当前选择的模型类型决定是否使用打字效果
  if (message.activeModel === 'deepseek-r1') {
    return message.deepseekR1Status === 'streaming' ? { step: 5, interval: 20 } : undefined
  } else if (message.activeModel === 'gpt4.5') {
    return message.gpt45Status === 'streaming' ? { step: 5, interval: 20 } : undefined
  } else if (message.activeModel === 'split') {
    // 分栏模式下不使用打字效果，因为会分别在各自的区域显示
    return undefined
  }

  // 默认情况
  return message.status === 'streaming' ? { step: 5, interval: 20 } : undefined
}