const express = require("express");
const router = express.Router();
const {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    logout,
    uploadAvatar,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { uploadAvatar: uploadAvatarMiddleware, handleMulterError } = require("../middleware/upload");
const {
    registerValidation,
    loginValidation,
    validate,
} = require("../middleware/validate");

// Public routes
router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);

// Protected routes (require login - both admin and regular user)
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.post("/logout", protect, logout);

// ===== UPLOAD AVATAR =====
// POST /api/auth/upload-avatar
// Middleware: protect (user phải login), uploadAvatarMiddleware (xử lý file)
// handleMulterError để bắt lỗi file upload
router.post(
    "/upload-avatar",
    protect,
    uploadAvatarMiddleware,
    handleMulterError,
    uploadAvatar
);
// =====

module.exports = router;