const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    const { messages } = req.body;
    
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
      title: title.slice(0, 50) // Limit title length
    });
  } catch (error) {
    console.error('Title generation error:', error);
    res.status(500).json({
      success: false,
      message: "Error generating title",
      error: error.message
    });
  }
};

module.exports = { generateSummary, generateTitle }; 