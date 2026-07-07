import React, { useState } from 'react'
import { callChatApi, callSearchApi } from '../services/api'

type Message = { role: 'user' | 'ai'; text: string }

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const quickActions = [
        'Restaurant Overview',
        'Show me the menu',
        'Do you have vegan food?',
        'What are your hours?'
    ]

    async function handleQuickAction(action: string) {
        const userMsg: Message = { role: 'user', text: action }
        setMessages(m => [...m, userMsg])
        setLoading(true)
        try {
            const res = await callChatApi([...messages, userMsg])
            setMessages(m => [...m, { role: 'ai', text: res || 'No response' }])
        } catch (err) {
            setMessages(m => [...m, { role: 'ai', text: 'Chat failed' }])
        } finally { setLoading(false) }
    }

    async function handleSend() {
        if (!input) return
        const userMsg: Message = { role: 'user', text: input }
        setMessages(m => [...m, userMsg])
        setInput('')
        setLoading(true)
        try {
            const res = await callChatApi([...messages, userMsg])
            setMessages(m => [...m, { role: 'ai', text: res || 'No response' }])
        } catch (err) {
            setMessages(m => [...m, { role: 'ai', text: 'Chat failed' }])
        } finally { setLoading(false) }
    }

    return (
        <div className="chat-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">🍽️</div>
                    <h2>KaveriAI</h2>
                    <p className="status">🟢 Online</p>
                </div>
                <div className="sidebar-section">
                    <div className="info-item">
                        <span className="icon">🕐</span>
                        <span>Open 10 AM - 10 PM</span>
                    </div>
                    <div className="info-item">
                        <span className="icon">📍</span>
                        <span>Dine-in · Takeaway · Delivery</span>
                    </div>
                    <div className="info-item">
                        <span className="icon">🍜</span>
                        <span>Italian · Asian · Continental</span>
                    </div>
                </div>
            </aside>

            <main className="main-chat">
                {messages.length === 0 ? (
                    <div className="welcome-section">
                        <div className="welcome-greeting">
                            <span className="wave">👋</span>
                            <h1>Welcome to KaveriAI!</h1>
                        </div>
                        <p className="welcome-subtitle">Ask me anything about our menu, hours, services, or specials.</p>
                        <div className="quick-actions">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    className="action-btn"
                                    onClick={() => handleQuickAction(action)}
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="messages-container">
                        {messages.map((m, i) => (
                            <div key={i} className={`message ${m.role}`}>
                                <div className="message-content">{m.text}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="input-area">
                    <input
                        type="text"
                        placeholder="Ask about our menu, hours, specials..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !loading) handleSend() }}
                        disabled={loading}
                    />
                    <button onClick={handleSend} disabled={loading} className="send-btn">
                        ▶
                    </button>
                </div>
            </main>
        </div>
    )
}
