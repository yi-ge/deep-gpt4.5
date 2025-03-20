import { ChatMessage } from "../types/ChatMessage"

// 生成标题的API
export async function generateTitle (messages: ChatMessage[]): Promise<string | null> {
  try {
    const response = await fetch('/v1/generate-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    })

    if (!response.ok) {
      console.error('标题生成请求失败')
      return null
    }

    const data = await response.json()
    return data.title || null
  } catch (error) {
    console.error('生成标题出错:', error)
    return null
  }
}