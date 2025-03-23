const Post = require('../models/Post');
const Comment = require('../models/Comment');
const logger = require('../config/logger');

// Create a new post
exports.createPost = async (req, res) => {
  try {
    logger.debug('Creating new post:', { userId: req.user._id, text: req.body.text });

    const { text } = req.body;
    const images = req.files ? req.files.map(file => `/assets/${file.filename}`) : [];

    const post = new Post({
      userId: req.user._id,
      text,
      images
    });

    await post.save();
    logger.info('Post created successfully:', { postId: post._id, userId: req.user._id });

    const populatedPost = await Post.findById(post._id)
      .populate('userId', 'username profilePicture');

    res.status(201).json(populatedPost);
  } catch (error) {
    logger.error('Error creating post:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error creating post' });
  }
};

// Get all posts with pagination
exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    logger.debug('Fetching posts:', { page, limit });

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username profilePicture');

    const total = await Post.countDocuments();
    const hasMore = skip + posts.length < total;

    logger.info('Posts fetched successfully:', { 
      count: posts.length, 
      page, 
      hasMore 
    });

    res.json({
      posts,
      hasMore
    });
  } catch (error) {
    logger.error('Error fetching posts:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error fetching posts' });
  }
};

// Get a single post
exports.getPost = async (req, res) => {
  try {
    logger.debug('Fetching post:', { postId: req.params.id });

    const post = await Post.findById(req.params.id)
      .populate('userId', 'username profilePicture');

    if (!post) {
      logger.warn('Post not found:', { postId: req.params.id });
      return res.status(404).json({ error: 'Post not found' });
    }

    logger.info('Post fetched successfully:', { postId: post._id });
    res.json(post);
  } catch (error) {
    logger.error('Error fetching post:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error fetching post' });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    logger.debug('Updating post:', { postId: req.params.id, userId: req.user._id });

    const post = await Post.findById(req.params.id);

    if (!post) {
      logger.warn('Post not found:', { postId: req.params.id });
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      logger.warn('Unauthorized post update attempt:', { 
        postId: req.params.id, 
        userId: req.user._id 
      });
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('userId', 'username profilePicture');

    logger.info('Post updated successfully:', { postId: updatedPost._id });
    res.json(updatedPost);
  } catch (error) {
    logger.error('Error updating post:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error updating post' });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    logger.debug('Deleting post:', { postId: req.params.id, userId: req.user._id });

    const post = await Post.findById(req.params.id);

    if (!post) {
      logger.warn('Post not found:', { postId: req.params.id });
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      logger.warn('Unauthorized post deletion attempt:', { 
        postId: req.params.id, 
        userId: req.user._id 
      });
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ postId: req.params.id });

    logger.info('Post and associated comments deleted successfully:', { postId: req.params.id });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    logger.error('Error deleting post:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error deleting post' });
  }
};

// Toggle like on a post
exports.toggleLike = async (req, res) => {
  try {
    logger.debug('Toggling post like:', { postId: req.params.id, userId: req.user._id });

    const post = await Post.findById(req.params.id);

    if (!post) {
      logger.warn('Post not found:', { postId: req.params.id });
      return res.status(404).json({ error: 'Post not found' });
    }

    const isLiked = post.likes.includes(req.user._id);
    const update = isLiked
      ? { $pull: { likes: req.user._id } }
      : { $addToSet: { likes: req.user._id } };

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('userId', 'username profilePicture');

    logger.info(`Post ${isLiked ? 'unliked' : 'liked'} successfully:`, { 
      postId: post._id, 
      userId: req.user._id 
    });

    res.json(updatedPost);
  } catch (error) {
    logger.error('Error toggling post like:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error toggling like' });
  }
};

// Add a comment
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = new Comment({
      postId: post._id,
      userId: req.user.id,
      text
    });

    await comment.save();

    // Populate user info before sending response
    await comment.populate('userId', 'username profilePicture');

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
};

// Get comments for a post
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePicture')
      .populate('likes', 'username');

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is authorized to delete the comment
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
};

// Toggle like on a comment
exports.toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const isLiked = comment.likes.includes(req.user.id);
    
    if (isLiked) {
      // Unlike the comment
      comment.likes = comment.likes.filter(id => id.toString() !== req.user.id);
    } else {
      // Like the comment
      comment.likes.push(req.user.id);
    }

    await comment.save();
    res.json({ 
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      likes: comment.likes.length 
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ message: 'Error processing comment like' });
  }
}; 