const User = require('../models/User');
const Post = require('../models/Post');
const bcrypt = require('bcryptjs');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');   
    const posts = await Post.aggregate([
      { $match: { userId: user._id } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 }
    ]);
    user.posts = posts;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};

// Get current user's profile
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password');
    const posts = await Post.aggregate([
      { $match: { userId: user._id } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 }
    ]);
    user.posts = posts;
    res.json(user);
  } catch (error) {
    console.error('Error fetching own profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    // If updating password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      user.password = hashedPassword;
    }

    // Update other fields if provided
    if (username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: req.user.id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username.toLowerCase();
    }

    if (email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.user.id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email.toLowerCase();
    }

    await user.save();

    // Send response without password
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Get user's posts
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePicture');
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Error fetching user posts' });
  }
};

// Update profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    if (!req.processedImages || req.processedImages.length === 0) {
      return res.status(400).json({ message: 'Profile picture is required' });
    }

    const user = await User.findById(req.user.id);
    user.profilePicture = req.processedImages[0]; // Use the first processed image

    await user.save();

    res.json({ 
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture 
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: 'Error updating profile picture' });
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .select('username email profilePicture')
    .limit(10);

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
}; 