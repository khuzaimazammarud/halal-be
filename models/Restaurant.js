const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String }, 
  phone: { type: String }, 
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }, 
  place_id: { type: String, unique: true },
  google_maps_url: { type: String }, 
  photos: { type: [String] }, 
  rating: { type: Number },
  total_reviews: { type: Number }, 
  reviews: { type: [Object] }, 
  types: { type: [String] }, 
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a 2dsphere index on the location field
RestaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("Restaurant", RestaurantSchema);
