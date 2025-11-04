const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const videoSchema = new mongoose.Schema({
  title: String,
  description: String,
  videoUrl: String,
  hashtags: [String], // ← NEW
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  uploadDate: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Video', videoSchema);
const Comment = require('../models/Comments');

router.post('/video/:id/comment', async (req, res) => {
  const comment = new Comment({
    text: req.body.text,
    user: req.user.id,
    video: req.params.id
  });
  await comment.save();
  res.json({ success: true });
});

router.get('/video/:id/comments', async (req, res) => {
  const comments = await Comment.find({ video: req.params.id }).populate('user', 'username');
  res.json(comments);
});
router.get('/latest', async (req, res) => {
  try {
    const videos = await Video.find()
      .sort({ uploadDate: -1 })
      .limit(12); // adjust number as needed
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest videos' });
  }
});
router.put('/video/:id/download', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    video.downloads += 1;
    await video.save();
    res.json({ success: true, downloads: video.downloads });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track download' });
  }
});
