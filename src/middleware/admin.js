// Admin only access
exports.adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Please login.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  next();
};

// Check if user is admin or owner of resource
exports.adminOrOwner = (resourceUserField = "user") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login.",
      });
    }

    // Admin can access everything
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user owns the resource
    const resource = req.resource; // Resource should be attached by previous middleware

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    const resourceUserId =
      resource[resourceUserField]?.toString() || resource[resourceUserField];
    const currentUserId = req.user._id.toString();

    if (resourceUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own resources.",
      });
    }

    next();
  };
};

// Log admin actions
exports.logAdminAction = (action) => {
  return (req, res, next) => {
    if (req.user && req.user.role === "admin") {
      console.log(
        `[ADMIN ACTION] ${action} by ${req.user.email} at ${new Date().toISOString()}`,
      );
    }
    next();
  };
};
