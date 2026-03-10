const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  uploadAvatar,
  deleteAvatar,
  getUserStats,
  searchUsers,
  bulkUpdateUsers,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/admin");
const {
  uploadAvatar: upload,
  handleMulterError,
} = require("../middleware/upload");
const { validateObjectId, validate } = require("../middleware/validate");

// Protected routes - User đã đăng nhập (quản lý avatar của chính mình)
router.post("/avatar", protect, upload, handleMulterError, uploadAvatar);
router.delete("/avatar", protect, deleteAvatar);

// Admin only routes - Quản lý users
router.get("/", protect, adminOnly, getAllUsers);
router.get("/stats", protect, adminOnly, getUserStats);
router.get("/search", protect, adminOnly, searchUsers);
router.put("/bulk-update", protect, adminOnly, bulkUpdateUsers);

router.get("/:id", protect, adminOnly, validateObjectId, validate, getUserById);
router.put("/:id", protect, adminOnly, validateObjectId, validate, updateUser);
router.put(
  "/:id/role",
  protect,
  adminOnly,
  validateObjectId,
  validate,
  updateUserRole,
);
router.put(
  "/:id/status",
  protect,
  adminOnly,
  validateObjectId,
  validate,
  updateUserStatus,
);
router.delete(
  "/:id",
  protect,
  adminOnly,
  validateObjectId,
  validate,
  deleteUser,
);

module.exports = router;
