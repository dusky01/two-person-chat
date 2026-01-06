import { NextRequest, NextResponse } from 'next/server'

interface CallSignal {
  id: string
  from: string
  to?: string
  signal: any
  timestamp: number
}

// In-memory call signaling (expires after 30 seconds)
let callSignals: CallSignal[] = []
let signalIdCounter = 0

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const user = url.searchParams.get('user')
  const lastId = url.searchParams.get('lastId')
  
  if (!user) {
    return NextResponse.json({ error: 'User required' }, { status: 400 })
  }

  // Remove expired signals (older than 30 seconds)
  const now = Date.now()
  callSignals = callSignals.filter(s => now - s.timestamp < 30000)
  
  // Get all signals not from this user and after lastId
  const userSignals = callSignals.filter(s => {
    const isForThisUser = s.from !== user
    const isNew = !lastId || parseInt(s.id) > parseInt(lastId)
    return isForThisUser && isNew
  })
  
  return NextResponse.json({ signals: userSignals })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { from, to, signal } = body

    if (!from || !signal) {
      return NextResponse.json(
        { error: 'From and signal are required' },
        { status: 400 }
      )
    }

    // Clear old signals if ending call
    if (signal.type === 'end') {
      callSignals = callSignals.filter(s => s.from !== from)
    } else {
      // Add new signal with unique ID
      callSignals.push({
        id: String(signalIdCounter++),
        from,
        to,
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
