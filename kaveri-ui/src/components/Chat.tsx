import React, { FormEvent, useEffect, useRef, useState } from 'react'
import { BookingSlotAvailability, callAvailabilityApi, callBookingSlotAvailability, callChatApi, callConversationApi, callMenuApi, callRestaurantApi, ChatResponse, MenuItem, Restaurant, TableOption } from '../services/api'

type Message = {
    role: 'user' | 'assistant'
    text: string
    createdAt: Date
    fallback?: boolean
    toolCalls?: ChatResponse['toolCalls']
    tables?: NonNullable<ChatResponse['conversationState']>['availableTables']
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

function getLocalDateInputValue(): string {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60_000
    return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function toLocalTimeInputValue(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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
    const [activeSection, setActiveSection] = useState<'concierge' | 'menu' | 'bookings'>('concierge')
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
    const [bookingDate, setBookingDate] = useState(getLocalDateInputValue)
    const [bookingTime, setBookingTime] = useState('19:00')
    const [partySize, setPartySize] = useState('2')
    const [availableTables, setAvailableTables] = useState<TableOption[] | null>(null)
    const [checkingAvailability, setCheckingAvailability] = useState(false)
    const [availabilityError, setAvailabilityError] = useState('')
    const [dailySlots, setDailySlots] = useState<BookingSlotAvailability[] | null>(null)
    const [dailySlotsError, setDailySlotsError] = useState('')
    const [currentTime, setCurrentTime] = useState(() => new Date())
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const wasLoading = useRef(false)
    const dailySlotStatuses = (dailySlots || []).map(slot => ({
        ...slot,
        displayStatus: bookingDate === getLocalDateInputValue() && slot.startTime <= toLocalTimeInputValue(currentTime)
            ? 'past' as const
            : slot.status,
    }))
    const visibleDailySlots = dailySlotStatuses.filter(slot =>
        slot.displayStatus === 'available' || slot.displayStatus === 'booked'
    )
    const slotCounts = {
        available: visibleDailySlots.filter(slot => slot.displayStatus === 'available').length,
        booked: visibleDailySlots.filter(slot => slot.displayStatus === 'booked').length,
    }

    useEffect(() => {
        Promise.all([callRestaurantApi(), callMenuApi()])
            .then(([restaurants, menuItems]) => {
                setRestaurant(restaurants[0] || null)
                setMenu(menuItems)
            })
            .catch(() => setDataError(true))
    }, [])

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000)
        return () => window.clearInterval(timer)
    }, [])

    useEffect(() => {
        if (!restaurant) return
        let cancelled = false
        setDailySlots(null)
        setDailySlotsError('')
        callBookingSlotAvailability(restaurant._id, bookingDate)
            .then(slots => {
                if (!cancelled) setDailySlots(slots)
            })
            .catch(error => {
                if (!cancelled) setDailySlotsError(error instanceof Error ? error.message : 'Could not load booking slots.')
            })
        return () => { cancelled = true }
    }, [restaurant, bookingDate])

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

    useEffect(() => {
        if (activeSection === 'concierge' && input && !chatEnded && !loading && !restoringHistory) {
            inputRef.current?.focus()
        }
    }, [activeSection, input, chatEnded, loading, restoringHistory])

    async function submitMessage(value: string) {
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

    function sendMessage(event: FormEvent, value = input) {
        event.preventDefault()
        void submitMessage(value)
    }

    function askAboutDish(dishName: string) {
        setActiveSection('concierge')
        const question = `Tell me about ${dishName}`
        if (chatEnded) {
            startNewChat(question)
        } else {
            setInput(question)
        }
    }

    async function checkAvailability(event: FormEvent) {
        event.preventDefault()
        if (bookingDate === getLocalDateInputValue() && bookingTime <= toLocalTimeInputValue(currentTime)) {
            setAvailabilityError('That time has already passed. Please choose a later time.')
            setAvailableTables(null)
            return
        }
        if (!restaurant) {
            setAvailabilityError('Restaurant details are unavailable, so we cannot check tables right now.')
            return
        }

        setCheckingAvailability(true)
        setAvailabilityError('')
        setAvailableTables(null)
        try {
            const query = new URLSearchParams({
                restaurantId: restaurant._id,
                bookingDate,
                startTime: bookingTime,
                partySize,
            })
            setAvailableTables(await callAvailabilityApi(query))
        } catch (error) {
            setAvailabilityError(error instanceof Error ? error.message : 'Could not check table availability.')
        } finally {
            setCheckingAvailability(false)
        }
    }

    function endChat() {
        if (loading || restoringHistory) return
        window.localStorage.setItem(`kaveri-chat-ended:${conversationId}`, 'true')
        setChatEnded(true)
    }

    function startNewChat(initialInput = '') {
        const newConversationId = crypto.randomUUID()
        window.localStorage.setItem('kaveri-conversation-id', newConversationId)
        setConversationId(newConversationId)
        setMessages([])
        setInput(initialInput)
        setHistoryError(false)
        setRestoringHistory(true)
        setChatEnded(false)
    }

    return <div className={`app-shell${activeSection === 'concierge' ? '' : ' app-shell-page'}`}>
        <aside className="brand-rail">
            <div><div className="brand-mark">K</div><p className="brand-name">Kaveri</p><p className="brand-caption">Restaurant concierge</p></div>
            <nav className="rail-nav" aria-label="Main navigation">
                <button className={`rail-link${activeSection === 'concierge' ? ' active' : ''}`} aria-label="Concierge chat" aria-current={activeSection === 'concierge' ? 'page' : undefined} onClick={() => setActiveSection('concierge')}><span>✦</span><small>Concierge</small></button>
                <button className={`rail-link${activeSection === 'menu' ? ' active' : ''}`} aria-label="Explore menu" aria-current={activeSection === 'menu' ? 'page' : undefined} onClick={() => setActiveSection('menu')}><span>◌</span><small>Menu</small></button>
                <button className={`rail-link${activeSection === 'bookings' ? ' active' : ''}`} aria-label="Reservations" aria-current={activeSection === 'bookings' ? 'page' : undefined} onClick={() => setActiveSection('bookings')}><span>⌁</span><small>Bookings</small></button>
            </nav>
            <div className="rail-footer"><span className="status-dot" /> Open today<br /><strong>11:00 - 23:00</strong></div>
        </aside>

        <main className={`chat-column${activeSection === 'concierge' ? '' : ' page-column'}`}>
            <header className="chat-header"><div className="assistant-avatar">K</div><div><p className="eyebrow">{activeSection === 'concierge' ? 'Your dining guide' : activeSection === 'menu' ? 'Made fresh at Kaveri' : 'Plan your visit'}</p><h1>{activeSection === 'concierge' ? 'Kaveri Concierge' : activeSection === 'menu' ? 'Our menu' : 'Book a table'}</h1></div>{activeSection === 'concierge' && <div className="online-pill"><span className="status-dot" /> Online</div>}</header>
            {activeSection === 'concierge' ? <>
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
                    <button type="button" className="new-chat-button" onClick={() => startNewChat()}>Start new chat</button>
                </div>}
            </> : activeSection === 'menu' ? <section className="content-page menu-page">
                <div className="page-intro"><p className="eyebrow">From our kitchen</p><h2>Something good is cooking.</h2><p>Browse Kaveri’s available dishes, with ingredients and dietary details to help you choose.</p></div>
                {dataError ? <p className="page-message" role="alert">Menu details are unavailable right now. Please try again later.</p> : menu.length === 0 ? <p className="page-message">There are no available menu items to show right now.</p> : <div className="full-menu-grid">{menu.map(item => <article className="full-menu-card" key={item._id}>
                    {item.image && <img src={item.image} alt="" loading="lazy" />}
                    <div className="full-menu-card-content"><div className="full-menu-card-heading"><span className="menu-category">{item.category || item.section}</span>{item.chef_recommendation && <span className="chef-mark">Chef pick</span>}</div>
                        <h3>{item.name}</h3><p>{item.description}</p>
                        <div className="menu-tags">{item.vegetarian && <span>Vegetarian</span>}{item.vegan && <span>Vegan</span>}{item.spicy_level && item.spicy_level.toLowerCase() !== 'mild' && <span>{item.spicy_level} spice</span>}{item.preparation_time && <span>{item.preparation_time} min</span>}</div>
                        {item.allergens?.length > 0 && <p className="menu-allergens">Allergens: {item.allergens.join(', ')}</p>}
                        <div className="full-menu-card-footer"><strong>{item.currency === 'INR' ? '₹' : item.currency} {item.price}</strong><button type="button" onClick={() => askAboutDish(item.name)} disabled={loading || restoringHistory}>Ask about this dish <span>↗</span></button></div>
                    </div>
                </article>)}</div>}
            </section> : <section className="content-page booking-page">
                <div className="page-intro"><p className="eyebrow">A table at Kaveri</p><h2>Make an evening of it.</h2><p>Choose your date, preferred time, and party size to see tables available for your visit.</p></div>
                <section className="daily-slots-section" aria-live="polite">
                    <div className="daily-slots-heading"><div><p className="eyebrow">Reservation schedule</p><h3>Slots for {new Date(`${bookingDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3></div><div className="slot-legend"><span><i className="slot-dot available" /> Available ({slotCounts.available})</span><span><i className="slot-dot booked" /> Booked ({slotCounts.booked})</span></div></div>
                    {!restaurant && !dataError && <p className="availability-feedback">Loading restaurant schedule…</p>}
                    {dailySlotsError && <p className="availability-feedback error" role="alert">{dailySlotsError}</p>}
                    {dailySlots && dailySlots.length === 0 && <p className="availability-feedback">No reservation slots are configured for this date.</p>}
                    {dailySlots && dailySlots.length > 0 && visibleDailySlots.length === 0 && <p className="availability-feedback">No free or booked slots remain for this date.</p>}
                    {visibleDailySlots.length > 0 && <div className="daily-slots-grid">{visibleDailySlots.map(slot => <article className={`daily-slot-card ${slot.displayStatus}`} key={slot.slotId}>
                        <div><strong>{slot.label}</strong><span>{slot.capacity} seats</span></div>
                        <span className="slot-status">{slot.displayStatus === 'available' ? 'Available' : 'Booked'}</span>
                        {slot.displayStatus === 'available' && <button type="button" onClick={() => { setBookingTime(slot.startTime); setAvailableTables(null); setAvailabilityError('') }}>Choose this time</button>}
                    </article>)}</div>}
                </section>
                <form className="availability-form" onSubmit={checkAvailability}>
                    <label>Guests<input type="number" min="1" max="20" required value={partySize} onChange={event => setPartySize(event.target.value)} /></label>
                    <label>Date<input type="date" min={getLocalDateInputValue()} required value={bookingDate} onChange={event => setBookingDate(event.target.value)} /></label>
                    <label>Preferred time<input type="time" min={bookingDate === getLocalDateInputValue() ? toLocalTimeInputValue(currentTime) : undefined} required value={bookingTime} onChange={event => setBookingTime(event.target.value)} /></label>
                    <button className="primary-action" type="submit" disabled={checkingAvailability || !restaurant}>{checkingAvailability ? 'Checking availability…' : 'Check table availability'} <span>↗</span></button>
                </form>
                {availabilityError && <p className="availability-feedback error" role="alert">{availabilityError}</p>}
                {availableTables !== null && <div className="availability-results" aria-live="polite">
                    <p className="eyebrow">{availableTables.length ? `${availableTables.length} available ${availableTables.length === 1 ? 'table' : 'tables'}` : 'No tables available'}</p>
                    {availableTables.length === 0 ? <p className="availability-feedback">No tables match that date, time, and party size. Try another time or a smaller group.</p> : <div className="booking-table-grid">{availableTables.map(table => <article className="booking-table-card" key={table._id}><span className="eyebrow">{table.area.replace(/_/g, ' ')}</span><h3>Table {table.tableNumber}</h3><p>Seats up to {table.capacity} · {table.tableType.replace(/_/g, ' ')}</p>{table.features.length > 0 && <small>{table.features.join(' · ')}</small>}</article>)}</div>}
                </div>}
                <div className="booking-info-grid">
                    <article className="booking-info-card"><span className="eyebrow">Find us</span><h3>{restaurant?.name || 'Kaveri Restaurant'}</h3><p>{restaurant?.address || 'Restaurant address unavailable.'}</p>{restaurant?.phone && <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>}</article>
                    <article className="booking-info-card"><span className="eyebrow">Opening hours</span><div className="hours-list">{restaurant?.working_hours && Object.entries(restaurant.working_hours).length > 0 ? Object.entries(restaurant.working_hours).map(([day, hours]) => <div key={day}><span>{day.replace(/_/g, ' ')}</span><strong>{hours}</strong></div>) : <p>Opening hours are not available right now.</p>}</div></article>
                    <article className="booking-info-card"><span className="eyebrow">Reservation policy</span><p>{restaurant?.reservation_policy || 'Ask our concierge about reservation details when you start your booking.'}</p></article>
                    <article className="booking-info-card booking-help-card"><span className="eyebrow">What you’ll need</span><p>Party size, preferred date and time, and a contact name. We’ll show available tables before asking you to confirm.</p></article>
                </div>
            </section>}
        </main>

        <aside className={`context-panel${activeSection === 'concierge' ? '' : ' context-panel-hidden'}`}>
            <div className="context-section restaurant-summary"><div className="section-heading"><span className="eyebrow">Tonight at</span><span className="rating">★ {restaurant?.rating?.toFixed(1) || '4.8'}</span></div><h2>{restaurant?.name || 'Kaveri Restaurant'}</h2><p>{restaurant?.description || 'Heritage recipes, aromatic biryanis, and warm hospitality in the heart of Hyderabad.'}</p><div className="location-line">⌖ {restaurant?.address || 'Banjara Hills, Hyderabad'}</div></div>
            <div className="context-section menu-preview"><div className="section-heading"><span className="eyebrow">From the kitchen</span><button onClick={event => sendMessage(event, 'Show me your most popular dishes')} disabled={chatEnded || loading || restoringHistory}>View all ↗</button></div>{dataError ? <p className="muted">Menu details are unavailable right now.</p> : menu.slice(0, 3).map(item => <MenuCard item={item} key={item._id} />)}</div>
            <div className="context-section reservation-note"><span className="eyebrow">Need a table?</span><p>Tell me your party size and preferred time. I’ll check live availability.</p><button onClick={event => sendMessage(event, 'I want to book a table')} disabled={chatEnded || loading || restoringHistory}>Start a booking <span>↗</span></button></div>
        </aside>
    </div>
}