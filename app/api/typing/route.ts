import { NextRequest, NextResponse } from 'next/server'

interface TypingUser {
  user: string
  timestamp: number
}

// In-memory typing state (expires after 3 seconds)
let typingUsers: TypingUser[] = []

export async function GET() {
  // Remove expired typing indicators (older than 3 seconds)
  const now = Date.now()
  typingUsers = typingUsers.filter(t => now - t.timestamp < 3000)
  
  return NextResponse.json({ 
    typingUsers: typingUsers.map(t => t.user) 
  })
}

export async function POST(request: NextRequest) {
  try {
    const { user, typing } = await request.json()

    if (!user) {
      return NextResponse.json(
        { error: 'User is required' },
        { status: 400 }
      )
    }

    if (typing) {
      // Add or update user's typing status
      const existingIndex = typingUsers.findIndex(t => t.user === user)
      if (existingIndex >= 0) {
        typingUsers[existingIndex].timestamp = Date.now()
      } else {
        typingUsers.push({ user, timestamp: Date.now() })
      }
    } else {
      // Remove user from typing list
      typingUsers = typingUsers.filter(t => t.user !== user)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
