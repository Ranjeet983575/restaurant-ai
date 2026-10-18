# Kaveri Restaurant API

A TypeScript-based backend for the Kaveri restaurant experience with MongoDB storage, semantic search, and rich menu management. It uses vector embeddings so users can search food items and restaurants using natural language.

## Product Prompt

The complete product requirements and implementation direction are maintained in the [Kaveri AI Master Development Prompt](prompt.md). Keep that document and this README together: the prompt describes the product goals, while this README describes the current runnable implementation.

## Features

- **Restaurant CRUD API** - Create, read, update, and delete restaurants
- **Menu Management** - Manage detailed dishes with sections such as appetizers, main course, freshment, and drinks
- **Bulk Insert** - Seed multiple restaurants with full menu data in one request
- **Semantic Search** - Search restaurants and dishes using natural language
- **Vector Embeddings** - Each restaurant stores a semantic embedding for similarity search
- **Restaurant Concierge Chat** - MongoDB-backed conversation state with intent and tool metadata
- **Table Availability** - Table-aware availability checks and reservation-safe booking fields
- **Bounded tool-calling agent** - Groq selects approved menu or restaurant read tools; tool results are returned to the model before it answers
- **Human-confirmed reservations** - Booking details and live availability are validated by the API, and a reservation is created only after explicit confirmation
- **Automatic Seeding** - Restaurants, menus, profiles, booking slots, and tables are seeded at startup
- **Swagger UI** - Interactive API documentation

## Data Model

### Restaurant Fields
- `name` - Restaurant name
- `cuisine` - Array of cuisine types
- `description` - Restaurant description
- `location` - City/Area
- `address` - Full address
- `phone` - Contact number
- `price_range` - budget | moderate | expensive | luxury
- `rating` - 0-5 stars
- `tags` - Array of tags
- `menus` - Array of menu items
- `working_hours` - Business hours for each day
- `city`, `country`, `email`, `website`, `latitude`, `longitude`
- `features`, `parking_information`, `accessibility_information`
- `dress_code`, `reservation_policy`, `cancellation_policy`
- `vector_embedding` - Auto-generated semantic embedding

### Menu Item Fields
- `name` - Dish name
- `description` - Dish description
- `price` - Price in local currency
- `section` - appetizer | main_course | freshment | drink | dessert | starter | appetizer
- `category` - Street Food | Curries | Biryanis | Breads | Rice | Desserts | Cool Drinks | etc.
- `vegetarian` - true/false
- `vegan` - true/false
- `currency` - Currency code, default `INR`
- `spicy_level` - mild | medium | spicy | very_spicy
- `ingredients` and `allergens` - Structured dietary information
- `is_available` - true/false
- `popularity` and `chef_recommendation`
- `preparation_time` - Estimated prep time in minutes
- `calories` and `image` when available
- `tags` - Additional searchable tags

## Setup

### Prerequisites
- Node.js 16+
- MongoDB (local or Atlas)

### Installation

```bash
cd kaveri-api
npm install

# Create .env file
cp .env.example .env

# Add your environment values
MONGODB_URI=mongodb://localhost:27017/kaveri-db
PORT=3000
SKIP_SEED=false
```

### Run Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`
Swagger UI at `http://localhost:3000/api-docs`

### Chat API

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"demo-1","query":"Show me vegetarian dishes"}'
```

The response includes `reply`, `intent`, `toolCalls`, and persisted `conversationState`. Conversation history is stored in MongoDB when `conversationId` is supplied.

The chat client can restore a saved conversation with `GET /chat/{conversationId}`. Recent turns are included in subsequent LLM requests for follow-up questions; the model receives only the latest 12 stored messages, while the API keeps up to 200 messages per conversation.

## Concierge agent architecture

The concierge uses a **bounded, tool-using LLM agent for read-only discovery**, with a deterministic application workflow for reservation writes:

```text
React chat
  -> POST /chat (conversationId + latest turn)
  -> load recent messages and persisted booking state from MongoDB
  -> classify the task and retrieve trusted restaurant/menu context
  -> Groq chooses an allow-listed read tool when needed
       menu_search(query) | restaurant_info()
  -> API validates arguments, runs the tool, and returns its result to Groq
  -> Groq writes the grounded response
  -> API persists the messages and workflow state

Reservation flow (application controlled):
  collect date/time/party size -> check live availability -> select table
  -> collect name and phone or email -> show confirmation summary
  -> explicit customer confirmation -> recheck availability -> create booking
```

The model cannot create a reservation through function calling. Booking creation is a side effect, so only the backend workflow may call the reservation service, and only after required fields, the selected table, and an explicit confirmation have been validated. The booking response is generated from the persisted booking result, rather than trusting the model to claim success.

Implementation details:

- Tool schemas live in `src/tools/agent-tools.ts`; only the API-owned dispatcher in `src/tools/agent-tool-executor.ts` can execute them. Arguments are parsed and validated server-side.
- The agent allows at most three tool rounds in one request and caps the text returned by tools. Tool names are filtered by task intent.
- The last 12 stored messages are provided to the LLM; older chat remains in MongoDB and can be restored in the UI, but is not automatically part of the model context.
- Groq tool-calling requests require `GROQ_API_KEY` and a compatible `GROQ_MODEL`. If the LLM is unavailable, the API falls back to deterministic responses and reports `fallback: true`.
- `conversationState.bookingDraft` contains workflow data, while restaurant/menu facts and availability are loaded from their backing services. The LLM is not the source of truth for bookings.

This is a deliberately bounded agentic design suitable for a concierge MVP/demo. Before production reservations, use an atomic database strategy or transaction/index design to prevent two concurrent confirmations from booking the same table and time.

## Sample Data - Kaveri Restaurant

A richer sample dataset is available in `sample-data-kaveri.json` with a complete Kaveri-style restaurant menu covering:

- Appetizers and street food
- Main course curries and biryanis
- Vegetarian options
- Rice, breads, desserts, and drinks

This file is ready for bulk insertion into the `kaveri-db` database.

## API Endpoints

### Restaurant Endpoints

#### Insert Single Restaurant with Menus
```bash
curl -X POST http://localhost:3000/api/restaurants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kaveri Restaurant",
    "cuisine": ["Indian", "Hyderabadi"],
    "description": "Fine Indian dining with rich curries and heritage biryani",
    "location": "Hyderabad",
    "address": "12-3-123, Banjara Hills, Hyderabad 500034",
    "phone": "+91-40-23456789",
    "price_range": "moderate",
    "rating": 4.8,
    "tags": ["family-friendly", "biryani"],
    "menus": [
      {
        "name": "Chicken Dum Biryani",
        "description": "Aromatic basmati rice layered with slow-cooked chicken",
        "price": 340,
        "section": "main_course",
        "category": "Biryanis",
        "vegetarian": false,
        "spicy_level": "medium"
      }
    ]
  }'
```

#### Insert Multiple Restaurants (Bulk)
```bash
curl -X POST http://localhost:3000/api/restaurants/bulk \
  -H "Content-Type: application/json" \
  -d @sample-data-kaveri.json
```

#### Semantic Search
```bash
curl -X POST http://localhost:3000/api/restaurants/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "spicy vegetarian biryani and desserts",
    "limit": 5
  }'
```

#### Filter Restaurants
```bash
curl "http://localhost:3000/api/restaurants/filter?cuisine=Indian&location=Hyderabad&price_range=moderate&min_rating=4.5"
```

#### Filter Menu Items

```bash
curl "http://localhost:3000/api/restaurants/menus?vegetarian=true&available_only=true&max_price=350"
```

#### Check Table Availability

```bash
curl "http://localhost:3000/api/tables/availability?restaurantId={id}&bookingDate=2026-10-02&startTime=19:00&partySize=4"
```

#### CRUD
```bash
curl http://localhost:3000/api/restaurants
curl http://localhost:3000/api/restaurants/{id}
curl -X PUT http://localhost:3000/api/restaurants/{id} -H "Content-Type: application/json" -d '{"rating": 4.9}'
curl -X DELETE http://localhost:3000/api/restaurants/{id}
```

#### Menu Item Operations
```bash
curl -X POST http://localhost:3000/api/restaurants/{id}/menus -H "Content-Type: application/json" -d '{"name":"Masala Tea","description":"Spiced Indian tea","price":60,"section":"drink","category":"Tea","vegetarian":true,"spicy_level":"mild"}'
curl -X PUT http://localhost:3000/api/restaurants/{id}/menus/{menuId} -H "Content-Type: application/json" -d '{"price":70}'
curl -X DELETE http://localhost:3000/api/restaurants/{id}/menus/{menuId}
```

## Quick Start Guide

### 1. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**MongoDB Atlas:**
- Update MONGODB_URI in .env with your connection string

### 2. Start Development Server
```bash
npm run dev
```

### 3. Insert Sample Data

**Option A: Using bulk insert endpoint**
```bash
curl -X POST http://localhost:3000/api/restaurants/bulk \
  -H "Content-Type: application/json" \
  -d @sample-data-kaveri.json
```

**Option B: Using Swagger UI**
1. Open http://localhost:3000/api-docs
2. Navigate to POST /api/restaurants/bulk
3. Copy data from sample-data-kaveri.json into the request body
4. Click Execute

### 4. Test Semantic Search

```bash
# Search for biryani
curl -X POST http://localhost:3000/api/restaurants/search \
  -H "Content-Type: application/json" \
  -d '{"query": "biryani", "limit": 5}'

# Search for vegetarian restaurants
curl -X POST http://localhost:3000/api/restaurants/search \
  -H "Content-Type: application/json" \
  -d '{"query": "vegetarian", "limit": 5}'

# Search for spicy curries
curl -X POST http://localhost:3000/api/restaurants/search \
  -H "Content-Type: application/json" \
  -d '{"query": "spicy curries and desserts", "limit": 5}'
```

### 5. Test Filter Search

```bash
# Find moderate restaurants in Hyderabad
curl "http://localhost:3000/api/restaurants/filter?location=Hyderabad&price_range=moderate"

# Find high-rated vegetarian-friendly restaurants
curl "http://localhost:3000/api/restaurants/filter?min_rating=4.5&tags=vegetarian-friendly"
```

## Project Structure

```
src/
├── config/
│   ├── mongodb.ts       - MongoDB connection
│   └── swagger.ts       - Swagger/OpenAPI documentation
├── models/
│   ├── restaurant.model.ts - Restaurant schema
│   ├── menu.model.ts       - Menu schema
│   ├── table.model.ts      - Seating schema
│   └── conversation.model.ts - Chat history and state
├── services/
│   ├── embedding.service.ts - Sentence Transformer embeddings
│   ├── restaurant.service.ts - Restaurant CRUD, filters, and semantic search
│   ├── booking.service.ts - Profiles, slots, availability, and bookings
│   └── chat.service.ts - Conversation orchestration
├── tools/
│   ├── restaurant-info.tool.ts
│   ├── menu-search.tool.ts
│   ├── availability.tool.ts
│   └── reservation.tool.ts
├── routes/
│   ├── restaurant.routes.ts - Restaurant and menu endpoints
│   ├── table.routes.ts - Table availability endpoint
│   └── chat.routes.ts - Concierge chat endpoint
├── scripts/
│   └── seed.ts                   - Automatic sample data seeding
├── index.ts                      - Main server file
├── package.json                  - Dependencies
├── tsconfig.json                 - TypeScript configuration
└── sample-data-kaveri.json       - Sample Kaveri restaurant menu data

## Technologies Used

- **Express.js** (v4.19.2) - REST API framework
- **TypeScript** (v5.7.3) - Type-safe JavaScript
- **MongoDB & Mongoose** (v8.0.0) - Database and ODM
- **@xenova/transformers** (v2.6.4) - Sentence embeddings
- **Swagger/OpenAPI** - API documentation
- **tsx** - TypeScript execution

## Environment Variables

```
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/kaveri-db

# Server Configuration
PORT=3000
SKIP_SEED=false
```

## API Response Examples

### Successful Bulk Insert
```json
{
  "success": true,
  "data": {
    "total_requested": 6,
    "created_count": 6,
    "error_count": 0,
    "restaurants": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Hyderabadi Delights",
        "cuisine": ["Indian", "Hyderabadi"],
        "menus": [
          {
            "name": "Chicken Biryani",
            "description": "...",
            "price": 250,
            "category": "Main Course",
            "vegetarian": false,
            "spicy_level": "medium"
          }
        ],
        "rating": 4.7
      }
    ]
  }
}
```

### Successful Search
```json
{
  "success": true,
  "data": {
    "query": "biryani",
    "results_count": 5,
    "results": [
      {
        "restaurant": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Hyderabadi Delights",
          "cuisine": ["Indian", "Hyderabadi"],
          "menus": [...],
          "rating": 4.7
        },
        "similarity_score": 0.85
      }
    ]
  }
}
```

## Testing with Swagger UI

1. Navigate to `http://localhost:3000/api-docs`
2. Click on any endpoint to expand it
3. Click "Try it out" button
4. Modify the request body as needed
5. Click "Execute" to test

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- For Atlas, whitelist your IP address

### Embedding Model Not Loading
- First request takes 30-50 seconds to download the model
- Wait for "✓ Model loaded" message in console
- Model is cached globally after first load

## License

MIT

## Sample Restaurant Data for Testing

Here's test data you can insert into the database:

### Single Restaurant Insert
```json
{
  "name": "Green Garden Cafe",
  "cuisine": ["vegetarian", "vegan"],
  "description": "Healthy organic vegetarian restaurant with fresh ingredients and sustainable practices",
  "location": "Downtown",
  "address": "123 Main St",
  "phone": "555-1234",
  "price_range": "moderate",
  "rating": 4.5,
  "tags": ["organic", "healthy", "eco-friendly", "vegetarian"],
  "working_hours": {
    "monday_to_friday": "9:00 AM - 9:00 PM",
    "saturday": "10:00 AM - 10:00 PM",
    "sunday": "11:00 AM - 8:00 PM"
  }
}
```

### Complete Bulk Insert (6 Restaurants)

```json
{
  "restaurants": [
    {
      "name": "Green Garden Cafe",
      "cuisine": ["vegetarian", "vegan"],
      "description": "Healthy organic vegetarian restaurant with fresh ingredients and sustainable practices",
      "location": "Downtown",
      "address": "123 Main St",
      "phone": "555-1234",
      "price_range": "moderate",
      "rating": 4.5,
      "tags": ["organic", "healthy", "eco-friendly"]
    },
    {
      "name": "Spice Palace",
      "cuisine": ["Indian", "Asian"],
      "description": "Authentic Indian cuisine with traditional recipes and spices imported from India",
      "location": "East Side",
      "address": "456 Oak Ave",
      "phone": "555-5678",
      "price_range": "budget",
      "rating": 4.2,
      "tags": ["spicy", "authentic", "family-friendly", "traditional"]
    },
    {
      "name": "Bella Italia",
      "cuisine": ["Italian"],
      "description": "Fine dining Italian restaurant with handmade pasta, imported wines, and romantic ambiance",
      "location": "Midtown",
      "address": "789 Pine Rd",
      "phone": "555-9012",
      "price_range": "expensive",
      "rating": 4.8,
      "tags": ["elegant", "romantic", "fine-dining", "upscale"]
    },
    {
      "name": "Taco Fiesta",
      "cuisine": ["Mexican"],
      "description": "Casual Mexican restaurant with fresh tacos, burritos, and homemade salsas",
      "location": "West End",
      "address": "321 Elm St",
      "phone": "555-3456",
      "price_range": "budget",
      "rating": 4.0,
      "tags": ["casual", "fast-food", "fresh", "colorful"]
    },
    {
      "name": "Sushi Supreme",
      "cuisine": ["Japanese", "Sushi"],
      "description": "Premium sushi and Japanese cuisine prepared by master chefs with premium ingredients",
      "location": "Harbor",
      "address": "654 Beach Blvd",
      "phone": "555-7890",
      "price_range": "luxury",
      "rating": 4.9,
      "tags": ["premium", "sushi", "authentic", "masterchef"]
    },
    {
      "name": "Buddha Bowl",
      "cuisine": ["vegetarian", "asian-fusion"],
      "description": "Healthy bowls with organic vegetables, tofu, and nutrient-packed grains",
      "location": "North District",
      "address": "987 Maple Lane",
      "phone": "555-2345",
      "price_range": "moderate",
      "rating": 4.3,
      "tags": ["healthy", "vegan", "bowls", "nutritious"]
    }
  ]
}
```

## Testing Queries

### Semantic Search Examples

Try these natural language queries to test semantic search:

```bash
# Search 1: Vegetarian restaurants
curl -X POST http://localhost:3000/api/restaurants/search \
  -H "Content-Type: application/json" \
  -d '{"query": "vegetarian restaurants with healthy food", "limit": 5}'

# Search 2: Premium dining
curl -X POST http://localhost:3000/api/restaurants/search \
  -H "Content-Type: application/json" \
  -d '{"query": "rich biryani and spicy curries", "limit": 5}'

# Search 3: Desserts and drinks
curl -X POST http://localhost:3000/api/restaurants/search \
  -H "Content-Type: application/json" \
  -d '{"query": "desserts and refreshing drinks", "limit": 5}'
```

## Project Structure

```
src/
├── config/
│   ├── mongodb.ts           # MongoDB connection
│   └── swagger.ts           # Swagger/OpenAPI config
├── models/
│   └── restaurant.model.ts  # Restaurant and menu schema
├── services/
│   ├── embedding.service.ts  # Sentence transformer embeddings
│   └── restaurant.service.ts # Restaurant CRUD, bulk insert, and search
├── routes/
│   └── restaurant.routes.ts # Restaurant and menu endpoints
├── scripts/
│   └── seed.ts              # Automatic sample-data seeding
└── index.ts                 # Main server entrypoint
```

## Technologies Used

- **Express.js** - REST API framework
- **TypeScript** - Type safety
- **MongoDB** - Database with Mongoose ODM
- **Sentence Transformers** - Vector embeddings for semantic search
- **Swagger** - API documentation

## Environment Variables

```
# .env file
MONGODB_URI=mongodb://localhost:27017/kaveri-db
PORT=3000
SKIP_SEED=false
```

## Quick Start Guide

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```

3. **Insert Sample Data**
   - Use Swagger UI at http://localhost:3000/api-docs
   - Or use bulk insert curl command above

4. **Test Semantic Search**
   - Use search endpoint with natural language queries
   - Try "vegetarian restaurants", "expensive fine dining", etc.

## License

MIT
