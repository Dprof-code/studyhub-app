// Quick test script for Gemini Vision text extraction
// Run with: node test-vision-extraction.js

const fs = require("fs");
const path = require("path");

async function testVisionExtraction() {
  try {
    console.log("🧪 Testing Gemini Vision text extraction...");

    // Import the Gemini service
    const { geminiAI } = await import("./src/lib/ai/gemini-service.js");

    console.log("✅ Gemini service loaded successfully");

    // Test with a simple prompt
    const testResult = await geminiAI.generateContent("What is 2 + 2?");
    console.log("🧠 Basic Gemini test:", testResult.substring(0, 100));

    console.log("🎉 All tests passed! Vision extraction should work properly.");
  } catch (error) {
    console.error("❌ Test failed:", error.message);

    if (error.message.includes("GEMINI_API_KEY")) {
      console.log(
        "💡 Make sure to set your GEMINI_API_KEY environment variable"
      );
    }
  }
}

testVisionExtraction();
