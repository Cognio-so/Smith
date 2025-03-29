const express = require('express');
const router = express.Router();
const { protectRoutes } = require('../middleware/authMiddleware');
const { 
    saveChat, 
    getChat, 
    getChatHistory,
    updateChat 
} = require('../controllers/chatController');

// Base route is /api/chat

// Get chat history - ensure this comes before :chatId route
router.get('/history/all', protectRoutes, getChatHistory);

// Save new chat
router.post('/save', protectRoutes, saveChat);

// Update existing chat
router.put('/:chatId/update', protectRoutes, updateChat);

// Get specific chat
router.get('/:chatId', protectRoutes, getChat);

module.exports = router; 