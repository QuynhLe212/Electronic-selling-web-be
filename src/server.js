require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/database");
const { errorHandler } = require("./middleware/errorHandler");
// ❌ Bỏ import testGeminiConnection
// const { testGeminiConnection } = require("./config/gemini");

// ✅ Import models
const Product = require("./models/Product");
const User = require("./models/User");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

app.get("/", (req, res) => {
  res.json({
    message: "Electronic Selling API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      orders: "/api/orders",
      chat: "/api/chat",
    },
  });
});

// Error Handler
app.use(errorHandler);

// ✅ Function tự động update sellers (chỉ chạy 1 lần khi cần)
const autoUpdateSellers = async () => {
  try {
    // Kiểm tra có admin không
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.log("ℹ️  Chưa có admin user. Skip auto-update sellers.");
      return;
    }

    // Đếm products không có seller
    const productsWithoutSeller = await Product.countDocuments({
      $or: [{ seller: { $exists: false } }, { seller: null }],
    });

    if (productsWithoutSeller > 0) {
      console.log(
        `🔄 Tìm thấy ${productsWithoutSeller} products không có seller. Đang update...`,
      );

      const result = await Product.updateMany(
        {
          $or: [{ seller: { $exists: false } }, { seller: null }],
        },
        {
          $set: { seller: adminUser._id },
        },
      );

      console.log(
        `✅ Đã update ${result.modifiedCount} products với seller: ${adminUser.email}`,
      );
    } else {
      console.log("✅ Tất cả products đã có seller");
    }
  } catch (error) {
    console.error("⚠️  Lỗi khi auto-update sellers:", error.message);
  }
};

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();

    // ❌ Bỏ test Gemini connection
    // await testGeminiConnection();

    // ✅ Auto update sellers khi server start
    await autoUpdateSellers();

    app.listen(PORT, () => {
      console.log(`
  ╔════════════════════════════════════════╗
  ║  🚀 Server is running on port ${PORT}    ║
  ║  📝 Environment: ${process.env.NODE_ENV || "development"}           ║
  ║  🗄️  Database: MongoDB Connected        ║
  ║  🌐 API: http://localhost:${PORT}/api    ║
  ╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
};

startServer();
