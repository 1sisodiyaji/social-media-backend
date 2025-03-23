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

router.get('/me', auth, getMyProfile);
router.put('/me', auth, updateProfile);
router.put('/me/profile-picture', auth, upload, processImages, updateProfilePicture);
router.get('/search', searchUsers);
router.get('/:id', auth, getUserProfile);
router.get('/:id/posts', auth, getUserPosts);

module.exports = router; 