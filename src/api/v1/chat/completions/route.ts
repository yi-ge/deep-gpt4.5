import { streamChatCompletion } from '../../../openai'

export async function POST (req: Request) {
  try {
    const { messages } = await req.json()

    const stream = new ReadableStream({
      async start (controller) {
        try {
          for await (const chunk of streamChatCompletion(messages)) {
            controller.enqueue(new TextEncoder().encode(chunk))
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
} 