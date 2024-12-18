import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String }, // Matches 'formatted_address'
  phone: { type: String }, // Matches 'formatted_phone_number'
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  place_id: { type: String, unique: true },
  google_maps_url: { type: String }, // Matches 'url'
  photos: { type: [String] }, // Array of photo URLs
  rating: { type: Number },
  total_reviews: { type: Number }, // Matches 'user_ratings_total'
  reviews: { type: [Object] }, // Full reviews
  types: { type: [String] }, // Matches 'types'
});

export default mongoose.model('Restaurant', RestaurantSchema);
