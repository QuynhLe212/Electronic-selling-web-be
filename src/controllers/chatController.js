const ChatConversation = require("../models/ChatConversation");
const aiService = require("../services/aiService");
const { asyncHandler } = require("../middleware/errorHandler");
const { v4: uuidv4 } = require("uuid");

// @desc    Create new chat session
// @route   POST /api/chat/session
// @access  Public
exports.createSession = asyncHandler(async (req, res) => {
  const sessionId = uuidv4();

  res.json({
    success: true,
    sessionId,
  });
});

// @desc    Send message to AI chatbot
// @route   POST /api/chat/message
// @access  Public
exports.sendMessage = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "Session ID is required",
    });
  }

  const userId = req.user?._id;

  // Find or create conversation
  let conversation = await ChatConversation.findOne({ sessionId });

  if (!conversation) {
    conversation = new ChatConversation({
      sessionId,
      user: userId,
      messages: [],
      isActive: true,
    });
  }

  // Add user message
  conversation.addMessage("user", message);

  // Get recent messages for context
  const recentMessages = conversation.getRecentMessages(10);

  // Get related products
  const relatedProductIds = conversation.relatedProducts || [];

  try {
    // Generate AI response
    const aiResponse = await aiService.generateResponse(
      message,
      recentMessages,
      relatedProductIds,
    );

    // Add assistant response
    conversation.addMessage("assistant", aiResponse.message);

    // Analyze intent
    const intent = await aiService.analyzeIntent(message);
    conversation.intent = intent;

    // Update related products
    if (
      aiResponse.suggestedProducts &&
      aiResponse.suggestedProducts.length > 0
    ) {
      const newProductIds = aiResponse.suggestedProducts.map((p) => p._id);
      conversation.relatedProducts = [
        ...new Set([...relatedProductIds, ...newProductIds]),
      ];
    }

    await conversation.save();

    res.json({
      success: true,
      message: aiResponse.message,
      suggestedProducts: aiResponse.suggestedProducts || [],
      sessionId: conversation.sessionId,
      intent,
    });
  } catch (error) {
    console.error("AI Service Error:", error);

    // Fallback response
    const fallbackMessage =
      "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ của chúng tôi.";
    conversation.addMessage("assistant", fallbackMessage);
    await conversation.save();

    res.status(200).json({
      success: true,
      message: fallbackMessage,
      suggestedProducts: [],
      sessionId: conversation.sessionId,
    });
  }
});

// @desc    Get conversation history
// @route   GET /api/chat/conversation/:sessionId
// @access  Public
exports.getConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const conversation = await ChatConversation.findOne({ sessionId }).populate(
    "relatedProducts",
    "name price images category brand stock",
  );

  if (!conversation) {
    return res.json({
      success: true,
      messages: [],
      relatedProducts: [],
    });
  }

  res.json({
    success: true,
    messages: conversation.messages,
    relatedProducts: conversation.relatedProducts || [],
    intent: conversation.intent,
    messageCount: conversation.messageCount,
  });
});

// @desc    Clear conversation
// @route   DELETE /api/chat/conversation/:sessionId
// @access  Public
exports.clearConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  await ChatConversation.findOneAndUpdate(
    { sessionId },
    {
      messages: [],
      relatedProducts: [],
      isActive: false,
      intent: null,
    },
  );

  res.json({
    success: true,
    message: "Conversation cleared successfully",
  });
});

// @desc    Get all conversations (Admin)
// @route   GET /api/chat/conversations
// @access  Private/Admin
exports.getAllConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isActive } = req.query;

  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const conversations = await ChatConversation.find(query)
    .populate("user", "name email")
    .sort({ updatedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await ChatConversation.countDocuments(query);

  res.json({
    success: true,
    conversations,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
      total: count,
    },
  });
});

// @desc    Get chat statistics (Admin)
// @route   GET /api/chat/stats
// @access  Private/Admin
exports.getChatStats = asyncHandler(async (req, res) => {
  const totalConversations = await ChatConversation.countDocuments();
  const activeConversations = await ChatConversation.countDocuments({
    isActive: true,
  });

  // Average messages per conversation
  const avgMessages = await ChatConversation.aggregate([
    {
      $project: {
        messageCount: { $size: "$messages" },
      },
    },
    {
      $group: {
        _id: null,
        avgCount: { $avg: "$messageCount" },
      },
    },
  ]);

  // Most common intents
  const intentStats = await ChatConversation.aggregate([
    {
      $match: { intent: { $exists: true, $ne: null } },
    },
    {
      $group: {
        _id: "$intent",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  res.json({
    success: true,
    statistics: {
      totalConversations,
      activeConversations,
      averageMessages: avgMessages[0]?.avgCount || 0,
      intents: intentStats,
    },
  });
});
