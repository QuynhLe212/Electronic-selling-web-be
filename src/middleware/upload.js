const fs = require("fs");
const path = require("path");
const multer = require("multer");

const avatarsUploadDir = path.join(__dirname, "../../uploads/avatars");

fs.mkdirSync(avatarsUploadDir, { recursive: true });

const buildFileName = (prefix, originalName) => {
  const extension = path.extname(originalName || "").toLowerCase();
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
};

const productStorage = multer.memoryStorage();

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsUploadDir),
  filename: (req, file, cb) => cb(null, buildFileName("avatar", file.originalname)),
});

// File filter
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

// Product images upload (multiple)
const uploadProductImages = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

// Avatar upload (single)
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "File too large. Maximum size is 5MB for products and 2MB for avatars.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 5 images per product.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

module.exports = {
  uploadProductImages: uploadProductImages.array("images", 5),
  uploadAvatar: uploadAvatar.single("avatar"),
  handleMulterError,
};
