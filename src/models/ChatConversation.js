const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant", "system"],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: [5000, "Message content cannot exceed 5000 characters"],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
});

const chatConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [messageSchema],
      validate: {
        validator: function (messages) {
          return messages.length <= 100; // Limit messages per conversation
        },
        message: "Conversation cannot exceed 100 messages",
      },
    },
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    intent: {
      type: String,
      enum: [
        "product_inquiry",
        "comparison",
        "specification",
        "price_inquiry",
        "recommendation",
        "general",
        "support",
      ],
    },
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    language: {
      type: String,
      default: "vi",
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      referrer: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
chatConversationSchema.index({ sessionId: 1 });
chatConversationSchema.index({ user: 1, createdAt: -1 });
chatConversationSchema.index({ isActive: 1, updatedAt: 1 });

// TTL index - Auto-delete inactive conversations after 30 days
chatConversationSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { isActive: false },
  },
);

// Virtual for message count
chatConversationSchema.virtual("messageCount").get(function () {
  return this.messages.length;
});

// Instance method to add message
chatConversationSchema.methods.addMessage = function (
  role,
  content,
  metadata = {},
) {
  this.messages.push({
    role,
    content,
    metadata,
    timestamp: new Date(),
  });

  // Keep only last 100 messages
  if (this.messages.length > 100) {
    this.messages = this.messages.slice(-100);
  }
};

// Instance method to get recent messages
chatConversationSchema.methods.getRecentMessages = function (count = 10) {
  return this.messages.slice(-count);
};

// Static method to cleanup old conversations
chatConversationSchema.statics.cleanupOldConversations = async function (
  daysOld = 30,
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    isActive: false,
    updatedAt: { $lt: cutoffDate },
  });
};

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
