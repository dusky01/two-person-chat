'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'

interface Message {
  id: string
  user: string
  text: string
  timestamp: number
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isJoined, setIsJoined] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
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

    fetchMessages()
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
          <h1 className={styles.title}>Two Person Chat</h1>
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
          <span className={styles.username}>Welcome, {username}!</span>
        </div>

        <div className={styles.messagesContainer}>
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
