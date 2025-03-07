const { GoogleGenerativeAI } = require('@google/generative-ai');

// Production-safe initialization
const initializeAI = () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } catch (error) {
    console.error('[CRITICAL] Failed to initialize Gemini AI:', error);
    return null;
  }
};

const genAI = initializeAI();

const generateSummary = async (req, res) => {
  try {
    const { messages } = req.body;
    
    // Format messages for Gemini
    const formattedMessages = messages.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Please summarize this conversation in 2-3 sentences:\n\n${formattedMessages}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      summary: text
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({
      success: false,
      message: "Error generating summary",
      error: error.message
    });
  }
};

const generateTitle = async (req, res) => {
  try {
    // Production safety checks
    if (!genAI) {
      throw new Error('AI service is not available');
    }

    const { messages } = req.body;
    
    // Strict validation for production
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "Invalid messages format"
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No messages provided"
      });
    }

    // Production-safe message processing
    const relevantMessages = messages
      .slice(0, 3)
      .filter(msg => msg && msg.content && msg.role)
      .map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' 
          ? msg.content.slice(0, 500)
          : JSON.stringify(msg.content).slice(0, 500)
      }));

    if (relevantMessages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid messages found"
      });
    }

    const formattedMessages = relevantMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Production-safe timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Title generation timed out')), 10000)
    );

    const generatePromise = model.generateContent(
      `Generate a brief, engaging title (max 5 words) for this conversation. Return only the title without quotes or additional text:\n\n${formattedMessages}`
    );

    // Race against timeout
    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = await result.response;
    const title = response.text().trim();

    if (!title) {
      throw new Error('Generated title is empty');
    }

    res.json({
      success: true,
      title: title.slice(0, 50)
    });

  } catch (error) {
    // Production-safe error handling
    const errorMessage = process.env.NODE_ENV === 'development'
      ? 'Error generating title'
      : error.message;

    console.error('[Title Generation Error]:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      userId: req.user?.id || 'unknown',
      messageCount: messages?.length || 0
    });

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
};

module.exports = { generateSummary, generateTitle }; 