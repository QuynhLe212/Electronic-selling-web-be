const User = require("../models/User");
const Order = require("../models/Order");
const fs = require("fs");
const path = require("path");
const { asyncHandler } = require("../middleware/errorHandler");

const DEFAULT_AVATAR_URL =
  "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff";

const resolveLocalPathFromUrl = (urlPath) => {
  if (!urlPath || typeof urlPath !== "string") return null;
  if (!urlPath.startsWith("/uploads/")) return null;

  const relativeUploadPath = urlPath.replace(/^\/+/, "");
  return path.join(__dirname, "../../", relativeUploadPath);
};

const deleteLocalFileByUrl = (urlPath) => {
  const filePath = resolveLocalPathFromUrl(urlPath);
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting local file:", error.message);
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    isActive,
    search,
    sort = "-createdAt",
  } = req.query;

  const query = {};

  // Filter by role
  if (role && ["user", "admin"].includes(role)) {
    query.role = role;
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .select("-password -passwordResetToken -passwordResetExpires")
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await User.countDocuments(query);

  res.json({
    success: true,
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
      total: count,
      hasNextPage: page < Math.ceil(count / limit),
      hasPrevPage: page > 1,
    },
  });
});

// @desc    Get user by ID (Admin)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "-password -passwordResetToken -passwordResetExpires",
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Get user's order statistics
  const orderStats = await Order.aggregate([
    {
      $match: { user: user._id },
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalPrice" },
        completedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] },
        },
      },
    },
  ]);

  // Get recent orders
  const recentOrders = await Order.find({ user: user._id })
    .select("orderNumber totalPrice status createdAt")
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    success: true,
    user,
    statistics: orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    },
    recentOrders,
  });
});

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, address, role, isActive } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString() && isActive === false) {
    return res.status(400).json({
      success: false,
      message: "Cannot deactivate your own account",
    });
  }

  // Check if email is being changed and already exists
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }
    user.email = email;
  }

  // Update fields
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address) user.address = { ...user.address, ...address };
  if (role && ["user", "admin"].includes(role)) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  res.json({
    success: true,
    message: "User updated successfully",
    user,
  });
});

// @desc    Update user role (Admin)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Must be either "user" or "admin"',
    });
  }

  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Prevent changing own role
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "Cannot change your own role",
    });
  }

  user.role = role;
  await user.save();

  res.json({
    success: true,
    message: `User role updated to ${role} successfully`,
    user,
  });
});

// @desc    Deactivate/Activate user (Admin)
// @route   PUT /api/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be a boolean value",
    });
  }

  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Prevent deactivating own account
  if (user._id.toString() === req.user._id.toString() && isActive === false) {
    return res.status(400).json({
      success: false,
      message: "Cannot deactivate your own account",
    });
  }

  user.isActive = isActive;
  await user.save();

  res.json({
    success: true,
    message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    user,
  });
});

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Prevent deleting own account
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete your own account",
    });
  }

  // Check if user has orders
  const hasOrders = await Order.exists({ user: user._id });

  if (hasOrders) {
    return res.status(400).json({
      success: false,
      message:
        "Cannot delete user with existing orders. Please deactivate instead.",
    });
  }

  // Delete user's avatar from local storage if exists
  if (
    user.avatar &&
    user.avatar.public_id &&
    user.avatar.public_id !== "avatar_default"
  ) {
    deleteLocalFileByUrl(user.avatar.url);
  }

  await user.deleteOne();

  res.json({
    success: true,
    message: "User deleted successfully",
  });
});

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private (User can upload their own avatar)
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload an image file",
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Delete old avatar from local storage if exists and not default
  if (
    user.avatar &&
    user.avatar.public_id &&
    user.avatar.public_id !== "avatar_default"
  ) {
    deleteLocalFileByUrl(user.avatar.url);
  }

  // Update avatar with new image
  user.avatar = {
    url: `/uploads/avatars/${req.file.filename}`,
    public_id: req.file.filename,
  };

  await user.save();

  res.json({
    success: true,
    message: "Avatar uploaded successfully",
    avatar: user.avatar,
  });
});

// @desc    Delete user avatar
// @route   DELETE /api/users/avatar
// @access  Private (User can delete their own avatar)
exports.deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Delete avatar from local storage if exists
  if (
    user.avatar &&
    user.avatar.public_id &&
    user.avatar.public_id !== "avatar_default"
  ) {
    deleteLocalFileByUrl(user.avatar.url);
  }

  // Reset to default avatar
  user.avatar = {
    url: DEFAULT_AVATAR_URL,
    public_id: "avatar_default",
  };

  await user.save();

  res.json({
    success: true,
    message: "Avatar deleted successfully",
    avatar: user.avatar,
  });
});

// @desc    Get user statistics (Admin)
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = asyncHandler(async (req, res) => {
  // Total users count
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const inactiveUsers = await User.countDocuments({ isActive: false });
  const adminUsers = await User.countDocuments({ role: "admin" });
  const regularUsers = await User.countDocuments({ role: "user" });

  // New users by month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthlyUsers = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        count: 1,
      },
    },
  ]);

  // Users by registration date (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newUsersLast7Days = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  // Users by registration date (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newUsersLast30Days = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  // Top spending users
  const topSpenders = await Order.aggregate([
    {
      $match: { status: "Delivered" },
    },
    {
      $group: {
        _id: "$user",
        totalSpent: { $sum: "$totalPrice" },
        orderCount: { $sum: 1 },
      },
    },
    {
      $sort: { totalSpent: -1 },
    },
    {
      $limit: 10,
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    {
      $unwind: "$userInfo",
    },
    {
      $project: {
        _id: 1,
        name: "$userInfo.name",
        email: "$userInfo.email",
        totalSpent: 1,
        orderCount: 1,
      },
    },
  ]);

  res.json({
    success: true,
    statistics: {
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        regularUsers,
        newUsersLast7Days,
        newUsersLast30Days,
      },
      monthlyGrowth: monthlyUsers,
      topSpenders,
    },
  });
});

// @desc    Search users (Admin)
// @route   GET /api/users/search
// @access  Private/Admin
exports.searchUsers = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Search query must be at least 2 characters",
    });
  }

  const users = await User.find({
    $or: [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ],
  })
    .select("name email phone role isActive avatar")
    .limit(Number(limit));

  res.json({
    success: true,
    count: users.length,
    users,
  });
});

// @desc    Bulk update users (Admin)
// @route   PUT /api/users/bulk-update
// @access  Private/Admin
exports.bulkUpdateUsers = asyncHandler(async (req, res) => {
  const { userIds, updates } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide an array of user IDs",
    });
  }

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide updates",
    });
  }

  // Allowed bulk update fields
  const allowedFields = ["isActive", "role"];
  const updateData = {};

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key)) {
      updateData[key] = updates[key];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid update fields provided",
    });
  }

  // Prevent updating own account in bulk
  if (userIds.includes(req.user._id.toString())) {
    return res.status(400).json({
      success: false,
      message: "Cannot bulk update your own account",
    });
  }

  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: updateData },
  );

  res.json({
    success: true,
    message: `Successfully updated ${result.modifiedCount} users`,
    modifiedCount: result.modifiedCount,
  });
});
