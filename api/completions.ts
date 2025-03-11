import OpenAI from 'openai'
import type { RequestContext } from '@vercel/edge'

export const config = {
  matcher: '/v1/chat/completions',
  runtime: 'edge',
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// 使用环境变量创建OpenAI实例
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  apiKey: process.env.OPENAI_API_KEY || '',
})

/**
 * 流式返回OpenAI聊天完成结果
 * 透传OpenAI的原始响应，包括思维链等特殊数据
 */
export async function* streamChatCompletion (messages: ChatMessage[]) {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4.5-preview",
      messages: messages,
      stream: true,
      temperature: 0.7,
    })

    // 直接透传OpenAI返回的每个chunk
    for await (const chunk of stream) {
      yield chunk
    }
  } catch (error: unknown) {
    // 错误处理，将错误包装成字符串返回
    console.error('OpenAI API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    yield `Error: ${errorMessage}`
  }
}

export default async function handler (req: Request, context: RequestContext) {
  // 只处理POST请求
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { messages } = body

    const stream = new ReadableStream({
      async start (controller) {
        const streamProcess = async () => {
          try {
            for await (const chunk of streamChatCompletion(messages)) {
              // 无论是什么类型的响应，都直接以JSON字符串形式传递
              // 包括错误消息和所有类型的响应
              const jsonChunk = typeof chunk === 'string'
                ? JSON.stringify({ text: chunk }) // 将纯文本错误消息转为JSON对象
                : JSON.stringify(chunk) // 直接序列化对象

              controller.enqueue(new TextEncoder().encode(`data: ${jsonChunk}\n\n`))
            }
            controller.close()
          } catch (error) {
            console.error('Stream processing error:', error)
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`))
            controller.close()
          }
        }

        // 使用context.waitUntil确保流处理完成
        context.waitUntil(streamProcess())
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Request processing error:', error)
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}