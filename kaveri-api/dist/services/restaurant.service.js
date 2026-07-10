"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRestaurant = createRestaurant;
exports.updateRestaurant = updateRestaurant;
exports.deleteRestaurant = deleteRestaurant;
exports.addMenuItem = addMenuItem;
exports.updateMenuItem = updateMenuItem;
exports.deleteMenuItem = deleteMenuItem;
exports.getRestaurantById = getRestaurantById;
exports.getMenuItemsByRestaurant = getMenuItemsByRestaurant;
exports.getAllMenuItems = getAllMenuItems;
exports.getAllRestaurants = getAllRestaurants;
exports.bulkCreateRestaurants = bulkCreateRestaurants;
exports.semanticSearchMenusWithContext = semanticSearchMenusWithContext;
exports.semanticSearchRestaurants = semanticSearchRestaurants;
exports.semanticSearchMenus = semanticSearchMenus;
exports.filterRestaurants = filterRestaurants;
const restaurant_model_1 = require("../models/restaurant.model");
const menu_model_1 = require("../models/menu.model");
const embedding_service_1 = require("./embedding.service");
function sanitizeMenuSearchResult(result) {
    return {
        similarity_score: result.similarity_score,
        menu: {
            _id: result.menu._id.toString(),
            restaurantId: result.menu.restaurantId.toString(),
            restaurantName: result.menu.restaurantName,
            name: result.menu.name,
            description: result.menu.description,
            price: result.menu.price,
            section: result.menu.section,
            category: result.menu.category,
            vegetarian: result.menu.vegetarian,
            spicy_level: result.menu.spicy_level,
            is_available: result.menu.is_available,
            preparation_time: result.menu.preparation_time,
            tags: result.menu.tags,
        },
        restaurant: {
            _id: result.restaurant._id.toString(),
            name: result.restaurant.name,
            cuisine: result.restaurant.cuisine,
            description: result.restaurant.description,
            location: result.restaurant.location,
            address: result.restaurant.address,
            phone: result.restaurant.phone,
            price_range: result.restaurant.price_range,
            rating: result.restaurant.rating,
            tags: result.restaurant.tags,
            working_hours: result.restaurant.working_hours,
        },
    };
}
async function ensureRestaurantEmbedding(restaurant) {
    if (!restaurant.vector_embedding || restaurant.vector_embedding.length === 0) {
        try {
            restaurant.vector_embedding = await (0, embedding_service_1.generateRestaurantEmbedding)({
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                description: restaurant.description,
                location: restaurant.location,
                tags: restaurant.tags,
                menus: [],
            });
            await restaurant.save();
        }
        catch (error) {
            console.warn(`Skipping restaurant embedding for ${restaurant.name}:`, error);
            restaurant.vector_embedding = [];
            await restaurant.save();
        }
    }
}
async function ensureMenuEmbedding(menu) {
    if (!menu.vector_embedding || menu.vector_embedding.length === 0) {
        try {
            menu.vector_embedding = await (0, embedding_service_1.generateMenuEmbedding)({
                name: menu.name,
                description: menu.description,
                section: menu.section,
                category: menu.category,
                vegetarian: menu.vegetarian,
                spicy_level: menu.spicy_level,
                tags: menu.tags,
            });
            await menu.save();
        }
        catch (error) {
            console.warn(`Skipping menu embedding for ${menu.name}:`, error);
            menu.vector_embedding = [];
            await menu.save();
        }
    }
}
/**
 * Create a new restaurant with generated embedding
 */
async function createRestaurant(input) {
    try {
        const restaurant = new restaurant_model_1.Restaurant({
            ...input,
            menus: [],
            vector_embedding: [],
        });
        await restaurant.save();
        await ensureRestaurantEmbedding(restaurant);
        if (input.menus && input.menus.length > 0) {
            for (const menuInput of input.menus) {
                const menu = new menu_model_1.Menu({
                    restaurantId: restaurant._id,
                    restaurantName: restaurant.name,
                    ...menuInput,
                    vector_embedding: [],
                });
                await menu.save();
                await ensureMenuEmbedding(menu);
            }
        }
        return restaurant;
    }
    catch (error) {
        throw new Error(`Failed to create restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Update an existing restaurant and regenerate embedding
 */
async function updateRestaurant(id, input) {
    try {
        const restaurant = await restaurant_model_1.Restaurant.findById(id);
        if (!restaurant) {
            return null;
        }
        // Update fields
        Object.assign(restaurant, input);
        // Regenerate embedding if relevant fields changed
        if (input.name || input.cuisine || input.description || input.location || input.tags) {
            await ensureRestaurantEmbedding(restaurant);
        }
        await restaurant.save();
        return restaurant;
    }
    catch (error) {
        throw new Error(`Failed to update restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Delete a restaurant
 */
async function deleteRestaurant(id) {
    try {
        const result = await restaurant_model_1.Restaurant.findByIdAndDelete(id);
        return result !== null;
    }
    catch (error) {
        throw new Error(`Failed to delete restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function addMenuItem(restaurantId, input) {
    try {
        const restaurant = await restaurant_model_1.Restaurant.findById(restaurantId);
        if (!restaurant)
            return null;
        const menu = new menu_model_1.Menu({
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            ...input,
            vector_embedding: [],
        });
        await menu.save();
        await ensureMenuEmbedding(menu);
        return menu;
    }
    catch (error) {
        throw new Error(`Failed to add menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function updateMenuItem(restaurantId, menuId, input) {
    try {
        const menuItem = await menu_model_1.Menu.findOne({ _id: menuId, restaurantId });
        if (!menuItem)
            return null;
        Object.assign(menuItem, input);
        menuItem.vector_embedding = [];
        await menuItem.save();
        await ensureMenuEmbedding(menuItem);
        return menuItem;
    }
    catch (error) {
        throw new Error(`Failed to update menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function deleteMenuItem(restaurantId, menuId) {
    try {
        const result = await menu_model_1.Menu.findOneAndDelete({ _id: menuId, restaurantId });
        return result !== null;
    }
    catch (error) {
        throw new Error(`Failed to delete menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Get restaurant by ID
 */
async function getRestaurantById(id) {
    try {
        return await restaurant_model_1.Restaurant.findById(id);
    }
    catch (error) {
        throw new Error(`Failed to fetch restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function getMenuItemsByRestaurant(restaurantId) {
    try {
        return await menu_model_1.Menu.find({ restaurantId }).sort({ createdAt: -1 });
    }
    catch (error) {
        throw new Error(`Failed to fetch menu items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function getAllMenuItems() {
    try {
        return await menu_model_1.Menu.find().sort({ createdAt: -1 });
    }
    catch (error) {
        throw new Error(`Failed to fetch all menu items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Get all restaurants
 */
async function getAllRestaurants() {
    try {
        return await restaurant_model_1.Restaurant.find().sort({ createdAt: -1 });
    }
    catch (error) {
        throw new Error(`Failed to fetch restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function bulkCreateRestaurants(inputs) {
    try {
        const createdRestaurants = [];
        for (const input of inputs) {
            const restaurant = await createRestaurant(input);
            createdRestaurants.push(restaurant);
        }
        return createdRestaurants;
    }
    catch (error) {
        throw new Error(`Failed to bulk create restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function isTimeQuery(query) {
    const normalized = query.toLowerCase();
    return /\b(hour|hours|open|close|time|opening|closing)\b/.test(normalized);
}
function isOverviewQuery(query) {
    const normalized = query.toLowerCase();
    return /\b(overview|about|tell me about|who are you|what is this|restaurant overview|describe)\b/.test(normalized);
}
function isMenuQuery(query) {
    const normalized = query.toLowerCase();
    return /\b(menu|what do you serve|show me the menu|dish|dishes|food|vegan|vegetarian|non-veg|specials|recommend)\b/.test(normalized);
}
function isVegetarianQuery(query) {
    const normalized = query.toLowerCase();
    return /\b(vegan|vegetarian|veg|vegetarian-friendly|plant[- ]based)\b/.test(normalized);
}
function isVeganQuery(query) {
    const normalized = query.toLowerCase();
    return /\b(vegan|plant[- ]based)\b/.test(normalized);
}
function isNonVegetarianQuery(query) {
    const normalized = query.toLowerCase();
    return /\b(non[- ]veg|nonveg|non vegetarian|non-vegetarian|meat|chicken|mutton|fish|seafood)\b/.test(normalized);
}
function isDietQuery(query) {
    return isVegetarianQuery(query) || isVeganQuery(query) || isNonVegetarianQuery(query) || /\b(gluten[- ]free|halal|healthy|spicy|mild|medium)\b/.test(query.toLowerCase());
}
function formatWorkingHours(restaurant) {
    if (!restaurant) {
        return 'Restaurant hours are not available right now.';
    }
    return `Our hours are ${restaurant.working_hours.monday_to_friday} Monday through Friday, ${restaurant.working_hours.saturday} on Saturday, and ${restaurant.working_hours.sunday} on Sunday.`;
}
function summarizeMenuItems(items, limit = 5) {
    return items.slice(0, limit).map(item => {
        const menuName = item.menu.name || 'Menu item';
        const restaurantName = item.restaurant.name || 'Restaurant';
        return `${menuName} at ${restaurantName}`;
    });
}
async function semanticSearchMenusWithContext(query, limit = 10) {
    const rawResults = await semanticSearchMenus(query, limit);
    const restaurant = await restaurant_model_1.Restaurant.findOne();
    const results = rawResults.map(sanitizeMenuSearchResult);
    if (isTimeQuery(query)) {
        return {
            intent: 'hours',
            query,
            text: formatWorkingHours(restaurant),
            items: results,
        };
    }
    if (isOverviewQuery(query)) {
        const popularItems = summarizeMenuItems(results, 5);
        const description = restaurant?.description || 'This restaurant offers a selection of popular dishes and a warm atmosphere.';
        const summary = popularItems.length
            ? `${description} Popular menu items include ${popularItems.join(', ')}.`
            : description;
        return {
            intent: 'overview',
            query,
            text: summary,
            items: results,
        };
    }
    if (results.length === 0) {
        const fallbackText = isMenuQuery(query)
            ? 'I could not find matching menu items for your request. Try asking about another dish or menu type.'
            : 'I could not find any matching menu items for your request. Try a different search phrase or ask about our hours or specialties.';
        return {
            intent: isMenuQuery(query) ? 'menu' : 'other',
            query,
            text: fallbackText,
            items: [],
        };
    }
    const vegetarianResults = results.filter(item => item.menu.vegetarian === true);
    const veganResults = results.filter(item => item.menu.tags?.some(tag => /vegan/i.test(tag)) || item.menu.name.toLowerCase().includes('vegan'));
    const nonVegResults = results.filter(item => item.menu.vegetarian === false);
    let selectedResults = results;
    let filteredText = '';
    if (isVeganQuery(query)) {
        selectedResults = veganResults.length > 0 ? veganResults : vegetarianResults;
        filteredText = selectedResults.length > 0
            ? `Here are vegan-friendly items that match your request: ${summarizeMenuItems(selectedResults, 5).join(', ')}.`
            : 'I could not find clearly vegan items, but here are some vegetarian-friendly options.';
    }
    else if (isVegetarianQuery(query)) {
        selectedResults = vegetarianResults.length > 0 ? vegetarianResults : results;
        filteredText = selectedResults.length > 0
            ? `Here are vegetarian items that match your request: ${summarizeMenuItems(selectedResults, 5).join(', ')}.`
            : 'I could not find clearly vegetarian items for that request.';
    }
    else if (isNonVegetarianQuery(query)) {
        selectedResults = nonVegResults.length > 0 ? nonVegResults : results;
        filteredText = selectedResults.length > 0
            ? `Here are non-vegetarian items that match your request: ${summarizeMenuItems(selectedResults, 5).join(', ')}.`
            : 'I could not find clearly non-vegetarian items for that request.';
    }
    else {
        const items = summarizeMenuItems(results, 5);
        filteredText = isMenuQuery(query)
            ? `Here are some matching menu items: ${items.join(', ')}.`
            : `I found these relevant menu items: ${items.join(', ')}.`;
    }
    const intent = isVeganQuery(query)
        ? 'diet'
        : isVegetarianQuery(query)
            ? 'diet'
            : isNonVegetarianQuery(query)
                ? 'diet'
                : 'menu';
    return {
        intent,
        query,
        text: filteredText,
        items: selectedResults,
    };
}
async function semanticSearchRestaurants(query, limit = 10) {
    try {
        const queryEmbedding = await (0, embedding_service_1.generateEmbedding)(query);
        const allRestaurants = await restaurant_model_1.Restaurant.find();
        const results = await Promise.all(allRestaurants.map(async (restaurant) => {
            if (!restaurant.vector_embedding || restaurant.vector_embedding.length === 0) {
                await ensureRestaurantEmbedding(restaurant);
            }
            return {
                restaurant,
                similarity_score: (0, embedding_service_1.cosineSimilarity)(queryEmbedding, restaurant.vector_embedding),
            };
        }));
        return results
            .sort((a, b) => b.similarity_score - a.similarity_score)
            .slice(0, limit)
            .filter((result) => result.similarity_score > 0.2);
    }
    catch (error) {
        throw new Error(`Restaurant search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function semanticSearchMenus(query, limit = 10) {
    try {
        const queryEmbedding = await (0, embedding_service_1.generateEmbedding)(query);
        const allMenus = await menu_model_1.Menu.find();
        const results = await Promise.all(allMenus.map(async (menu) => {
            if (!menu.vector_embedding || menu.vector_embedding.length === 0) {
                await ensureMenuEmbedding(menu);
            }
            const restaurant = await restaurant_model_1.Restaurant.findById(menu.restaurantId);
            if (!restaurant)
                return null;
            return {
                menu: menu,
                restaurant: restaurant,
                similarity_score: (0, embedding_service_1.cosineSimilarity)(queryEmbedding, menu.vector_embedding),
            };
        }));
        const validResults = results.filter((result) => result !== null);
        return validResults
            .sort((a, b) => b.similarity_score - a.similarity_score)
            .slice(0, limit)
            .filter((result) => result.similarity_score > 0.2);
    }
    catch (error) {
        throw new Error(`Menu search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Search by multiple filters
 */
async function filterRestaurants(filters) {
    try {
        const query = {};
        if (filters.cuisine) {
            query.cuisine = filters.cuisine;
        }
        if (filters.location) {
            query.location = new RegExp(filters.location, 'i');
        }
        if (filters.price_range) {
            query.price_range = filters.price_range;
        }
        if (filters.min_rating) {
            query.rating = { $gte: filters.min_rating };
        }
        if (filters.tags && filters.tags.length > 0) {
            query.tags = { $in: filters.tags };
        }
        return await restaurant_model_1.Restaurant.find(query);
    }
    catch (error) {
        throw new Error(`Filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
