"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const restaurant_service_1 = require("../services/restaurant.service");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/restaurants:
 *   get:
 *     summary: Get all restaurants
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: List of restaurants
 */
router.get('/', async (_req, res) => {
    try {
        const restaurants = await (0, restaurant_service_1.getAllRestaurants)();
        res.json({ success: true, data: restaurants });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});
/**
 * @openapi
 * /api/restaurants/bulk:
 *   post:
 *     summary: Bulk insert restaurants with menus
 *     tags: [Restaurants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurants]
 *             properties:
 *               restaurants:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/RestaurantCreateRequest'
 *     responses:
 *       201:
 *         description: Restaurants created successfully
 */
router.post('/bulk', async (req, res) => {
    try {
        const { restaurants } = req.body;
        if (!Array.isArray(restaurants) || restaurants.length === 0) {
            res.status(400).json({ success: false, error: 'restaurants array is required' });
            return;
        }
        const created = await (0, restaurant_service_1.bulkCreateRestaurants)(restaurants);
        res.status(201).json({ success: true, count: created.length, data: created });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});
/**
 * @openapi
 * /api/restaurants/search:
 *   post:
 *     summary: Semantic search for restaurants and menu items
 *     tags: [Restaurants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: spicy vegetarian biryani
 *               limit:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/search', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;
        if (!query || typeof query !== 'string') {
            res.status(400).json({ success: false, error: 'Query is required' });
            return;
        }
        const results = await (0, restaurant_service_1.semanticSearchRestaurants)(query, limit);
        res.json({ success: true, data: results });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Search error' });
    }
});
/**
 * @openapi
 * /api/restaurants/menus/search:
 *   post:
 *     summary: Semantic search for menu items
 *     tags: [Menus]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: spicy vegetarian biryani
 *               limit:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Menu search results
 */
router.post('/menus/search', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;
        if (!query || typeof query !== 'string') {
            res.status(400).json({ success: false, error: 'Query is required' });
            return;
        }
        const results = await (0, restaurant_service_1.semanticSearchMenusWithContext)(query, limit);
        res.json({ success: true, data: results });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Search error' });
    }
});
/**
 * @openapi
 * /api/restaurants/filter:
 *   get:
 *     summary: Filter restaurants by cuisine, location, price range, rating, or tags
 *     tags: [Restaurants]
 *     parameters:
 *       - in: query
 *         name: cuisine
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: price_range
 *         schema:
 *           type: string
 *       - in: query
 *         name: min_rating
 *         schema:
 *           type: number
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Filtered restaurants
 */
router.get('/filter', async (req, res) => {
    try {
        const restaurants = await (0, restaurant_service_1.filterRestaurants)({
            cuisine: req.query.cuisine,
            location: req.query.location,
            price_range: req.query.price_range,
            min_rating: req.query.min_rating ? Number(req.query.min_rating) : undefined,
            tags: req.query.tags ? req.query.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
        });
        res.json({ success: true, data: restaurants });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Filter error' });
    }
});
/**
 * @openapi
 * /api/restaurants/menus:
 *   get:
 *     summary: Get all menu items
 *     tags: [Menus]
 *     responses:
 *       200:
 *         description: List of all menu items
 */
router.get('/menus', async (_req, res) => {
    try {
        const menus = await (0, restaurant_service_1.getAllMenuItems)();
        res.json({ success: true, data: menus });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});
/**
 * @openapi
 * /api/restaurants/{id}/menus:
 *   get:
 *     summary: Get menu items for a restaurant
 *     tags: [Menus]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant menu items
 *       404:
 *         description: Restaurant not found
 */
router.get('/:id/menus', async (req, res) => {
    try {
        const menus = await (0, restaurant_service_1.getMenuItemsByRestaurant)(req.params.id);
        res.json({ success: true, data: menus });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});
/**
 * @openapi
 * /api/restaurants/{id}:
 *   get:
 *     summary: Get a restaurant by ID
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant found
 *       404:
 *         description: Restaurant not found
 */
router.get('/:id', async (req, res) => {
    try {
        const restaurant = await (0, restaurant_service_1.getRestaurantById)(req.params.id);
        if (!restaurant) {
            res.status(404).json({ success: false, error: 'Restaurant not found' });
            return;
        }
        res.json({ success: true, data: restaurant });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});
/**
 * @openapi
 * /api/restaurants:
 *   post:
 *     summary: Create a restaurant
 *     tags: [Restaurants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestaurantCreateRequest'
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 */
router.post('/', async (req, res) => {
    try {
        const restaurant = await (0, restaurant_service_1.createRestaurant)(req.body);
        res.status(201).json({ success: true, data: restaurant });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});
/**
 * @openapi
 * /api/restaurants/{id}/menus:
 *   post:
 *     summary: Add a menu item to a restaurant
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItemInput'
 *     responses:
 *       201:
 *         description: Menu item added
 */
router.post('/:id/menus', async (req, res) => {
    try {
        const restaurant = await (0, restaurant_service_1.addMenuItem)(req.params.id, req.body);
        if (!restaurant) {
            res.status(404).json({ success: false, error: 'Restaurant not found' });
            return;
        }
        res.status(201).json({ success: true, data: restaurant });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});
/**
 * @openapi
 * /api/restaurants/{id}/menus/{menuId}:
 *   put:
 *     summary: Update a menu item
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItemInput'
 *     responses:
 *       200:
 *         description: Menu item updated
 */
router.put('/:id/menus/:menuId', async (req, res) => {
    try {
        const restaurant = await (0, restaurant_service_1.updateMenuItem)(req.params.id, req.params.menuId, req.body);
        if (!restaurant) {
            res.status(404).json({ success: false, error: 'Restaurant or menu item not found' });
            return;
        }
        res.json({ success: true, data: restaurant });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});
/**
 * @openapi
 * /api/restaurants/{id}/menus/{menuId}:
 *   delete:
 *     summary: Delete a menu item
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item deleted
 */
router.delete('/:id/menus/:menuId', async (req, res) => {
    try {
        const restaurant = await (0, restaurant_service_1.deleteMenuItem)(req.params.id, req.params.menuId);
        if (!restaurant) {
            res.status(404).json({ success: false, error: 'Restaurant or menu item not found' });
            return;
        }
        res.json({ success: true, data: restaurant });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});
/**
 * @openapi
 * /api/restaurants/{id}:
 *   put:
 *     summary: Update a restaurant
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestaurantCreateRequest'
 *     responses:
 *       200:
 *         description: Restaurant updated
 */
router.put('/:id', async (req, res) => {
    try {
        const restaurant = await (0, restaurant_service_1.updateRestaurant)(req.params.id, req.body);
        if (!restaurant) {
            res.status(404).json({ success: false, error: 'Restaurant not found' });
            return;
        }
        res.json({ success: true, data: restaurant });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});
/**
 * @openapi
 * /api/restaurants/{id}:
 *   delete:
 *     summary: Delete a restaurant
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant deleted
 */
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await (0, restaurant_service_1.deleteRestaurant)(req.params.id);
        if (!deleted) {
            res.status(404).json({ success: false, error: 'Restaurant not found' });
            return;
        }
        res.json({ success: true, message: 'Restaurant deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Server error' });
    }
});
exports.default = router;
