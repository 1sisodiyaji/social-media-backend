const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};


exports.register = async (req, res) => {
  try {
    logger.info('Registration attempt:', { username: req.body.username, email: req.body.email });

    const { username, email, password } = req.body;

    // Enhanced validation
    if (!username || username.length < 3) {
      return res.status(400).json({ 
        message: 'Username must be at least 3 characters long' 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      logger.warn('Registration failed - User already exists:', { email, username });
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();
    logger.info('New user registered successfully:', { userId: user._id, username });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error('Registration error:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error registering user' });
  }
};

exports.login = async (req, res) => {
  try { 
    const { username, password } = req.body; 
    const user = await User.findOne({ username}); 
    if (!user) {
      logger.warn('Login failed - User not found:', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    } 

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn('Login failed - Invalid password:', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    } 
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('User logged in successfully:', { userId: user._id, username });

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio
      }
    });
  } catch (error) {
    logger.error('Login error:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error logging in' });
  }
};

// Add profile update functionality
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email } = req.body;

    // Validate new data
    if (email && !validateEmail(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address' 
      });
    }

    if (username && username.length < 3) {
      return res.status(400).json({ 
        message: 'Username must be at least 3 characters long' 
      });
    }

    // Check if new username/email is already taken
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          { email: email?.toLowerCase() },
          { username: username?.toLowerCase() }
        ]
      });

      if (existingUser) {
        return res.status(400).json({
          message: existingUser.email === email?.toLowerCase()
            ? 'Email already in use'
            : 'Username already taken'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(username && { username: username.toLowerCase() }),
          ...(email && { email: email.toLowerCase() })
        }
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Server error during profile update' 
    });
  }
}; 