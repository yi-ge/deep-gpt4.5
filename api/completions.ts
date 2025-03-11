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

interface ChatCompletionOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string[] | null
  [key: string]: string | number | boolean | string[] | null | undefined // 使用更具体的类型代替any
}

// 使用环境变量创建OpenAI实例
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  apiKey: process.env.OPENAI_API_KEY || '',
})

const deepseek = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || undefined,
  apiKey: process.env.DEEPSEEK_API_KEY || '',
})

/**
 * 流式返回聊天完成结果
 * 透传OpenAI或Deepseek的原始响应，包括思维链等特殊数据
 */
export async function* streamChatCompletion (
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
) {
  try {
    // 设置默认选项
    const defaultOptions = {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: null
    }

    // 合并默认选项和用户传入的选项
    const finalOptions = { ...defaultOptions, ...options }
    const { model, ...restOptions } = finalOptions

    // 根据模型名称选择使用哪个API实例
    const apiClient = model.startsWith('deepseek') ? deepseek : openai

    const stream = await apiClient.chat.completions.create({
      model: model,
      messages: messages,
      stream: true,
      ...restOptions
    })

    // 直接透传API返回的每个chunk
    for await (const chunk of stream) {
      yield chunk
    }
  } catch (error: unknown) {
    // 错误处理，将错误包装成字符串返回
    console.error('API Error:', error)
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
    const {
      messages,
      model = "gpt-4o-mini",
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      stop
    } = body

    const options: ChatCompletionOptions = {
      model,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      stop
    }

    // 过滤掉undefined的属性
    Object.keys(options).forEach(key => {
      if (options[key as keyof ChatCompletionOptions] === undefined) {
        delete options[key as keyof typeof options]
      }
    })

    const stream = new ReadableStream({
      async start (controller) {
        const streamProcess = async () => {
          try {
            for await (const chunk of streamChatCompletion(messages, options)) {
              const jsonChunk = JSON.stringify(chunk)
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