const axios = require("axios");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Restaurant = require("../models/Restaurant.js");
const restaurantNames = require("../resturantsName/resturants.js");
console.log(
  "🚀 ~ file: fetchRestaurantData.js:5 ~ restaurantNames:",
  restaurantNames
);

dotenv.config();

// Google API Key from .env file
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
};

// // Function to fetch place ID
const getPlaceId = async (restaurantName) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${restaurantName}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    return response.data.candidates.map((place) => place.place_id);
  } catch (error) {
    console.error(
      `Error fetching place ID for ${restaurantName}:`,
      error.message
    );
    return [];
  }
};

// Function to fetch place details
const getPlaceDetails = async (placeId) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,opening_hours,formatted_phone_number,photos,rating,reviews,user_ratings_total,website,types,url,place_id&key=${GOOGLE_API_KEY}`;
    const response = await axios.get(url);
    return response.data.result;
  } catch (error) {
    console.error(
      `Error fetching details for place ID ${placeId}:`,
      error.message
    );
    return null;
  }
};

// Function to save or update restaurant data
const saveRestaurant = async (apiResponse) => {
  try {
    const details = {
      name: apiResponse.name || "",
      address: apiResponse.formatted_address || "",
      phone: apiResponse.formatted_phone_number || "",
      location: apiResponse.geometry?.location || { lat: null, lng: null },
      place_id: apiResponse.place_id || "",
      google_maps_url: apiResponse.url || "",
      photos: apiResponse.photos
        ? apiResponse.photos.map((photo) => {
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`;
          })
        : [],
      rating: apiResponse.rating || 0,
      total_reviews: apiResponse.user_ratings_total || 0,
      reviews: apiResponse.reviews || [],
      types: apiResponse.types || [],
    };

    // Save or update the record in MongoDB
    await Restaurant.findOneAndUpdate(
      { place_id: details.place_id },
      { $set: details },
      { upsert: true, new: true }
    );

    console.log(`Saved/Updated restaurant: ${details.name}`);
  } catch (error) {
    console.error(`Error saving restaurant data:`, error.message);
  }
};

// Main job function
const updateRestaurantData = async () => {
  await connectDB();
  console.log("Starting job...");

  for (const restaurant of restaurantNames) {
    console.log(`Fetching data for: ${restaurant}`);

    const placeIds = await getPlaceId(restaurant);
    if (placeIds.length === 0) {
      console.log(`No place IDs found for: ${restaurant}`);
      continue;
    }

    for (const placeId of placeIds) {
      const details = await getPlaceDetails(placeId);
      console.log("🚀 ~ file: fetchRestaurantData.js:100 ~ details:", details);
      if (details) {
        await saveRestaurant(details);
      }
    }
  }
  mongoose.connection.close();
  console.log("Job completed successfully.");
};

// Run the job
updateRestaurantData();
