const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$|\s+/g, '')
const SEARCH_URL = API_BASE.includes('/api/restaurants/menus/search')
    ? API_BASE
    : API_BASE.includes('/api/restaurants/menus')
        ? `${API_BASE.replace(/\/+$/, '')}/search`
        : `${API_BASE.replace(/\/+$/, '')}/api/restaurants/menus/search`

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

function summarizeItems(items: any[]): string[] {
    return items.slice(0, 5).map(item => {
        const menu = item?.menu
        const restaurant = item?.restaurant
        const menuName = menu?.name || menu?.title || menu?.item || 'menu item'
        const restaurantName = restaurant?.name || restaurant?.title || 'restaurant'
        return `${menuName} at ${restaurantName}`
    })
}

function formatChatResponse(response: unknown, query: string): string {
    if (typeof response === 'string') return response

    if (Array.isArray(response)) {
        if (response.length === 0) return 'I could not find any matching menu items.'
        const items = summarizeItems(response)
        if (isTimeQuery(query)) {
            return 'Kaveri Restaurant is open daily from 10 AM to 10 PM.'
        }
        if (isOverviewQuery(query)) {
            return `Kaveri Restaurant is a popular restaurant with dishes such as ${items.join(', ')}.`
        }
        if (isMenuQuery(query)) {
            return `Here are some menu items that match your request: ${items.join(', ')}.`
        }
        return `I found these relevant items: ${items.join(', ')}.`
    }

    if (response && typeof response === 'object') {
        if ('text' in response && typeof (response as any).text === 'string') {
            return (response as any).text
        }
        if ('message' in response && typeof (response as any).message === 'string') {
            return (response as any).message
        }
        return 'I got a response, but it could not be displayed as text.'
    }

    return String(response)
}

export async function callSearchApi(query: string, limit = 5) {
    const resp = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit }),
    })
    if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`search failed: ${resp.status} ${errorText}`)
    }
    const data = await resp.json()
    return data.data || data
}

export async function callChatApi(messages: Array<{ role: string, text: string }>) {
    const lastMessage = messages[messages.length - 1]?.text || ''
    const resp = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: lastMessage, limit: 5 }),
    })
    if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`chat failed: ${resp.status} ${errorText}`)
    }
    const data = await resp.json()
    return formatChatResponse(data.data || data, lastMessage)
}
