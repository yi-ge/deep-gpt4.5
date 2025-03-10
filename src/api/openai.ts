import OpenAI from 'openai'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
})

export async function* streamChatCompletion (messages: ChatMessage[]) {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      stream: true,
      temperature: 0.7,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        yield content
      }
    }
  } catch (error: unknown) {
    console.error('OpenAI API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    yield `Error: ${errorMessage}`
  }
} 