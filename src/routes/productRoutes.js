const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  getFeaturedProducts,
  getTopRated,
} = require("../controllers/productController");
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/admin");
const {
  uploadProductImages,
  handleMulterError,
} = require("../middleware/upload");
const {
  productValidation,
  validateObjectId,
  validate,
} = require("../middleware/validate");

// Public routes - Không cần đăng nhập
router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/top-rated", getTopRated);
router.get("/:id", validateObjectId, validate, getProductById);

// Protected routes - Cần đăng nhập (user hoặc admin)
router.post("/:id/reviews", protect, validateObjectId, validate, addReview);

// Admin only routes - Chỉ admin mới được truy cập
router.post(
  "/",
  protect,
  adminOnly,
  uploadProductImages,
  handleMulterError,
  productValidation,
  validate,
  createProduct,
);

router.put(
  "/:id",
  protect,
  adminOnly,
  validateObjectId,
  validate,
  uploadProductImages,
  handleMulterError,
  updateProduct,
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  validateObjectId,
  validate,
  deleteProduct,
);

module.exports = router;
