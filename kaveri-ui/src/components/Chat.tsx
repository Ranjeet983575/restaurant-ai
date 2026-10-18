import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { callChatApi, callConversationApi, callMenuApi, callRestaurantApi, ChatResponse, MenuItem, Restaurant } from '../services/api'

type Message = {
    role: 'user' | 'assistant'
    text: string
    createdAt: Date
    fallback?: boolean
    toolCalls?: ChatResponse['toolCalls']
    tables?: ChatResponse['conversationState']['availableTables']
}

const prompts = [
    { icon: '01', label: 'Explore the menu', value: 'Show me your most popular dishes' },
    { icon: '02', label: 'Find something spicy', value: 'Recommend a spicy dish' },
    { icon: '03', label: 'Vegetarian options', value: 'What vegetarian and vegan dishes do you have?' },
    { icon: '04', label: 'Book a table', value: 'I want to book a table' },
]

function getConversationId(): string {
    const key = 'kaveri-conversation-id'
    const stored = window.localStorage.getItem(key)
    if (stored) return stored
    const created = crypto.randomUUID()
    window.localStorage.setItem(key, created)
    return created
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function MenuCard({ item }: { item: MenuItem }) {
    return <article className="menu-card">
        <div className="menu-card-top"><span className="menu-category">{item.category}</span>{item.chef_recommendation && <span className="chef-mark">Chef pick</span>}</div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="menu-card-footer"><strong>{item.currency === 'INR' ? '₹' : item.currency} {item.price}</strong><span>{item.vegetarian ? 'Vegetarian' : 'Signature'}</span></div>
    </article>
}

export default function Chat() {
    const [conversationId, setConversationId] = useState(getConversationId)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [chatEnded, setChatEnded] = useState(() =>
        window.localStorage.getItem(`kaveri-chat-ended:${window.localStorage.getItem('kaveri-conversation-id')}`) === 'true'
    )
    const [restoringHistory, setRestoringHistory] = useState(true)
    const [historyError, setHistoryError] = useState(false)
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [menu, setMenu] = useState<MenuItem[]>([])
    const [dataError, setDataError] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const wasLoading = useRef(false)

    useEffect(() => {
        Promise.all([callRestaurantApi(), callMenuApi()])
            .then(([restaurants, menuItems]) => {
                setRestaurant(restaurants[0] || null)
                setMenu(menuItems)
            })
            .catch(() => setDataError(true))
    }, [])

    useEffect(() => {
        let cancelled = false
        callConversationApi(conversationId)
            .then(conversation => {
                if (!cancelled) {
                    setMessages(conversation.messages.map(message => ({
                        role: message.role,
                        text: message.text,
                        createdAt: new Date(message.createdAt),
                        toolCalls: message.toolCalls,
                    })))
                }
            })
            .catch(() => {
                if (!cancelled) setHistoryError(true)
            })
            .finally(() => {
                if (!cancelled) setRestoringHistory(false)
            })

        return () => { cancelled = true }
    }, [conversationId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    useEffect(() => {
        if (wasLoading.current && !loading && !chatEnded && !restoringHistory) {
            inputRef.current?.focus()
        }
        wasLoading.current = loading
    }, [loading, chatEnded, restoringHistory])

    async function sendMessage(event: FormEvent, value = input) {
        event.preventDefault()
        const text = value.trim()
        if (!text || loading || restoringHistory || chatEnded) return

        const userMessage: Message = { role: 'user', text, createdAt: new Date() }
        const history = [...messages, userMessage]
        setMessages(history)
        setInput('')
        setLoading(true)

        try {
            const response = await callChatApi(history.map(message => ({ role: message.role, text: message.text })), conversationId)
            const availabilityWasChecked = response.toolCalls?.some(tool => tool.tool === 'availability' && tool.status === 'completed')
            setMessages(current => [...current, { role: 'assistant', text: response.reply || response.message, createdAt: new Date(), fallback: response.fallback, tables: availabilityWasChecked ? response.conversationState?.availableTables : undefined }])
        } catch {
            setMessages(current => [...current, { role: 'assistant', text: "I'm having trouble connecting to Kaveri right now. Please try again in a moment.", createdAt: new Date() }])
        } finally {
            setLoading(false)
        }
    }

    function endChat() {
        if (loading || restoringHistory) return
        window.localStorage.setItem(`kaveri-chat-ended:${conversationId}`, 'true')
        setChatEnded(true)
    }

    function startNewChat() {
        const newConversationId = crypto.randomUUID()
        window.localStorage.setItem('kaveri-conversation-id', newConversationId)
        setConversationId(newConversationId)
        setMessages([])
        setInput('')
        setHistoryError(false)
        setRestoringHistory(true)
        setChatEnded(false)
    }

    return <div className="app-shell">
        <aside className="brand-rail">
            <div><div className="brand-mark">K</div><p className="brand-name">Kaveri</p><p className="brand-caption">Restaurant concierge</p></div>
            <nav className="rail-nav" aria-label="Main navigation">
                <button className="rail-link active" aria-label="Concierge chat"><span>✦</span><small>Concierge</small></button>
                <button className="rail-link" aria-label="Explore menu"><span>◌</span><small>Menu</small></button>
                <button className="rail-link" aria-label="Reservations"><span>⌁</span><small>Bookings</small></button>
            </nav>
            <div className="rail-footer"><span className="status-dot" /> Open today<br /><strong>11:00 - 23:00</strong></div>
        </aside>

        <main className="chat-column">
            <header className="chat-header"><div className="assistant-avatar">K</div><div><p className="eyebrow">Your dining guide</p><h1>Kaveri Concierge</h1></div><div className="online-pill"><span className="status-dot" /> Online</div></header>
            {historyError && <p className="muted" role="alert">Previous messages could not be loaded. Your new messages can still be sent.</p>}
            <section className="conversation" aria-live="polite">
                {restoringHistory ? <div className="welcome-panel"><p className="eyebrow">Restoring conversation</p></div> : messages.length === 0 ? <div className="welcome-panel"><p className="eyebrow">Welcome to Kaveri</p><h2>Let’s find your<br /><em>next favourite.</em></h2><p className="welcome-copy">Ask about our menu, discover a dish, or let us arrange your table.</p><div className="prompt-grid">{prompts.map(prompt => <button key={prompt.icon} onClick={event => sendMessage(event, prompt.value)} disabled={chatEnded || loading || restoringHistory}><span>{prompt.icon}</span>{prompt.label}<b>↗</b></button>)}</div></div> : messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.createdAt.toISOString()}-${index}`}>
                    {message.role === 'assistant' && <div className="message-avatar">K</div>}
                    <div className="message-wrap"><div className="message-bubble">{message.text}</div>{message.toolCalls && message.toolCalls.length > 0 && <small className="tool-trace">Agent actions: {message.toolCalls.map(tool => `${tool.tool} · ${tool.status}`).join(' / ')}</small>}{message.fallback && <small className="fallback-note">Limited response mode: the AI service is unavailable.</small>}{message.tables && message.tables.length > 0 && <div className="availability-card"><p className="eyebrow">Available tables</p>{message.tables.map(table => <div className="table-option" key={table.tableId}><span>{table.tableNumber}</span><strong>Table for {table.capacity}</strong><small>{table.area.replace('_', ' ')}</small></div>)}</div>}<time>{formatTime(message.createdAt)}</time></div>
                </div>)}
                {loading && <div className="message-row assistant"><div className="message-avatar">K</div><div className="typing" aria-label="Kaveri AI is thinking"><i /><i /><i /></div></div>}
                <div ref={messagesEndRef} />
            </section>
            {!chatEnded ? <>
                <form className="composer" onSubmit={sendMessage}><input ref={inputRef} aria-label="Message Kaveri" value={input} onChange={event => setInput(event.target.value)} placeholder="Ask Kaveri anything..." disabled={loading || restoringHistory} /><button type="submit" aria-label="Send message" disabled={loading || restoringHistory || !input.trim()}>↗</button></form>
                <p className="composer-note">Kaveri uses the restaurant’s live menu and availability.</p>
                <div className="chat-actions"><button type="button" className="end-chat-button" onClick={endChat} disabled={loading || restoringHistory}>End chat</button></div>
            </> : <div className="ended-chat-panel" role="status">
                <p>This chat has ended. Your conversation is saved.</p>
                <button type="button" className="new-chat-button" onClick={startNewChat}>Start new chat</button>
            </div>}
        </main>

        <aside className="context-panel">
            <div className="context-section restaurant-summary"><div className="section-heading"><span className="eyebrow">Tonight at</span><span className="rating">★ {restaurant?.rating?.toFixed(1) || '4.8'}</span></div><h2>{restaurant?.name || 'Kaveri Restaurant'}</h2><p>{restaurant?.description || 'Heritage recipes, aromatic biryanis, and warm hospitality in the heart of Hyderabad.'}</p><div className="location-line">⌖ {restaurant?.address || 'Banjara Hills, Hyderabad'}</div></div>
            <div className="context-section menu-preview"><div className="section-heading"><span className="eyebrow">From the kitchen</span><button onClick={event => sendMessage(event, 'Show me your most popular dishes')} disabled={chatEnded || loading || restoringHistory}>View all ↗</button></div>{dataError ? <p className="muted">Menu details are unavailable right now.</p> : menu.slice(0, 3).map(item => <MenuCard item={item} key={item._id} />)}</div>
            <div className="context-section reservation-note"><span className="eyebrow">Need a table?</span><p>Tell me your party size and preferred time. I’ll check live availability.</p><button onClick={event => sendMessage(event, 'I want to book a table')} disabled={chatEnded || loading || restoringHistory}>Start a booking <span>↗</span></button></div>
        </aside>
    </div>
}