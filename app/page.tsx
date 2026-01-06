'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'

interface Message {
  id: string
  user: string
  text: string
  timestamp: number
  replyTo?: {
    id: string
    user: string
    text: string
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isJoined, setIsJoined] = useState(false)
  const [error, setError] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    // Only auto-scroll if new messages were added
    if (messages.length > previousMessageCountRef.current) {
      const container = messagesContainerRef.current
      if (container) {
        // Only auto-scroll if user is near the bottom (within 100px)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
        if (isNearBottom) {
          scrollToBottom()
        }
      }
    }
    previousMessageCountRef.current = messages.length
  }, [messages])

  useEffect(() => {
    if (!isJoined) return

    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/messages')
        const data = await response.json()
        setMessages(data.messages || [])
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }

    const checkTyping = async () => {
      try {
        const response = await fetch('/api/typing')
        const data = await response.json()
        const otherUsersTyping = data.typingUsers?.filter((u: string) => u !== username) || []
        setOtherUserTyping(otherUsersTyping.length > 0)
      } catch (error) {
        console.error('Error checking typing:', error)
      }
    }

    const checkCallSignal = async () => {
      try {
        const response = await fetch(`/api/call?user=${username}`)
        const data = await response.json()
        if (data.signal && data.from !== username) {
          if (data.signal.type === 'offer' && callStatus === 'idle') {
            setCallStatus('incoming')
          } else if (data.signal.type === 'answer' && callStatus === 'calling') {
            await handleAnswer(data.signal.sdp)
          } else if (data.signal.candidate) {
            await handleIceCandidate(data.signal.candidate)
          } else if (data.signal.type === 'end') {
            endCall()
          }
        }
      } catch (error) {
        console.error('Error checking call signal:', error)
      }
    }

    fetchMessages()
    const messageInterval = setInterval(fetchMessages, 1000)
    const typingInterval = setInterval(checkTyping, 500)
    const callInterval = setInterval(checkCallSignal, 500)

    return () => {
      clearInterval(messageInterval)
      clearInterval(typingInterval)
      clearInterval(callInterval)
    }
  }, [isJoined, username, callStatus])

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Please enter your name')
      return
    }
    if (password !== 'idgasf') {
      setError('Incorrect password')
      return
    }
    setError('')
    setIsJoined(true)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const message = {
      user: username,
      text: inputText.trim(),
      timestamp: Date.now(),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        user: replyingTo.user,
        text: replyingTo.text
      } : undefined
    }

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })
      setInputText('')
      setReplyingTo(null)
      setIsTyping(false)
      await fetch('/api/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: username, typing: false }),
      })
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true)
      await fetch('/api/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: username, typing: true }),
      })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false)
      await fetch('/api/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: username, typing: false }),
      })
    }, 2000)
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  const initializePeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: username,
            signal: { candidate: event.candidate }
          })
        })
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    peerConnectionRef.current = pc
    return pc
  }

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const pc = initializePeerConnection()
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: username,
          signal: { type: 'offer', sdp: offer.sdp }
        })
      })

      setCallStatus('calling')
      setInCall(true)
    } catch (error) {
      console.error('Error starting call:', error)
      alert('Could not access camera/microphone')
    }
  }

  const answerCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const pc = initializePeerConnection()
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      const response = await fetch(`/api/call?user=${username}`)
      const data = await response.json()
      
      if (data.signal && data.signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.signal.sdp }))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: username,
            signal: { type: 'answer', sdp: answer.sdp }
          })
        })

        setCallStatus('connected')
        setInCall(true)
      }
    } catch (error) {
      console.error('Error answering call:', error)
    }
  }

  const handleAnswer = async (sdp: string) => {
    try {
      const pc = peerConnectionRef.current
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
        setCallStatus('connected')
      }
    } catch (error) {
      console.error('Error handling answer:', error)
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnectionRef.current
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error)
    }
  }

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    setRemoteStream(null)
    setCallStatus('idle')
    setInCall(false)

    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: username,
        signal: { type: 'end' }
      })
    })
  }

  const rejectCall = () => {
    setCallStatus('idle')
    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: username,
        signal: { type: 'end' }
      })
    })
  }

  if (!isJoined) {
    return (
      <div className={styles.container}>
        <div className={styles.joinCard}>
          <h1 className={styles.title}>makeupmore</h1>
          <p className={styles.subtitle}>Enter your name and password to join</p>
          <form onSubmit={handleJoin} className={styles.joinForm}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              className={styles.joinInput}
              maxLength={20}
              autoFocus
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={styles.joinInput}
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.joinButton}>
              Join Chat
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.chatCard}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Chat Room</h2>
          <div className={styles.headerRight}>
            {!inCall && callStatus === 'idle' && (
              <button onClick={startCall} className={styles.callButton}>
                📹 Call
              </button>
            )}
            {inCall && (
              <button onClick={endCall} className={styles.endCallButton}>
                End Call
              </button>
            )}
            <span className={styles.username}>Welcome, {username}!</span>
          </div>
        </div>

        {callStatus === 'incoming' && (
          <div className={styles.incomingCall}>
            <p>Incoming call...</p>
            <div className={styles.callActions}>
              <button onClick={answerCall} className={styles.answerButton}>Answer</button>
              <button onClick={rejectCall} className={styles.rejectButton}>Reject</button>
            </div>
          </div>
        )}

        {inCall && (
          <div className={styles.videoContainer}>
            <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
            <video ref={localVideoRef} autoPlay playsInline muted className={styles.localVideo} />
          </div>
        )}

        <div className={styles.messagesContainer} ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${
                  message.user === username ? styles.ownMessage : styles.otherMessage
                }`}
              >
                {message.replyTo && (
                  <div className={styles.replyPreview}>
                    <span className={styles.replyUser}>{message.replyTo.user}</span>
                    <span className={styles.replyText}>{message.replyTo.text}</span>
                  </div>
                )}
                <div className={styles.messageHeader}>
                  <span className={styles.messageUser}>{message.user}</span>
                  <span className={styles.messageTime}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className={styles.messageText}>{message.text}</div>
                {message.user !== username && (
                  <button 
                    className={styles.replyButton} 
                    onClick={() => handleReply(message)}
                  >
                    Reply
                  </button>
                )}
              </div>
            ))
          )}
          {otherUserTyping && (
            <div className={styles.typingIndicator}>
              <span className={styles.typingDot}></span>
              <span className={styles.typingDot}></span>
              <span className={styles.typingDot}></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className={styles.inputForm}>
          {replyingTo && (
            <div className={styles.replyingTo}>
              <div className={styles.replyingToContent}>
                <span className={styles.replyingToLabel}>Replying to {replyingTo.user}</span>
                <span className={styles.replyingToText}>{replyingTo.text}</span>
              </div>
              <button type="button" onClick={cancelReply} className={styles.cancelReply}>
                ✕
              </button>
            </div>
          )}
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className={styles.messageInput}
              autoFocus
            />
            <button type="submit" className={styles.sendButton}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
