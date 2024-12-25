const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');

const router = express.Router();

/**
 * 1. List Nearby Restaurants with Pagination
 * GET /api/restaurants/nearby
 * Query Params: lat, lng, radius, page, limit
 */
const milesToRange = (lat, lng, radiusInMiles) => {
  const latitudeChange = radiusInMiles / 69; // Approx. miles to degrees for latitude
  const longitudeChange = radiusInMiles / (69 * Math.cos((lat * Math.PI) / 180)); // Adjust for longitude based on latitude

  return {
    minLat: lat - latitudeChange,
    maxLat: lat + latitudeChange,
    minLng: lng - longitudeChange,
    maxLng: lng + longitudeChange,
  };
};

// Example usage
router.get('/restaurants/nearby', async (req, res) => {
  const { lat, lng, radius = 500, page = 1, limit = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude (lat) and longitude (lng) are required.' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radiusInMiles = parseFloat(radius);
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  
  // Calculate the range
  const { minLat, maxLat, minLng, maxLng } = milesToRange(latitude, longitude, radiusInMiles);

  try {
    // Query for restaurants within the range with pagination
    const restaurants = await Restaurant.find({
      'location.lat': { $gte: minLat, $lte: maxLat }, // Latitude range
      'location.lng': { $gte: minLng, $lte: maxLng }, // Longitude range
    })
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit);

    const total = await Restaurant.countDocuments({
      'location.lat': { $gte: minLat, $lte: maxLat }, // Latitude range
      'location.lng': { $gte: minLng, $lte: maxLng }, // Longitude range
    });

    res.json({
      message: `Restaurants within ${radiusInMiles} miles.`,
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
      results: restaurants,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error while fetching nearby restaurants.' });
  }
});

router.get('/restaurants/locations', async (req, res) => {
  try {
    // Fetch required fields from the database
    const restaurants = await Restaurant.find();
    console.log("🚀 ~ file: restaurants.js:134 ~ restaurants:", restaurants)

    // Transform the results into a cleaner format if needed
    const results = restaurants.map((restaurant) => ({
      name: restaurant.name,
      latitude: restaurant.location?.lat,
      longitude: restaurant.location?.lng,
      googleMapsUrl: restaurant.google_maps_url,
    }));

    res.json({
      message: 'List of all restaurants with names, coordinates, and Google Maps URLs.',
      total: results.length,
      results,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error while fetching restaurant locations.' });
  }
});


/**
 * 2. Get Restaurant by ID
 * GET /api/restaurants/:id
 */
router.get('/restaurants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }
    
    res.json({ message: 'Restaurant details', restaurant });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error while fetching restaurant details.' });
  }
});

/**
 * 3. Search Restaurants by Name
 * GET /api/restaurants/search
 * Query Params: query, page, limit
 */
router.get('/restaurants/search', async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    const parsedLimit = parseInt(limit);
    const skip = (page - 1) * parsedLimit;

    const restaurants = await Restaurant.find({
      name: { $regex: query, $options: 'i' }
    })
      .skip(skip)
      .limit(parsedLimit);

    const total = await Restaurant.countDocuments({
      name: { $regex: query, $options: 'i' }
    });

    res.json({
      message: `Search results for: ${query}`,
      page: parseInt(page),
      limit: parsedLimit,
      total,
      results: restaurants,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error while searching for restaurants.' });
  }
});


module.exports = router;
