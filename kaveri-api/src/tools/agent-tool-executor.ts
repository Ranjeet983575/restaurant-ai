import { menuSearchTool } from './menu-search.tool';
import { restaurantInfoTool } from './restaurant-info.tool';

export async function executeConciergeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (name === 'menu_search') {
        const unexpectedKeys = Object.keys(args).filter(key => key !== 'query');
        if (unexpectedKeys.length > 0) {
            throw new Error('menu_search accepts only a query argument.');
        }
        if (typeof args.query !== 'string' || !args.query.trim() || args.query.length > 300) {
            throw new Error('menu_search requires a non-empty query of at most 300 characters.');
        }

        const items = await menuSearchTool(args.query.trim(), 8);
        return items.map(item => ({
            name: item.name,
            description: item.description,
            price: item.price,
            currency: item.currency,
            category: item.category,
            vegetarian: item.vegetarian,
            vegan: item.vegan,
            spicyLevel: item.spicy_level,
            ingredients: item.ingredients?.length ? item.ingredients : 'not provided',
            allergens: item.allergens?.length ? item.allergens : 'not provided',
            available: item.is_available,
        }));
    }

    if (name === 'restaurant_info') {
        if (Object.keys(args).length > 0) {
            throw new Error('restaurant_info does not accept arguments.');
        }
        return restaurantInfoTool();
    }

    throw new Error(`Tool "${name}" is not available.`);
}
