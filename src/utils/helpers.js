/**
 * Calculate pagination metadata
 */
exports.getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page: Number(page),
    limit: Number(limit),
    totalPages,
    total,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Build query filter from request query
 */
exports.buildQueryFilter = (query) => {
  const filter = {};
  const excludeFields = ["page", "limit", "sort", "fields"];

  // Remove excluded fields
  const queryObj = { ...query };
  excludeFields.forEach((field) => delete queryObj[field]);

  // Advanced filtering (gte, lte, gt, lt)
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  return JSON.parse(queryStr);
};

/**
 * Generate random string
 */
exports.generateRandomString = (length = 10) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

/**
 * Format currency VND
 */
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

/**
 * Slugify text (Vietnamese support)
 */
exports.slugify = (text) => {
  const from =
    "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ·/_,:;";
  const to =
    "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd------";

  const newText = text
    .split("")
    .map((char, i) => {
      const index = from.indexOf(char);
      return index !== -1 ? to[index] : char;
    })
    .join("");

  return newText
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

/**
 * Check if user is authorized to access resource
 */
exports.isAuthorized = (user, resource, field = "user") => {
  // Admin can access everything
  if (user.role === "admin") {
    return true;
  }

  // Check if user owns the resource
  const resourceUserId = resource[field]?.toString() || resource[field];
  const currentUserId = user._id.toString();

  return resourceUserId === currentUserId;
};

/**
 * Calculate order totals
 */
exports.calculateOrderTotals = (items, shippingPrice = 0, taxRate = 0.1) => {
  const itemsPrice = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const taxPrice = itemsPrice * taxRate;
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  return {
    itemsPrice: Math.round(itemsPrice),
    shippingPrice: Math.round(shippingPrice),
    taxPrice: Math.round(taxPrice),
    totalPrice: Math.round(totalPrice),
  };
};

/**
 * Remove Vietnamese tones for search
 */
exports.removeVietnameseTones = (str) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
};

/**
 * Validate email format
 */
exports.isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate phone number (Vietnam)
 */
exports.isValidPhone = (phone) => {
  const re = /^(0|\+84)[0-9]{9,10}$/;
  return re.test(phone);
};

/**
 * Generate order number
 */
exports.generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `ORD${year}${month}${day}${random}`;
};

/**
 * Sleep/delay function
 */
exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Get time ago string
 */
exports.getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";

  return Math.floor(seconds) + " giây trước";
};
