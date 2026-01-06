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
  const [callType, setCallType] = useState<'audio' | 'video'>('audio')
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [incomingCallType, setIncomingCallType] = useState<'audio' | 'video'>('audio')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const lastSignalIdRef = useRef<string>('')

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('Setting local video stream')
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(e => console.error('Error playing local:', e))
    }
  }, [localStream])

  useEffect(() => {
    if (remoteStream) {
      console.log('Remote stream updated, tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`))
      
      if (remoteVideoRef.current && callType === 'video') {
        console.log('Setting remote video element')
        remoteVideoRef.current.srcObject = remoteStream
        remoteVideoRef.current.onloadedmetadata = () => {
          console.log('Remote video metadata loaded')
          remoteVideoRef.current?.play().catch(e => console.error('Error playing remote video:', e))
        }
      }
      
      if (remoteAudioRef.current) {
        console.log('Setting remote audio element')
        remoteAudioRef.current.srcObject = remoteStream
        remoteAudioRef.current.onloadedmetadata = () => {
          console.log('Remote audio metadata loaded')
          remoteAudioRef.current?.play().catch(e => console.error('Error playing remote audio:', e))
        }
      }
    }
  }, [remoteStream, callType])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      const container = messagesContainerRef.current
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
        if (isNearBottom) {
          scrollToBottom()
        }
      }
    }
    previousMessageCountRef.current = messages.length
  }, [messages])

  const handleAnswer = async (sdp: string) => {
    try {
      console.log('Handling answer')
      const pc = peerConnectionRef.current
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
        
        if (pendingCandidatesRef.current.length > 0) {
          console.log('Adding pending ICE candidates:', pendingCandidatesRef.current.length)
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidatesRef.current = []
        }
      }
    } catch (error) {
      console.error('Error handling answer:', error)
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnectionRef.current
      if (pc) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          console.log('Adding ICE candidate')
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } else {
          console.log('Queuing ICE candidate for later')
          pendingCandidatesRef.current.push(candidate)
        }
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error)
    }
  }

  const endCall = (sendSignal = true) => {
    console.log('Ending call, sendSignal:', sendSignal)
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop()
        console.log('Stopped track:', track.kind)
      })
      setLocalStream(null)
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    setRemoteStream(null)
    setCallStatus('idle')
    setInCall(false)
    pendingCandidatesRef.current = []
    window.sessionStorage.removeItem('pendingOffer')

    if (sendSignal) {
      fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: username,
          signal: { type: 'end' }
        })
      }).catch(e => console.error('Error sending end signal:', e))
    }
  }

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
        const response = await fetch(`/api/call?user=${username}&lastId=${lastSignalIdRef.current}`)
        const data = await response.json()
        
        if (data.signals && data.signals.length > 0) {
          for (const signalData of data.signals) {
            lastSignalIdRef.current = signalData.id
            const { signal, from } = signalData
            
            if (from === username) continue
            
            // Check for ICE candidate first (it won't have a type)
            if (signal.candidate) {
              console.log('Received signal: candidate')
              await handleIceCandidate(signal.candidate)
            } else if (signal.type === 'offer') {
              console.log('Received signal: offer')
              if (callStatus === 'idle') {
                setIncomingCallType(signal.callType || 'audio')
                setCallStatus('incoming')
                // Store the offer for when user answers
                window.sessionStorage.setItem('pendingOffer', JSON.stringify(signal))
              }
            } else if (signal.type === 'answer') {
              console.log('Received signal: answer')
              if (callStatus === 'calling') {
                await handleAnswer(signal.sdp)
              }
            } else if (signal.type === 'end') {
              console.log('Received signal: end - ending call')
              endCall(false)
            }
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
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    })

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate.type)
        try {
          await fetch('/api/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: username,
              signal: { candidate: event.candidate.toJSON() }
            })
          })
        } catch (error) {
          console.error('Error sending ICE candidate:', error)
        }
      }
    }

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind)
      if (event.streams && event.streams[0]) {
        console.log('Setting remote stream')
        setRemoteStream(event.streams[0])
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('Call connected!')
        setCallStatus('connected')
      } else if (pc.iceConnectionState === 'failed') {
        console.log('Call failed')
        alert('Connection failed. Please try again.')
        endCall()
      } else if (pc.iceConnectionState === 'closed') {
        console.log('Call closed')
        endCall()
      }
    }

    pc.onsignalingstatechange = () => {
      console.log('Signaling state:', pc.signalingState)
    }

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
    }

    peerConnectionRef.current = pc
    return pc
  }

  const startCall = async (type: 'audio' | 'video') => {
    try {
      console.log('Starting call:', type)
      setCallType(type)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'video' ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      console.log('Got local stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`))
      setLocalStream(stream)

      const pc = initializePeerConnection()
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, track.enabled)
        pc.addTrack(track, stream)
      })

      // Create offer with proper constraints
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video'
      })
      console.log('Created offer')
      await pc.setLocalDescription(offer)

      // Send offer
      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: username,
          signal: { 
            type: 'offer', 
            sdp: offer.sdp, 
            callType: type 
          }
        })
      })

      setCallStatus('calling')
      setInCall(true)
      console.log('Offer sent, waiting for answer...')
    } catch (error) {
      console.error('Error starting call:', error)
      alert('Could not access microphone/camera. Please check permissions and try again.')
      setCallStatus('idle')
      setInCall(false)
    }
  }

  const answerCall = async () => {
    try {
      console.log('Answering call')
      const pendingOffer = window.sessionStorage.getItem('pendingOffer')
      if (!pendingOffer) {
        console.error('No pending offer found')
        return
      }
      
      const offerSignal = JSON.parse(pendingOffer)
      const type = offerSignal.callType || 'audio'
      console.log('Call type:', type)
      setCallType(type)

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'video' ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      console.log('Got local stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`))
      setLocalStream(stream)

      const pc = initializePeerConnection()
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind)
        pc.addTrack(track, stream)
      })
      
      // Set remote description (the offer)
      console.log('Setting remote description (offer)')
      await pc.setRemoteDescription(new RTCSessionDescription({ 
        type: 'offer', 
        sdp: offerSignal.sdp 
      }))
      
      // Add any pending ICE candidates
      if (pendingCandidatesRef.current.length > 0) {
        console.log('Adding pending ICE candidates:', pendingCandidatesRef.current.length)
        for (const candidate of pendingCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (e) {
            console.error('Error adding pending candidate:', e)
          }
        }
        pendingCandidatesRef.current = []
      }
      
      // Create answer
      const answer = await pc.createAnswer()
      console.log('Created answer')
      await pc.setLocalDescription(answer)

      // Send answer
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
      window.sessionStorage.removeItem('pendingOffer')
    } catch (error) {
      console.error('Error answering call:', error)
      alert('Could not access microphone/camera. Please check permissions and try again.')
      setCallStatus('idle')
    }
  }

  const rejectCall = () => {
    setCallStatus('idle')
    window.sessionStorage.removeItem('pendingOffer')
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
              <>
                <button onClick={() => startCall('audio')} className={styles.callButton}>
                  📞 Audio Call
                </button>
                <button onClick={() => startCall('video')} className={styles.callButton}>
                  📹 Video Call
                </button>
              </>
            )}
            {callStatus === 'calling' && (
              <span className={styles.callingText}>Calling...</span>
            )}
            {inCall && (
              <button onClick={() => endCall(true)} className={styles.endCallButton}>
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
            {callType === 'video' ? (
              <>
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline
                  controls={false}
                  className={styles.remoteVideo}
                  style={{ backgroundColor: '#000' }}
                />
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  controls={false}
                  className={styles.localVideo}
                  style={{ backgroundColor: '#000' }}
                />
              </>
            ) : (
              <div className={styles.audioCall}>
                <div className={styles.audioCallIcon}>🎵</div>
                <p className={styles.audioCallText}>
                  {callStatus === 'calling' ? 'Calling...' : 'Audio Call in Progress'}
                </p>
                <p className={styles.audioCallSubtext}>
                  {callStatus === 'connected' ? '✓ Connected' : 'Connecting...'}
                </p>
                <audio ref={remoteAudioRef} autoPlay playsInline />
              </div>
            )}
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
