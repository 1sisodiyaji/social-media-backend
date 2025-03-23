const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1000
  },
  images: [{
    type: String,
    required: true,
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

// Add method to clean up images when post is deleted
postSchema.pre('remove', async function(next) {
  try {
    // Delete associated images from filesystem
    const fs = require('fs');
    const path = require('path');
    
    this.images.forEach(imagePath => {
      const fullPath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Post', postSchema); 