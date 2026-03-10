const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not found in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
});

// Test AI connection
const testAIConnection = async () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("⚠️  Skipping AI test - No API key provided");
      return;
    }
    const result = await model.generateContent("Hello");
    const response = await result.response;
    console.log("✅ Google Gemini AI connected successfully");
  } catch (error) {
    console.error("❌ Google Gemini AI connection failed:", error.message);
  }
};

if (process.env.NODE_ENV === "development") {
  testAIConnection();
}

module.exports = { model, genAI };
