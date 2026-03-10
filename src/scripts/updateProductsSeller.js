require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");
const connectDB = require("../config/database");

const updateProductsSeller = async () => {
  try {
    await connectDB();

    console.log("📊 Database:", mongoose.connection.name);

    // Tìm admin user
    const adminUser = await User.findOne({ role: "admin" });

    if (!adminUser) {
      console.log("❌ Không tìm thấy admin user!");
      console.log("💡 Tạo admin trước bằng API: POST /api/auth/register");
      process.exit(1);
    }

    console.log(`👤 Admin tìm thấy: ${adminUser.email}`);
    console.log(`🆔 Admin ID: ${adminUser._id}`);

    // Đếm products không có seller
    const productsWithoutSeller = await Product.countDocuments({
      $or: [{ seller: { $exists: false } }, { seller: null }],
    });

    console.log(`\n📦 Products không có seller: ${productsWithoutSeller}`);

    if (productsWithoutSeller === 0) {
      console.log("✅ Tất cả products đã có seller!");
      process.exit(0);
    }

    // Update tất cả products
    console.log("🔄 Đang update seller cho tất cả products...");

    const result = await Product.updateMany(
      {
        $or: [{ seller: { $exists: false } }, { seller: null }],
      },
      {
        $set: { seller: adminUser._id },
      },
    );

    console.log(`✅ Đã update ${result.modifiedCount} products!`);

    // Verify
    const updatedCount = await Product.countDocuments({
      seller: adminUser._id,
    });
    console.log(`📊 Tổng products có seller: ${updatedCount}`);

    await mongoose.connection.close();
    console.log("\n✅ Hoàn tất!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
};

updateProductsSeller();
