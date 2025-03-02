# Audio-Smith

## Overview
Audio-Smith is a web application that allows users to interact with multiple AI models seamlessly. It consists of three main components:
- **Backend**: Built using Express.js and Node.js for handling API requests and managing the AI models.
- **Frontend**: Developed using Vite, React.js, TailwindCSS, and JavaScript for an interactive user interface.
- **Python Module**: Contains AI model implementations and logic for processing user inputs.

## Features
- Select and switch between multiple AI models dynamically.
- Interactive UI with real-time responses.
- API integration for seamless communication between frontend and backend.
- Python-powered AI model processing.

## Tech Stack
### Backend:
- Node.js
- Express.js
- REST API

### Frontend:
- Vite
- React.js
- TailwindCSS
- JavaScript

### AI Model Processing:
- Python
- AI/ML Libraries (e.g., TensorFlow, PyTorch, OpenAI API, etc.)

## Installation
### Prerequisites
Ensure you have the following installed:
- Node.js & npm
- Python 3.x & pip
- Vite

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   npm install
   node server.js
   ```
2. Add the `.env` file in your backend folder with the following variables:
   ```env
   PORT=5000
   MONGO_URI=
   JWT_SECRET=
   NODE_ENV=development
   GEMINI_API_KEY=
   EMAILJS_SERVICE_ID=
   EMAILJS_TEMPLATE_ID=
   EMAILJS_PUBLIC_KEY=
   EMAILJS_PRIVATE_KEY=
   EMAIL_USER=
   DEEPGRAM_API_KEY=
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   GOOGLE_API_KEY=
   FIREWORKS_API_KEY=
   GROQ_API_KEY=
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Add the `.env` file in your frontend folder with the following variables:
   ```env
   REACT_APP_EMAILJS_SERVICE_ID=
   REACT_APP_EMAILJS_TEMPLATE_ID=
   REACT_APP_EMAILJS_PUBLIC_KEY=
   VITE_DEEPGRAM_API_KEY=
   VITE_OPENAI_API_KEY=
   VITE_ANTHROPIC_API_KEY=
   VITE_GOOGLE_API_KEY=
   VITE_FIREWORKS_API_KEY=
   VITE_GROQ_API_KEY=
   VITE_PYTHON_API_URL=http://localhost:8000  
   ```

### Python Module Setup
1. Navigate to the `python` directory:
   ```bash
   cd python
   pip install -r requirements.txt
   python api.py
   ```
2. Add the `.env` file in your Python folder with the following variables:
   ```env
   DEEPGRAM_API_KEY=
   FIREWORKS_API_KEY=
   GROQ_API_KEY=
   ANTHROPIC_API_KEY=
   GOOGLE_API_KEY=
   OPENAI_API_KEY=
   ```

## Usage
1. Start the backend server at `https://smith-backend-js.vercel.app`.
2. Run the frontend using Vite.
3. Execute the Python script for AI model processing.
4. Access the application in the browser at `http://localhost:5173/`.

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/models` | Get available AI models |
| POST   | `/api/select` | Select an AI model |
| POST   | `/api/process` | Send input to AI model |

## Contributing
1. Fork the repository.
2. Create a new branch: `git checkout -b feature-branch`.
3. Make your changes and commit: `git commit -m 'Add new feature'`.
4. Push to the branch: `git push origin feature-branch`.
5. Submit a pull request.

## License
This project is licensed under the MIT License.
