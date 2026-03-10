require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/database");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const createAdmin = async () => {
  try {
    await connectDB();

    console.log("\n=== TẠO TÀI KHOẢN ADMIN ===\n");

    // Get admin details
    const name = await question("Tên admin: ");
    const email = await question("Email: ");
    const password = await question("Password (tối thiểu 6 ký tự): ");
    const phone = await question("Số điện thoại (optional): ");

    // Validate
    if (!name || !email || !password) {
      console.log("❌ Vui lòng điền đầy đủ thông tin!");
      process.exit(1);
    }

    if (password.length < 6) {
      console.log("❌ Password phải có ít nhất 6 ký tự!");
      process.exit(1);
    }

    // Check if admin already exists
    const adminExists = await User.findOne({ email });

    if (adminExists) {
      console.log("❌ Email này đã được sử dụng!");
      process.exit(1);
    }

    // Create admin
    const admin = await User.create({
      name,
      email,
      password,
      phone: phone || undefined,
      role: "admin",
      isActive: true,
      emailVerified: true,
    });

    console.log("\n✅ Tạo admin thành công!");
    console.log("📧 Email:", admin.email);
    console.log("👤 Name:", admin.name);
    console.log("🔑 Role:", admin.role);
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  }
};

createAdmin();
