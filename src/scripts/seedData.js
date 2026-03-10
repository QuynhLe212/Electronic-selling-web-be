require("dotenv").config(); // ✅ Tự động tìm .env ở root
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const connectDB = require("../config/database");

const users = [
  {
    name: "YuuLuckk",
    email: "lenguyenquynh.iuh@gmail.com",
    password: "admin123456",
    role: "admin",
    phone: "0123456789",
  },
  {
    name: "John Doe",
    email: "john@example.com",
    password: "user123456",
    role: "user",
    phone: "0987654321",
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "user123456",
    role: "user",
    phone: "0912345678",
  },
];

const products = [
  {
    name: "MacBook Pro 14 M3",
    description:
      "Laptop cao cấp từ Apple với chip M3 mạnh mẽ, màn hình Liquid Retina XDR 14 inch, RAM 16GB, SSD 512GB. Thiết kế sang trọng, hiệu năng vượt trội cho công việc chuyên nghiệp.",
    price: 45990000,
    originalPrice: 49990000,
    category: "Laptop",
    brand: "Apple",
    stock: 15,
    images: [
      {
        url: "https://cdn.tgdd.vn/Products/Images/44/309017/macbook-pro-14-m3-2023-thumb-600x600.jpg",
        public_id: "sample_mbp14",
      },
    ],
    specifications: new Map([
      ["CPU", "Apple M3 8-core"],
      ["RAM", "16GB Unified Memory"],
      ["Storage", "512GB SSD"],
      ["Display", '14.2" Liquid Retina XDR'],
      ["Graphics", "M3 10-core GPU"],
      ["Battery", "Up to 18 hours"],
    ]),
    features: [
      "Chip M3 thế hệ mới",
      "Màn hình Liquid Retina XDR",
      "Touch ID",
      "MagSafe 3",
      "Thunderbolt 4",
    ],
    isFeatured: true,
  },
  {
    name: "iPhone 15 Pro Max 256GB",
    description:
      "Smartphone flagship từ Apple với chip A17 Pro, camera 48MP, màn hình Super Retina XDR 6.7 inch, thiết kế titan cao cấp.",
    price: 32990000,
    originalPrice: 34990000,
    category: "Phone",
    brand: "Apple",
    stock: 25,
    images: [
      {
        url: "https://cdn.tgdd.vn/Products/Images/42/305658/iphone-15-pro-max-blue-thumbnew-600x600.jpg",
        public_id: "sample_ip15pm",
      },
    ],
    specifications: new Map([
      ["Chip", "Apple A17 Pro"],
      ["RAM", "8GB"],
      ["Storage", "256GB"],
      ["Display", '6.7" Super Retina XDR'],
      ["Camera", "48MP Main + 12MP Ultra Wide + 12MP Telephoto"],
      ["Battery", "4422 mAh"],
    ]),
    features: [
      "Chip A17 Pro 3nm",
      "Titan design",
      "Action Button",
      "Dynamic Island",
      "USB-C",
    ],
    isFeatured: true,
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    description:
      "Flagship Android với S Pen, camera 200MP, màn hình Dynamic AMOLED 2X 6.8 inch, chip Snapdragon 8 Gen 3.",
    price: 29990000,
    originalPrice: 33990000,
    category: "Phone",
    brand: "Samsung",
    stock: 30,
    images: [
      {
        url: "https://cdn.tgdd.vn/Products/Images/42/307174/samsung-galaxy-s24-ultra-grey-thumbnew-600x600.jpg",
        public_id: "sample_s24u",
      },
    ],
    specifications: new Map([
      ["Chip", "Snapdragon 8 Gen 3"],
      ["RAM", "12GB"],
      ["Storage", "256GB"],
      ["Display", '6.8" Dynamic AMOLED 2X'],
      [
        "Camera",
        "200MP Main + 50MP Periscope + 12MP Ultra Wide + 10MP Telephoto",
      ],
      ["Battery", "5000 mAh"],
    ]),
    features: [
      "S Pen tích hợp",
      "Camera 200MP",
      "Galaxy AI",
      "Sạc nhanh 45W",
      "Titanium frame",
    ],
    isFeatured: true,
  },
  {
    name: "Dell XPS 15 9530",
    description:
      "Laptop cao cấp cho đồ họa và sáng tạo nội dung, Intel Core i7-13700H, RTX 4060, màn hình OLED 3.5K.",
    price: 42990000,
    category: "Laptop",
    brand: "Dell",
    stock: 10,
    images: [
      {
        url: "https://cdn.tgdd.vn/Products/Images/44/307534/dell-xps-15-9530-i7-71006512-121123-035959-600x600.jpg",
        public_id: "sample_xps15",
      },
    ],
    specifications: new Map([
      ["CPU", "Intel Core i7-13700H"],
      ["RAM", "16GB DDR5"],
      ["Storage", "512GB SSD"],
      ["Display", '15.6" OLED 3.5K'],
      ["Graphics", "NVIDIA RTX 4060 8GB"],
      ["Battery", "86Wh"],
    ]),
    isFeatured: false,
  },
  {
    name: "iPad Pro M2 11 inch",
    description:
      "Máy tính bảng cao cấp với chip M2, hỗ trợ Apple Pencil 2, Magic Keyboard, màn hình Liquid Retina.",
    price: 21990000,
    originalPrice: 24990000,
    category: "Tablet",
    brand: "Apple",
    stock: 20,
    images: [
      {
        url: "https://cdn.tgdd.vn/Products/Images/522/301795/ipad-pro-11-inch-m2-wifi-128gb-2022-thumb-600x600.jpeg",
        public_id: "sample_ipadpro",
      },
    ],
    specifications: new Map([
      ["Chip", "Apple M2"],
      ["RAM", "8GB"],
      ["Storage", "128GB"],
      ["Display", '11" Liquid Retina'],
      ["Camera", "12MP Wide + 10MP Ultra Wide"],
      ["Battery", "Up to 10 hours"],
    ]),
    isFeatured: true,
  },
  {
    name: "AirPods Pro 2",
    description:
      "Tai nghe true wireless cao cấp với chống ồn chủ động, âm thanh không gian, chip H2.",
    price: 5990000,
    originalPrice: 6490000,
    category: "Accessory",
    brand: "Apple",
    stock: 50,
    images: [
      {
        url: "https://cdn.tgdd.vn/Products/Images/7077/289781/tai-nghe-bluetooth-airpods-pro-2-type-c-charge-apple-thumb-600x600.jpg",
        public_id: "sample_airpodspro2",
      },
    ],
    specifications: new Map([
      ["Chip", "Apple H2"],
      ["ANC", "Active Noise Cancellation"],
      ["Battery", "Up to 6 hours (ANC on)"],
      ["Charging", "USB-C + MagSafe + Qi"],
      ["Water Resistance", "IPX4"],
    ]),
    isFeatured: false,
  },
  {
    name: "Logitech MX Master 3S",
    description:
      "Chuột không dây cao cấp cho năng suất, 8K DPI, pin 70 ngày, kết nối đa thiết bị.",
    price: 2490000,
    category: "Accessory",
    brand: "Logitech",
    stock: 40,
    images: [
      {
        url: "https://cdn.tgdd.vn/Products/Images/86/247398/chuot-khong-day-logitech-mx-master-3s-den-thumb-600x600.jpg",
        public_id: "sample_mxmaster3s",
      },
    ],
    specifications: new Map([
      ["DPI", "8000 DPI"],
      ["Battery", "Up to 70 days"],
      ["Connectivity", "Bluetooth + USB Receiver"],
      ["Buttons", "7 buttons"],
      ["Weight", "141g"],
    ]),
  },
  {
    name: "LG UltraGear 27GN950",
    description:
      "Màn hình gaming 4K 144Hz, Nano IPS, G-Sync, HDR 600, thời gian phản hồi 1ms.",
    price: 18990000,
    category: "Monitor",
    brand: "LG",
    stock: 12,
    images: [
      {
        url: "https://cdn.tgdd.vn/Products/Images/5697/235981/lg-ultragear-27gn950-b-1-600x600.jpg",
        public_id: "sample_lg27gn950",
      },
    ],
    specifications: new Map([
      ["Size", "27 inch"],
      ["Resolution", "3840 x 2160 (4K UHD)"],
      ["Refresh Rate", "144Hz"],
      ["Response Time", "1ms (GtG)"],
      ["Panel", "Nano IPS"],
      ["HDR", "VESA DisplayHDR 600"],
    ]),
  },
];

const seedData = async () => {
  try {
    await connectDB();

    console.log("🗑️  Xóa dữ liệu cũ...");
    await User.deleteMany({});
    await Product.deleteMany({});

    console.log("👥 Tạo users...");
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Đã tạo ${createdUsers.length} users`);

    console.log("📦 Tạo products...");
    // Assign first admin as seller
    const adminUser = createdUsers.find((user) => user.role === "admin");
    const productsWithSeller = products.map((product) => ({
      ...product,
      seller: adminUser._id,
    }));

    const createdProducts = await Product.insertMany(productsWithSeller);
    console.log(`✅ Đã tạo ${createdProducts.length} products`);

    console.log("\n✅ SEED DATA THÀNH CÔNG!\n");
    console.log("=== THÔNG TIN ĐĂNG NHẬP ===");
    console.log("\n👑 ADMIN:");
    console.log("Email: lenguyenquynh.iuh@gmail.com"); // ✅ Đã sửa
    console.log("Password: admin123456");
    console.log("\n👤 USER 1:");
    console.log("Email: john@example.com");
    console.log("Password: user123456");
    console.log("\n👤 USER 2:");
    console.log("Email: jane@example.com");
    console.log("Password: user123456");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
};

seedData();
