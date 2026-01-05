import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

interface Message {
  id: string
  user: string
  text: string
  timestamp: number
}

const MESSAGES_KEY = 'chat:messages'
const MAX_MESSAGES = 100

export async function GET() {
  try {
    const messages = await kv.get<Message[]>(MESSAGES_KEY) || []
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, text, timestamp } = body

    if (!user || !text) {
      return NextResponse.json(
        { error: 'User and text are required' },
        { status: 400 }
      )
    }

    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      user,
      text,
      timestamp,
    }

    // Get existing messages
    const messages = await kv.get<Message[]>(MESSAGES_KEY) || []
    messages.push(newMessage)

    // Keep only last 100 messages
    if (messages.length > MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES)
    }

    // Save back to KV
    await kv.set(MESSAGES_KEY, messages)

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    console.error('Error saving message:', error)
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    )
  }
}

// Optional: Add a DELETE endpoint to clear messages
export async function DELETE() {
  try {
    await kv.del(MESSAGES_KEY)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear messages' },
      { status: 500 }
    )
  }
}
