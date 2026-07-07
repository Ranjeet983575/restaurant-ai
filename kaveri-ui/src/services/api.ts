const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$|\s+/g, '')
const SEARCH_URL = API_BASE.includes('/api/restaurants/menus/search')
    ? API_BASE
    : API_BASE.includes('/api/restaurants/menus')
        ? `${API_BASE.replace(/\/+$/, '')}/search`
        : `${API_BASE.replace(/\/+$/, '')}/api/restaurants/menus/search`

function formatChatResponse(response: unknown): string {
    if (typeof response === 'string') return response
    if (Array.isArray(response)) {
        if (response.length === 0) return 'No results found.'
        return response
            .map(item => {
                if (item && typeof item === 'object') {
                    const menu = (item as any).menu
                    const restaurant = (item as any).restaurant
                    const menuName = menu?.name || menu?.title || menu?.item || 'Menu item'
                    const restaurantName = restaurant?.name || restaurant?.title || 'Restaurant'
                    return `- ${menuName} at ${restaurantName}`
                }
                return String(item)
            })
            .join('\n')
    }
    if (response && typeof response === 'object') {
        if ('text' in response && typeof (response as any).text === 'string') {
            return (response as any).text
        }
        if ('message' in response && typeof (response as any).message === 'string') {
            return (response as any).message
        }
        return JSON.stringify(response)
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
    return formatChatResponse(data.data || data)
}
