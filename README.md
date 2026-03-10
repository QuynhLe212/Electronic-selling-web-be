

```markdown
# 🛒 Electronic Selling Platform - Backend API

Backend API cho nền tảng bán hàng thiết bị điện tử, được xây dựng với Node.js, Express và MongoDB.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Sử dụng](#sử-dụng)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Scripts](#scripts)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)

## 🎯 Tổng quan

Electronic Selling Platform là hệ thống backend RESTful API đầy đủ cho website thương mại điện tử chuyên về thiết bị điện tử. Hệ thống hỗ trợ quản lý sản phẩm, đơn hàng, người dùng, và tích hợp AI chatbot thông minh.

## ✨ Tính năng

### 🔐 Authentication & Authorization
- Đăng ký và đăng nhập người dùng
- JWT-based authentication
- Phân quyền User/Admin
- Quản lý profile cá nhân
- Thay đổi mật khẩu

### 📦 Quản lý sản phẩm
- CRUD sản phẩm (Admin)
- Tìm kiếm và lọc sản phẩm
- Phân loại theo danh mục: Laptop, Phone, Tablet, Accessory, Monitor, PC, Gaming
- Upload nhiều ảnh sản phẩm (Cloudinary)
- Đánh giá và nhận xét sản phẩm
- Sản phẩm nổi bật và top rated
- Pagination và sorting

### 🛍️ Quản lý đơn hàng
- Tạo và quản lý đơn hàng
- Theo dõi trạng thái đơn hàng
- Lịch sử đơn hàng của người dùng
- Quản lý đơn hàng (Admin)

### 💬 Chat & AI Support
- Chatbot AI sử dụng Google Gemini
- Tư vấn sản phẩm thông minh
- Lưu lịch sử hội thoại

### 🖼️ Upload & Media
- Cloudinary integration
- Upload và quản lý ảnh sản phẩm
- Tự động xóa ảnh cũ khi cập nhật

## 🛠️ Công nghệ sử dụng

### Backend Framework
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM (Object Data Modeling)

### Authentication & Security
- **JWT** (jsonwebtoken) - Token-based authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

### Cloud Services
- **Cloudinary** - Image storage & CDN
- **Google Gemini AI** - AI chatbot

### Development Tools
- **dotenv** - Environment variables
- **nodemon** - Auto-restart development server
- **cors** - Cross-Origin Resource Sharing
- **multer** - File upload handling

## 📥 Cài đặt

### Yêu cầu hệ thống
- Node.js >= 14.x
- MongoDB >= 4.x
- npm hoặc yarn

### Các bước cài đặt

1. **Clone repository**
```bash
cd server
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Tạo file .env**
```bash
cp .env.example .env
```

4. **Cấu hình biến môi trường** (xem phần Cấu hình)

5. **Khởi động server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## ⚙️ Cấu hình

Tạo file `.env` trong thư mục server với các biến sau:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/electronic-selling
# Hoặc MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/electronic-selling

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Email (optional - cho tính năng gửi email)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Cách lấy API Keys

**Cloudinary:**
1. Đăng ký tại [cloudinary.com](https://cloudinary.com/)
2. Vào Dashboard để lấy Cloud Name, API Key, API Secret

**Google Gemini AI:**
1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Tạo API key mới

## 🚀 Sử dụng

### Khởi động Development Server
```bash
npm run dev
```

### Kiểm tra kết nối Database
```bash
npm run check-db
```

### Tạo Admin User
```bash
npm run create-admin
```
Làm theo hướng dẫn trên màn hình để tạo tài khoản admin.

### Update Products Seller
```bash
npm run update-sellers
```
Gán admin làm seller cho các sản phẩm chưa có seller.

## 📡 API Endpoints

### Authentication (`/api/auth`)
```
POST   /api/auth/register        - Đăng ký tài khoản mới
POST   /api/auth/login           - Đăng nhập
GET    /api/auth/me              - Lấy thông tin user hiện tại [Auth]
PUT    /api/auth/profile         - Cập nhật profile [Auth]
PUT    /api/auth/change-password - Đổi mật khẩu [Auth]
POST   /api/auth/logout          - Đăng xuất [Auth]
```

### Products (`/api/products`)
```
GET    /api/products             - Lấy danh sách sản phẩm (có filter, search, pagination)
GET    /api/products/featured    - Lấy sản phẩm nổi bật
GET    /api/products/top-rated   - Lấy sản phẩm đánh giá cao
GET    /api/products/:id         - Lấy chi tiết sản phẩm
POST   /api/products             - Tạo sản phẩm mới [Admin]
PUT    /api/products/:id         - Cập nhật sản phẩm [Admin]
DELETE /api/products/:id         - Xóa sản phẩm [Admin]
POST   /api/products/:id/reviews - Thêm đánh giá sản phẩm [Auth]
```

**Query Parameters cho GET /api/products:**
- `category` - Lọc theo danh mục (Laptop, Phone, Tablet, etc.)
- `search` - Tìm kiếm văn bản
- `minPrice` - Giá tối thiểu
- `maxPrice` - Giá tối đa
- `brand` - Lọc theo thương hiệu
- `sort` - Sắp xếp (mặc định: `-createdAt`)
- `page` - Trang hiện tại (mặc định: 1)
- `limit` - Số sản phẩm/trang (mặc định: 12)

### Orders (`/api/orders`)
```
GET    /api/orders               - Lấy tất cả đơn hàng [Admin]
POST   /api/orders               - Tạo đơn hàng mới [Auth]
GET    /api/orders/myorders      - Lấy đơn hàng của user [Auth]
GET    /api/orders/:id           - Lấy chi tiết đơn hàng [Auth]
PUT    /api/orders/:id           - Cập nhật trạng thái đơn [Admin]
DELETE /api/orders/:id           - Xóa đơn hàng [Admin]
```

### Chat (`/api/chat`)
```
POST   /api/chat                 - Gửi tin nhắn chat với AI [Auth]
GET    /api/chat/history         - Lấy lịch sử chat [Auth]
DELETE /api/chat/history         - Xóa lịch sử chat [Auth]
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

## 📊 Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (user/admin),
  phone: String,
  address: Object,
  avatar: Object,
  isActive: Boolean,
  emailVerified: Boolean,
  timestamps: true
}
```

### Product Model
```javascript
{
  name: String,
  slug: String (unique),
  description: String,
  price: Number,
  originalPrice: Number,
  category: String (enum),
  brand: String,
  stock: Number,
  sold: Number,
  images: Array,
  specifications: Map,
  features: Array,
  rating: Number,
  numReviews: Number,
  reviews: Array,
  views: Number,
  isActive: Boolean,
  isFeatured: Boolean,
  seller: ObjectId (ref: User),
  timestamps: true
}
```

### Order Model
```javascript
{
  orderNumber: String (unique),
  user: ObjectId (ref: User),
  orderItems: Array,
  shippingAddress: Object,
  paymentMethod: String,
  paymentResult: Object,
  itemsPrice: Number,
  shippingPrice: Number,
  taxPrice: Number,
  totalPrice: Number,
  isPaid: Boolean,
  paidAt: Date,
  status: String (enum),
  deliveredAt: Date,
  timestamps: true
}
```

## 📜 Scripts

| Script | Command | Mô tả |
|--------|---------|-------|
| Start | `npm start` | Khởi động production server |
| Dev | `npm run dev` | Khởi động development server với nodemon |
| Check DB | `npm run check-db` | Kiểm tra kết nối database |
| Create Admin | `npm run create-admin` | Tạo tài khoản admin |
| Update Sellers | `npm run update-sellers` | Cập nhật seller cho products |

## 📁 Cấu trúc thư mục

```
server/
├── src/
│   ├── config/              # Cấu hình
│   │   ├── ai.js           # Google Gemini AI config
│   │   ├── cloudinary.js   # Cloudinary config
│   │   └── database.js     # MongoDB connection
│   ├── controllers/         # Business logic
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── orderController.js
│   │   ├── productController.js
│   │   └── userController.js
│   ├── middleware/          # Express middleware
│   │   ├── admin.js        # Admin authorization
│   │   ├── auth.js         # JWT authentication
│   │   ├── errorHandler.js # Error handling
│   │   ├── upload.js       # File upload (Multer)
│   │   └── validate.js     # Input validation
│   ├── models/              # Mongoose schemas
│   │   ├── ChatConversation.js
│   │   ├── Order.js
│   │   ├── Product.js
│   │   └── User.js
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── orderRoutes.js
│   │   └── productRoutes.js
│   ├── scripts/             # Utility scripts
│   │   ├── checkDatabase.js
│   │   ├── createAdmin.js
│   │   ├── createAdminDirect.js
│   │   ├── seedData.js
│   │   └── updateProductsSeller.js
│   ├── services/            # External services
│   │   ├── aiService.js    # AI chat service
│   │   └── emailService.js # Email service
│   ├── utils/               # Helper functions
│   │   ├── helpers.js
│   │   └── validators.js
│   └── server.js            # Entry point
├── .env                     # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## 🔒 Bảo mật

- Mật khẩu được hash bằng bcryptjs (salt rounds: 10)
- JWT tokens với thời gian hết hạn
- Protected routes với middleware authentication
- Input validation với express-validator
- CORS configuration
- Environment variables cho sensitive data

## 🐛 Xử lý lỗi thường gặp

### Không kết nối được MongoDB
```bash
# Kiểm tra MongoDB đang chạy
mongod --version

# Hoặc kiểm tra kết nối
npm run check-db
```

### Cloudinary upload lỗi
- Kiểm tra API credentials trong `.env`
- Đảm bảo đã enable unsigned uploads (nếu cần)

### JWT invalid token
- Kiểm tra `JWT_SECRET` trong `.env`
- Token có thể đã hết hạn (mặc định 7 ngày)

## 📝 License

ISC

## 👨‍💻 Author

YuuLuckk

---

**Version:** 1.0.0  
**Last Updated:** March 2026
```

Nội dung README này bao gồm:
- Tổng quan chi tiết về project
- Hướng dẫn cài đặt từng bước
- Cấu hình environment variables
- Danh sách đầy đủ API endpoints
- Database schema
- Cấu trúc thư mục
- Scripts và cách sử dụng
- Xử lý lỗi thường gặp

Bạn có thể tạo file `README.md` trong thư mục [server](server) và paste nội dung này vào.Nội dung README này bao gồm:
- Tổng quan chi tiết về project
- Hướng dẫn cài đặt từng bước
- Cấu hình environment variables
- Danh sách đầy đủ API endpoints
- Database schema
- Cấu trúc thư mục
- Scripts và cách sử dụng
- Xử lý lỗi thường gặp

Bạn có thể tạo file `README.md` trong thư mục [server](server) và paste nội dung này vào.

Read [](file:///d%3A/BigProject/server/src/routes/chatRoutes.js)

Read [](file:///d%3A/BigProject/server/src/routes/orderRoutes.js#1-1), lines 1 to 30

Tôi đã bổ sung thêm thông tin từ chat và order routes. Đây là phiên bản cập nhật của phần **API Endpoints** để chính xác hơn:

### Cập nhật phần API Endpoints:

```markdown
## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Đăng ký tài khoản mới | No |
| POST | `/api/auth/login` | Đăng nhập | No |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại | Yes |
| PUT | `/api/auth/profile` | Cập nhật profile | Yes |
| PUT | `/api/auth/change-password` | Đổi mật khẩu | Yes |
| POST | `/api/auth/logout` | Đăng xuất | Yes |

### Products (`/api/products`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | Lấy danh sách sản phẩm (filter, search, pagination) | No |
| GET | `/api/products/featured` | Lấy sản phẩm nổi bật | No |
| GET | `/api/products/top-rated` | Lấy sản phẩm đánh giá cao | No |
| GET | `/api/products/:id` | Lấy chi tiết sản phẩm | No |
| POST | `/api/products` | Tạo sản phẩm mới | Admin |
| PUT | `/api/products/:id` | Cập nhật sản phẩm | Admin |
| DELETE | `/api/products/:id` | Xóa sản phẩm | Admin |
| POST | `/api/products/:id/reviews` | Thêm đánh giá sản phẩm | Yes |

**Query Parameters cho GET /api/products:**
- `category` - Lọc theo danh mục (Laptop, Phone, Tablet, Accessory, Monitor, PC, Gaming, Other)
- `search` - Tìm kiếm văn bản (text search)
- `minPrice` - Giá tối thiểu
- `maxPrice` - Giá tối đa
- `brand` - Lọc theo thương hiệu
- `sort` - Sắp xếp (mặc định: `-createdAt`)
  - `-createdAt`: Mới nhất
  - `createdAt`: Cũ nhất
  - `-price`: Giá cao đến thấp
  - `price`: Giá thấp đến cao
  - `-rating`: Đánh giá cao nhất
  - `-sold`: Bán chạy nhất
- `page` - Trang hiện tại (mặc định: 1)
- `limit` - Số sản phẩm/trang (mặc định: 12)

**Example:**
```
GET /api/products?category=Laptop&minPrice=10000000&maxPrice=30000000&sort=-rating&page=1&limit=12
```

### Orders (`/api/orders`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/orders` | Tạo đơn hàng mới | Yes |
| GET | `/api/orders/my-orders` | Lấy đơn hàng của user | Yes |
| GET | `/api/orders/:id` | Lấy chi tiết đơn hàng | Yes |
| PUT | `/api/orders/:id/pay` | Cập nhật trạng thái thanh toán | Yes |
| PUT | `/api/orders/:id/cancel` | Hủy đơn hàng | Yes |
| GET | `/api/orders` | Lấy tất cả đơn hàng | Admin |
| PUT | `/api/orders/:id/deliver` | Cập nhật trạng thái giao hàng | Admin |
| PUT | `/api/orders/:id/status` | Cập nhật trạng thái đơn hàng | Admin |
| GET | `/api/orders/stats` | Thống kê đơn hàng | Admin |

**Order Status:**
- `pending` - Chờ xử lý
- `processing` - Đang xử lý
- `shipped` - Đang giao
- `delivered` - Đã giao
- `cancelled` - Đã hủy

### Chat (`/api/chat`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/chat/session` | Tạo session chat mới | No |
| POST | `/api/chat/message` | Gửi tin nhắn chat với AI | Optional |
| GET | `/api/chat/conversation/:sessionId` | Lấy lịch sử chat theo session | Optional |
| DELETE | `/api/chat/conversation/:sessionId` | Xóa lịch sử chat | Optional |
| GET | `/api/chat/conversations` | Lấy tất cả conversations | Admin |
| GET | `/api/chat/stats` | Thống kê chat | Admin |


Bạn có thể thay thế phần API Endpoints trong README bằng nội dung này để có tài liệu đầy đủ và chi tiết hơn.
