require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const multer = require('multer');
const upload = multer({
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB
  }
});
const path = require('path');
const app = express();
const PORT = 3000;
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Incoming token:', token); // ✅ Add this

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // ✅ Add this
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err); // ✅ Add this
    res.status(400).json({ error: 'Invalid token' });
  }
}



app.use(cors());
app.use(express.json()); // ← This line is critical
app.use(express.urlencoded({ extended: true }));
app.post('/api/upload', verifyToken, (req, res) => {
  // Your upload logic here
  res.json({ message: 'Upload successful' });
});
app.get('/api/user/profile', (req, res) => {
  res.json({
    username: "ElfMaster",
    followers: 312,
    uploads: [
      {
        title: "Elf Battle",
        views: 1204,
        likes: 87,
        videoUrl: "/uploads/elf-battle.mp4",
        uploadDate: "2025-11-01"
      },
      {
        title: "Succubus Dance",
        views: 980,
        likes: 102,
        videoUrl: "/uploads/succubus-dance.mp4",
        uploadDate: "2025-11-02"
      }
    ]
  });
});
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    const uploads = await Video.find({ user: req.user.id }).sort({ uploadDate: -1 });

    res.json({
      username: user.username,
      followers: user.followers,
      profilePicture: user.profilePicture,
      uploads
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});
// Signup route
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ error: "Signup failed" });
  }
});
// Login route
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



app.post('/api/user/profile-picture', verifyToken, upload.single('profilePic'), async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'profilePics' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    await User.findByIdAndUpdate(req.user.id, { profilePicture: result.secure_url });
    res.json({ message: 'Profile picture updated', imageUrl: result.secure_url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});
const Video = require('./models/Video'); // make sure path is correct

app.post('/api/user/upload-video', verifyToken, upload.single('videoFile'), async (req, res) => {
  try {
    const { title, description, copyrightCheck } = req.body;
    if (!title || !description || copyrightCheck !== 'true') {
      return res.status(400).json({ success: false, message: 'Missing or invalid fields' });
    }
    const extractHashtags = (text) => {
  return text.match(/#[\w]+/g) || [];
};

const hashtags = extractHashtags(description);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'userVideos'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
    
const thumbnailUrl = result.secure_url.replace(/\.mp4$/, '.jpg');

const newVideo = new Video({
  title,
  description,
  videoUrl: result.secure_url,
  thumbnailUrl, // ✅ just reference the variable here
  hashtags,
  user: req.user.id
});

    await newVideo.save();

    res.json({ success: true, video: newVideo });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
const Category = require('./models/Category');

app.get('/api/category/:name', async (req, res) => {
  try {
   const category = await Category.findOne({ name: new RegExp(`^${req.params.name}$`, 'i') });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const videos = await Video.find({ hashtags: { $in: category.linkedTags } }).sort({ uploadDate: -1 });
    res.json(videos);
  } catch (err) {
    console.error('Category feed error:', err);
    res.status(500).json({ error: 'Failed to load category feed' });
  }
  console.log('Requested category:', req.params.name);
});
app.post('/api/category/seed', async (req, res) => {
  try {
    const categories = [
      { name: "Elf", linkedTags: ["#elf", "#elven", "#forest"] },
      { name: "Dark Skinned", linkedTags: ["#darkskiined", "#melanin", "#chocolate"] },
      { name: "Creampie", linkedTags: ["#creampie", "#inside", "#cream"] },
      { name: "Uncensored", linkedTags: ["#uncensored", "#raw", "#nofilter"] },
      { name: "Thick", linkedTags: ["#thick", "#curvy", "#voluptuous"] },
      { name: "Busty", linkedTags: ["#busty", "#bigboobs", "#topheavy"] },
      { name: "Cosplay", linkedTags: ["#cosplay", "#costume", "#animefit"] },
      { name: "Footjob", linkedTags: ["#footjob", "#feet", "#soles"] },
      { name: "Boobjob", linkedTags: ["#boobjob", "#boobs", "#cleavage"] },
      { name: "Ahegao", linkedTags: ["#ahegao", "#faces", "#expression"] },
      { name: "Anal", linkedTags: ["#anal", "#backdoor", "#tight"] },
      { name: "Incest", linkedTags: ["#incest", "#familyplay", "#taboo"] }
    ];

    await Category.insertMany(categories);
    res.json({ message: "Categories seeded" });
  } catch (err) {
    res.status(500).json({ error: "Seeding failed" });
  }
});
app.listen(PORT, () => {
 console.log(`Server running at http://localhost:${PORT}`);
});


mongoose.connect('mongodb+srv://binaj2006_db_user:Ife%232907@cluster0.uzugbxr.mongodb.net/?appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));



