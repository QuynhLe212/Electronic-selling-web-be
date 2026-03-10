const express = require("express");
const router = express.Router();
const {
  createSession,
  sendMessage,
  getConversation,
  clearConversation,
  getAllConversations,
  getChatStats,
} = require("../controllers/chatController");
const { protect, optionalAuth } = require("../middleware/auth");
const { adminOnly } = require("../middleware/admin");

// Public routes - Không cần đăng nhập (guest có thể chat)
router.post("/session", createSession);
router.post("/message", optionalAuth, sendMessage); // optionalAuth: có thể có hoặc không có user
router.get("/conversation/:sessionId", optionalAuth, getConversation);
router.delete("/conversation/:sessionId", optionalAuth, clearConversation);

// Admin only routes - Chỉ admin xem được tất cả conversations
router.get("/conversations", protect, adminOnly, getAllConversations);
router.get("/stats", protect, adminOnly, getChatStats);

module.exports = router;
