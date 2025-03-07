const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize GoogleGenerativeAI with error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || (() => {
  console.error('GEMINI_API_KEY is not set');
  throw new Error('Missing GEMINI_API_KEY');
})());

const generateSummary = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Messages array is required and must not be empty"
      });
    }

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
    // Ensure user is authenticated via protectRoutes
    if (!req.user) {
      console.error('User not authenticated');
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
        details: 'Authentication cookie missing or invalid'
      });
    }

    const { messages } = req.body;

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages input:', messages);
      return res.status(400).json({
        success: false,
        message: "Messages array is required and must not be empty",
        received: messages
      });
    }

    const formattedMessages = messages.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Generate a brief, engaging title (max 5 words) for this conversation:\n\n${formattedMessages}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const title = response.text();

    res.json({
      success: true,
      title: title.slice(0, 50)
    });
  } catch (error) {
    console.error('Title generation error:', error);

    if (error.message.includes('API key') || error.message.includes('Missing GEMINI_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error: Missing or invalid API key",
        error: "Contact administrator"
      });
    }

    res.status(500).json({
      success: false,
      message: "Error generating title",
      error: error.message
    });
  }
};

module.exports = { generateSummary, generateTitle };