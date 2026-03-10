const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      district: String,
      ward: String,
      zipCode: String,
      note: String,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: {
        values: ["COD", "Credit Card", "Bank Transfer", "E-Wallet", "PayPal"],
        message: "Invalid payment method",
      },
    },
    paymentResult: {
      id: String,
      status: String,
      updateTime: String,
      emailAddress: String,
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, "Items price cannot be negative"],
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, "Shipping price cannot be negative"],
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, "Tax price cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, "Total price cannot be negative"],
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: Date,
    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Refunded",
      ],
      default: "Pending",
    },
    trackingNumber: String,
    cancelReason: String,
    refundAmount: Number,
    refundedAt: Date,
    notes: String,
  },
  {
    timestamps: true,
  },
);

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });

// Generate order number before saving
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.orderNumber = `ORD${year}${month}${day}${random}`;
  }
  next();
});

// Virtual for full shipping address
orderSchema.virtual("fullShippingAddress").get(function () {
  const addr = this.shippingAddress;
  return [addr.address, addr.ward, addr.district, addr.city]
    .filter(Boolean)
    .join(", ");
});

// Static method to get user orders
orderSchema.statics.getUserOrders = function (userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

// Instance method to mark as paid
orderSchema.methods.markAsPaid = function (paymentResult) {
  this.isPaid = true;
  this.paidAt = Date.now();
  this.paymentResult = paymentResult;
  this.status = "Processing";
};

// Instance method to mark as delivered
orderSchema.methods.markAsDelivered = function () {
  this.isDelivered = true;
  this.deliveredAt = Date.now();
  this.status = "Delivered";
};

// Instance method to cancel order
orderSchema.methods.cancelOrder = function (reason) {
  this.status = "Cancelled";
  this.cancelReason = reason;
};

module.exports = mongoose.model("Order", orderSchema);
