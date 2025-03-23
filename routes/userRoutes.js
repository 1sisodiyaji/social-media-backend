const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upload, processImages } = require('../middleware/imageUpload');
const {
  getUserProfile,
  getMyProfile,
  updateProfile,
  getUserPosts,
  updateProfilePicture,
  searchUsers
} = require('../controllers/userController');

// Get current user's profile
router.get('/me', auth, getMyProfile);

// Update current user's profile
router.put('/me', auth, updateProfile);

// Update profile picture
router.put('/me/profile-picture', auth, upload, processImages, updateProfilePicture);

// Search users
router.get('/search', auth, searchUsers);

// Get user's profile by ID
router.get('/:id', auth, getUserProfile);

// Get user's posts
router.get('/:id/posts', auth, getUserPosts);

module.exports = router; 