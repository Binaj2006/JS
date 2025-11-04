const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Profile stats
  followers: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  views: { type: Number, default: 0 },

  // Profile picture
  profilePicture: { type: String, default: '' },

  // Uploaded videos
  uploads: [
    {
      title: String,
      videoUrl: String,
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      uploadDate: String
    }
  ]
});

module.exports = mongoose.model('User', userSchema);