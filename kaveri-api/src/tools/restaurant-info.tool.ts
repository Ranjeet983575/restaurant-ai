import { getAllRestaurants } from '../services/restaurant.service';

export async function restaurantInfoTool() {
    const restaurants = await getAllRestaurants();
    return restaurants.map(restaurant => ({
        id: restaurant._id.toString(),
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        city: restaurant.city,
        country: restaurant.country,
        phone: restaurant.phone,
        email: restaurant.email,
        website: restaurant.website,
        cuisine: restaurant.cuisine,
        priceRange: restaurant.price_range,
        rating: restaurant.rating,
        workingHours: restaurant.working_hours,
        weeklySchedule: restaurant.weekly_schedule,
        features: restaurant.features,
        parkingInformation: restaurant.parking_information,
        accessibilityInformation: restaurant.accessibility_information,
        dressCode: restaurant.dress_code,
        reservationPolicy: restaurant.reservation_policy,
        cancellationPolicy: restaurant.cancellation_policy,
    }));
}