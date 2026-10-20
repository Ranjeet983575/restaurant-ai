export interface Restaurant {
    _id: string
    name: string
    description: string
    address: string
    city?: string
    country?: string
    phone: string
    email?: string
    website?: string
    cuisine: string[]
    price_range: string
    rating: number
    working_hours: Record<string, string>
    features: string[]
    parking_information?: string
    accessibility_information?: string
    dress_code?: string
    reservation_policy?: string
}

export interface MenuItem {
    _id: string
    name: string
    description: string
    price: number
    currency: string
    category: string
    section: string
    vegetarian: boolean
    vegan: boolean
    spicy_level: string
    ingredients: string[]
    allergens: string[]
    is_available: boolean
    popularity: number
    chef_recommendation: boolean
    preparation_time?: number
    image?: string
    tags: string[]
}

export interface TableOption {
    _id: string
    tableNumber: string
    capacity: number
    area: string
    tableType: string
    features: string[]
}

export interface BookingSlotAvailability {
    slotId: string
    startTime: string
    endTime: string
    label: string
    capacity: number
    status: 'available' | 'booked' | 'unavailable'
}

export interface ToolCall {
    tool: string
    status: 'completed' | 'failed' | 'needs_input' | 'not_run'
    summary: string
}

export interface ChatResponse {
    conversationId?: string
    message: string
    reply: string
    fallback?: boolean
    intent?: string
    toolCalls?: ToolCall[]
    conversationState?: {
        availableTables?: Array<{
            tableId: string
            tableNumber: string
            capacity: number
            area: string
            tableType: string
        }>
    }
}

export interface ConversationHistoryResponse {
    conversationId: string
    messages: Array<{
        role: 'user' | 'assistant'
        text: string
        createdAt: string
        toolCalls?: ToolCall[]
    }>
}

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$|\s+/g, '')
const SEARCH_URL = API_BASE.includes('/api/restaurants/menus/search')
    ? API_BASE
    : API_BASE.includes('/api/restaurants/menus')
        ? `${API_BASE.replace(/\/+$/, '')}/search`
        : `${API_BASE.replace(/\/+$/, '')}/api/restaurants/menus/search`
const CHAT_URL = `${API_BASE.replace(/\/+$/, '')}/chat`

function isTimeQuery(query: string): boolean {
    const normalized = query.toLowerCase()
    return /(hour|open|close|when.*open|when.*close|time)/.test(normalized)
}

function isOverviewQuery(query: string): boolean {
    const normalized = query.toLowerCase()
    return /(overview|about|tell me about|who are you|what is this|restaurant overview)/.test(normalized)
}

function isMenuQuery(query: string): boolean {
    const normalized = query.toLowerCase()
    return /(menu|what do you serve|show me the menu|dish|dishes|food|vegan|vegetarian|non-veg|specials)/.test(normalized)
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const resp = await fetch(url, init)
    if (!resp.ok) {
        throw new Error(`Request failed: ${resp.status}`)
    }
    const payload: unknown = await resp.json()
    if (!payload || typeof payload !== 'object' || !('data' in payload)) return payload as T
    return (payload as { data: T }).data
}

export async function callRestaurantApi(): Promise<Restaurant[]> {
    return requestJson<Restaurant[]>(`${API_BASE}/api/restaurants`)
}

export async function callMenuApi(): Promise<MenuItem[]> {
    return requestJson<MenuItem[]>(`${API_BASE}/api/restaurants/menus?available_only=true`)
}

export async function callAvailabilityApi(query: URLSearchParams): Promise<TableOption[]> {
    return requestJson<TableOption[]>(`${API_BASE}/api/tables/availability?${query.toString()}`)
}

export async function callBookingSlotAvailability(restaurantId: string, date: string): Promise<BookingSlotAvailability[]> {
    const query = new URLSearchParams({ date })
    return requestJson<BookingSlotAvailability[]>(`${API_BASE}/api/bookings/slots/${encodeURIComponent(restaurantId)}/availability?${query}`)
}

export async function callSearchApi(query: string, limit = 5): Promise<unknown> {
    const resp = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit }),
    })
    if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`search failed: ${resp.status} ${errorText}`)
    }
    return resp.json()
}

export async function callChatApi(messages: Array<{ role: string, text: string }>, conversationId: string): Promise<ChatResponse> {
    const lastMessage = messages[messages.length - 1]?.text || ''
    const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, query: lastMessage, messages, limit: 5 }),
    })
    if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`chat failed: ${resp.status} ${errorText}`)
    }
    return resp.json() as Promise<ChatResponse>
}

export async function callConversationApi(conversationId: string): Promise<ConversationHistoryResponse> {
    const resp = await fetch(`${CHAT_URL}/${encodeURIComponent(conversationId)}`)
    if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`conversation history failed: ${resp.status} ${errorText}`)
    }
    return resp.json() as Promise<ConversationHistoryResponse>
}
