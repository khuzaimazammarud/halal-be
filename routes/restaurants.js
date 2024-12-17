const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');

const router = express.Router();

/**
 * 1. List Nearby Restaurants with Pagination
 * GET /api/restaurants/nearby
 * Query Params: lat, lng, radius, page, limit
 */
router.get('/restaurants/nearby', async (req, res) => {
  const { lat, lng, radius = 5000, page = 1, limit = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude (lat) and longitude (lng) are required.' });
  }

  try {
    const parsedRadius = parseInt(radius);
    const parsedLimit = parseInt(limit);
    const skip = (page - 1) * parsedLimit;

    const restaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parsedRadius
        }
      }
    })
      .skip(skip)
      .limit(parsedLimit);

    const total = await Restaurant.countDocuments({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parsedRadius
        }
      }
    });

    res.json({
      message: `Restaurants within ${radius} meters.`,
      page: parseInt(page),
      limit: parsedLimit,
      total,
      results: restaurants,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Server error while fetching nearby restaurants.' });
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
