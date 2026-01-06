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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

    fetchMessages()
    const messageInterval = setInterval(fetchMessages, 1000)
    const typingInterval = setInterval(checkTyping, 500)

    return () => {
      clearInterval(messageInterval)
      clearInterval(typingInterval)
    }
  }, [isJoined, usernameges()
    const interval = setInterval(fetchMessages, 1000)

    return () => clearInterval(interval)
  }, [isJoined])

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Please enter your name')
      return
    }
    if (password !== 'idgasf') {
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
    setReplyingTo(null) text: inputText.trim(),
      timestamp: Date.now(),
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
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (!isJoined) {
    return (
      <div className={styles.container}>
        <div className={styles.joinCard}>
          <h1 className={styles.title}>makeupmore</h1>
          <p className={styles.subtitle}>Enter your name and password to join</p>
          <form onSubmit={handleJoin} className={styles.joinForm}>
            <input
              ty{message.replyTo && (
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
          </diverTyping && (
            <div className={styles.typingIndicator}>
              <span className={styles.typingDot}></span>
              <span className={styles.typingDot}></span>
              <span className={styles.typingDot}></span>
            </div>onChange={(e) => setPassword(e.target.value)}
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
          <span className={styles.username}>Welcome, {username}!</span>
        </div>

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
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className={styles.inputForm}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className={styles.messageInput}
            autoFocus
          />
          <button type="submit" className={styles.sendButton}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
