import { NextRequest, NextResponse } from 'next/server'

interface CallSignal {
  from: string
  signal: any
  timestamp: number
}

// In-memory call signaling (expires after 5 seconds)
let callSignals: CallSignal[] = []

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const user = url.searchParams.get('user')
  
  if (!user) {
    return NextResponse.json({ error: 'User required' }, { status: 400 })
  }

  // Remove expired signals (older than 5 seconds)
  const now = Date.now()
  callSignals = callSignals.filter(s => now - s.timestamp < 5000)
  
  // Get signals not from this user
  const signal = callSignals.find(s => s.from !== user)
  
  return NextResponse.json(signal || {})
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { from, signal } = body

    if (!from || !signal) {
      return NextResponse.json(
        { error: 'From and signal are required' },
        { status: 400 }
      )
    }

    // Clear old signals if ending call
    if (signal.type === 'end') {
      callSignals = []
    } else {
      // Add new signal
      callSignals.push({
        from,
        signal,
        timestamp: Date.now()
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
