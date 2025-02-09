const axios = require("axios");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Restaurant = require("../models/Restaurant.js");
const restaurantNames = require("../resturantsName/resturants.js");
const AWS = require('aws-sdk'); // You'll need to add this dependency

dotenv.config();

console.log(process.env.AWS_ACCESS_KEY_ID);
console.log(process.env.AWS_SECRET_ACCESS_KEY);
console.log(process.env.AWS_REGION);
console.log(process.env.AWS_S3_BUCKET);


// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
console.log(
  "🚀 ~ file: fetchRestaurantData.js:5 ~ restaurantNames:",
  restaurantNames
);


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

async function uploadImageToS3(photoUrl, restaurantId, index) {
  try {
    const response = await axios({
      url: photoUrl,
      responseType: 'arraybuffer'
    });

    const fileName = `restaurants/${restaurantId}/photo_${index}.jpg`;
    await s3.upload({
      Bucket: "halal-db",
      Key: fileName,
      Body: response.data,
      ContentType: 'image/jpeg',
    }).promise();

    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    return null;
  }
}

const saveRestaurant = async (apiResponse) => {
  try {
    const details = {
      name: apiResponse.name || "",
      address: apiResponse.formatted_address || "",
      phone: apiResponse.formatted_phone_number || "",
      location: apiResponse.geometry?.location || { lat: null, lng: null },
      place_id: apiResponse.place_id || "",
      google_maps_url: apiResponse.url || "",
      rating: apiResponse.rating || 0,
      total_reviews: apiResponse.user_ratings_total || 0,
      reviews: apiResponse.reviews || [],
      types: apiResponse.types || [],
      photos: apiResponse.photos
        ? apiResponse.photos.map((photo) => {
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`;
          })
        : [],
    };

    // Check if restaurant already exists
    let existingRestaurant = await Restaurant.findOne({ place_id: details.place_id });

    if (existingRestaurant && existingRestaurant.photos_s3 && existingRestaurant.photos_s3.length > 0) {
      // If restaurant exists and has S3 photos, keep them
      details.photos_s3 = existingRestaurant.photos_s3;
    } else if (apiResponse.photos) {
      // Process only up to 3 photos for S3
      const photoPromises = apiResponse.photos.slice(0, 3).map(async (photo, index) => {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`;
        return uploadImageToS3(photoUrl, details.place_id, index);
      });

      // Wait for all photos to be uploaded and filter out any failed uploads
      const uploadedPhotos = await Promise.all(photoPromises);
      details.photos_s3 = uploadedPhotos.filter(url => url !== null);
    }

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
