import { getAllMenuItems } from '../services/restaurant.service';

export async function menuSearchTool(query: string, limit = 8) {
    const normalized = query.toLowerCase();
    const menus = await getAllMenuItems({ available_only: true });
    const filtered = menus.filter(menu => {
        const searchable = [
            menu.name,
            menu.description,
            menu.category,
            menu.section,
            ...(menu.tags || []),
            ...(menu.ingredients || []),
        ].join(' ').toLowerCase();

        if (/vegan/.test(normalized) && !menu.vegan) return false;
        if (/vegetarian|veg/.test(normalized) && !menu.vegetarian) return false;
        if (/spicy|hot|fiery/.test(normalized) && !['spicy', 'very_spicy'].includes(menu.spicy_level)) return false;
        return normalized.split(/\s+/).some(term => term.length > 2 && searchable.includes(term)) || /menu|dish|food|recommend/.test(normalized);
    });

    return filtered.slice(0, limit);
}