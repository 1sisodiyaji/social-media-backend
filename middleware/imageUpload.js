const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  },
});

// Image processing middleware
const processImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image' });
    }

    if (req.files.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 images allowed' });
    }

    const processedImages = [];

    for (const file of req.files) {
      const filename = `${uuidv4()}.webp`;
      const filepath = path.join(assetsDir, filename);

      // Process image with Sharp
      await sharp(file.buffer)
        .resize(1200, 1200, { // Max dimensions
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 }) // Convert to WebP format
        .toFile(filepath);

      processedImages.push(`/assets/${filename}`);
    }

    req.processedImages = processedImages;
    next();
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ message: 'Error processing images' });
  }
};

module.exports = {
  upload: upload.array('images', 5),
  processImages
}; 