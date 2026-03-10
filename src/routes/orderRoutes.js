const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
} = require("../controllers/orderController");
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/admin");
const {
  orderValidation,
  validateObjectId,
  validate,
} = require("../middleware/validate");

// Protected routes - User đã đăng nhập (cả admin và user)
router.post("/", protect, orderValidation, validate, createOrder);
router.get("/my-orders", protect, getMyOrders);
router.get("/:id", protect, validateObjectId, validate, getOrderById);
router.put("/:id/pay", protect, validateObjectId, validate, updateOrderToPaid);
router.put("/:id/cancel", protect, validateObjectId, validate, cancelOrder);

// Admin only routes - Chỉ admin
router.get("/", protect, adminOnly, getAllOrders);
router.get("/admin/stats", protect, adminOnly, getOrderStats);
router.put(
  "/:id/deliver",
  protect,
  adminOnly,
  validateObjectId,
  validate,
  updateOrderToDelivered,
);
router.put(
  "/:id/status",
  protect,
  adminOnly,
  validateObjectId,
  validate,
  updateOrderStatus,
);

module.exports = router;
