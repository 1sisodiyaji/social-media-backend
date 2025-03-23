const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upload, processImages } = require('../middleware/imageUpload');
const { 
  createPost, 
  getAllPosts, 
  getPost, 
  updatePost, 
  deletePost,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  toggleCommentLike
} = require('../controllers/postController');

router.post('/', auth, upload, processImages, createPost);
router.get('/', getAllPosts);
router.get('/:id', getPost);
router.put('/:id', auth, updatePost);
router.delete('/:id', auth, deletePost);
router.post('/:id/like', auth, toggleLike);
router.post('/:id/comments', auth, addComment);
router.get('/:id/comments', getComments);
router.delete('/:id/comments/:commentId', auth, deleteComment);
router.post('/:id/comments/:commentId/like', auth, toggleCommentLike);

module.exports = router; 