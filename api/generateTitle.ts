import OpenAI from 'openai'

export const config = {
  matcher: '/v1/generateTitle',
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

const TITLE_GENERATION_PROMPT = `### Task:
Generate a concise, 3-5 word title with an emoji summarizing the chat history.
### Guidelines:
- The title should clearly represent the main theme or subject of the conversation.
- Use emojis that enhance understanding of the topic, but avoid quotation marks or special formatting.
- Write the title in the chat's primary language.
- Prioritize accuracy over excessive creativity; keep it clear and simple.
### Output:
JSON format: { "title": "your concise title here" }
### Examples:
- { "title": "📉 Stock Market Trends" },
- { "title": "🍪 Perfect Chocolate Chip Recipe" },
- { "title": "🎮 Video Game Development Insights" },
- { "title": "📈 市场趋势洞察" }
### Chat History:
<chat_history>
{{MESSAGES}}
</chat_history>`

/**
 * 生成聊天标题
 */
export async function generateChatTitle (messages: ChatMessage[]): Promise<string> {
  try {
    // 只取最近的2条用户的消息用于总结
    const recentMessages = messages.filter(msg => msg.role === 'user').slice(-2)

    // 替换提示词中的占位符
    const messagesText = recentMessages.map(msg =>
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n')

    const prompt = TITLE_GENERATION_PROMPT.replace('{{MESSAGES}}', messagesText)

    // 使用gpt-4o-mini模型生成标题
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 100
    })

    const titleResponse = completion.choices[0]?.message?.content || '{ "title": "新对话" }'

    try {
      // 尝试解析JSON响应
      const titleObject = JSON.parse(titleResponse)
      return titleObject.title || "新对话"
    } catch {
      // 如果无法解析JSON，尝试提取标题或返回默认值
      const titleMatch = titleResponse.match(/["']title["']\s*:\s*["'](.+?)["']/)
      return titleMatch ? titleMatch[1] : "新对话"
    }
  } catch (error) {
    console.error('Title generation error:', error)
    return "新对话"
  }
}

export default async function handler (req: Request) {
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

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const title = await generateChatTitle(messages)

    return new Response(JSON.stringify({ title }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Request processing error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', title: "新对话" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
} 