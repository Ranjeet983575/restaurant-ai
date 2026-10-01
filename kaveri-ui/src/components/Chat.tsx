import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { callChatApi, callMenuApi, callRestaurantApi, ChatResponse, MenuItem, Restaurant } from '../services/api'

type Message = {
    role: 'user' | 'assistant'
    text: string
    createdAt: Date
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
    const conversationId = useMemo(getConversationId, [])
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
    const [menu, setMenu] = useState<MenuItem[]>([])
    const [dataError, setDataError] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        Promise.all([callRestaurantApi(), callMenuApi()])
            .then(([restaurants, menuItems]) => {
                setRestaurant(restaurants[0] || null)
                setMenu(menuItems)
            })
            .catch(() => setDataError(true))
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    async function sendMessage(event: FormEvent, value = input) {
        event.preventDefault()
        const text = value.trim()
        if (!text || loading) return

        const userMessage: Message = { role: 'user', text, createdAt: new Date() }
        const history = [...messages, userMessage]
        setMessages(history)
        setInput('')
        setLoading(true)

        try {
            const response = await callChatApi(history.map(message => ({ role: message.role, text: message.text })), conversationId)
            const availabilityWasChecked = response.toolCalls?.some(tool => tool.tool === 'availability' && tool.status === 'completed')
            setMessages(current => [...current, { role: 'assistant', text: response.reply || response.message, createdAt: new Date(), tables: availabilityWasChecked ? response.conversationState?.availableTables : undefined }])
        } catch {
            setMessages(current => [...current, { role: 'assistant', text: "I'm having trouble connecting to Kaveri right now. Please try again in a moment.", createdAt: new Date() }])
        } finally {
            setLoading(false)
        }
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
            <section className="conversation" aria-live="polite">
                {messages.length === 0 ? <div className="welcome-panel"><p className="eyebrow">Welcome to Kaveri</p><h2>Let’s find your<br /><em>next favourite.</em></h2><p className="welcome-copy">Ask about our menu, discover a dish, or let us arrange your table.</p><div className="prompt-grid">{prompts.map(prompt => <button key={prompt.icon} onClick={event => sendMessage(event, prompt.value)}><span>{prompt.icon}</span>{prompt.label}<b>↗</b></button>)}</div></div> : messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.createdAt.toISOString()}-${index}`}>
                    {message.role === 'assistant' && <div className="message-avatar">K</div>}
                    <div className="message-wrap"><div className="message-bubble">{message.text}</div>{message.tables && message.tables.length > 0 && <div className="availability-card"><p className="eyebrow">Available tables</p>{message.tables.map(table => <div className="table-option" key={table.tableId}><span>{table.tableNumber}</span><strong>Table for {table.capacity}</strong><small>{table.area.replace('_', ' ')}</small></div>)}</div>}<time>{formatTime(message.createdAt)}</time></div>
                </div>)}
                {loading && <div className="message-row assistant"><div className="message-avatar">K</div><div className="typing" aria-label="Kaveri AI is thinking"><i /><i /><i /></div></div>}
                <div ref={messagesEndRef} />
            </section>
            <form className="composer" onSubmit={sendMessage}><input aria-label="Message Kaveri" value={input} onChange={event => setInput(event.target.value)} placeholder="Ask Kaveri anything..." disabled={loading} /><button type="submit" aria-label="Send message" disabled={loading || !input.trim()}>↗</button></form>
            <p className="composer-note">Kaveri uses the restaurant’s live menu and availability.</p>
        </main>

        <aside className="context-panel">
            <div className="context-section restaurant-summary"><div className="section-heading"><span className="eyebrow">Tonight at</span><span className="rating">★ {restaurant?.rating?.toFixed(1) || '4.8'}</span></div><h2>{restaurant?.name || 'Kaveri Restaurant'}</h2><p>{restaurant?.description || 'Heritage recipes, aromatic biryanis, and warm hospitality in the heart of Hyderabad.'}</p><div className="location-line">⌖ {restaurant?.address || 'Banjara Hills, Hyderabad'}</div></div>
            <div className="context-section menu-preview"><div className="section-heading"><span className="eyebrow">From the kitchen</span><button onClick={event => sendMessage(event, 'Show me your most popular dishes')}>View all ↗</button></div>{dataError ? <p className="muted">Menu details are unavailable right now.</p> : menu.slice(0, 3).map(item => <MenuCard item={item} key={item._id} />)}</div>
            <div className="context-section reservation-note"><span className="eyebrow">Need a table?</span><p>Tell me your party size and preferred time. I’ll check live availability.</p><button onClick={event => sendMessage(event, 'I want to book a table')}>Start a booking <span>↗</span></button></div>
        </aside>
    </div>
}