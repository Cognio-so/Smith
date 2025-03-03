import { useState, useRef, useEffect } from "react";
import { FiMic, FiSend } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi";
import { IoMdAttach } from "react-icons/io";
import { SiOpenai } from "react-icons/si";
import { TbBrandGoogleFilled } from "react-icons/tb";
import { SiClarifai } from "react-icons/si";
import { TbBrain } from "react-icons/tb";
import { FaRobot } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { startSpeechToTextStreaming } from '../utils/speechToTextStreaming';
import { speakWithDeepgram } from '../utils/textToSpeech';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';

function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [overlayMessages, setOverlayMessages] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const stopRef = useRef(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [models, setModels] = useState([
    { id: "gpt-4o-mini", name: "GPT-4o-mini", cost: "Cheapest" },
    { id: "gemini-flash-2.0", name: "Gemini-flash-2.0", cost: "Low" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const processingTimeoutRef = useRef(null);
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const [sessionId, setSessionId] = useState(() => {
    const existingId = localStorage.getItem('chatSessionId');
    if (existingId) return existingId;
    const newId = `session_${Date.now()}`;
    localStorage.setItem('chatSessionId', newId);
    return newId;
  });
  const currentRequestRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const speechTimeoutRef = useRef(null);
  const [selectorPlacement, setSelectorPlacement] = useState("bottom");
  const inputContainerRef = useRef(null);
  const [isAgentChat, setIsAgentChat] = useState(false);

  const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000' || 'https://py-backend-algohype.replit.app';

  const cancelCurrentRequest = () => {
    console.log('🛑 Attempting to cancel current request');
    if (abortControllerRef.current) {
      console.log('🛑 Aborting active request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    console.log('✅ Request cancelled');
  };

  const handleUserSpeechStart = () => {
    console.log('🎤 Speech Start Detected');
    setIsUserSpeaking(true);
    
    if (abortControllerRef.current) {
      console.log('🛑 Cancelling AI response due to user speech');
      cancelCurrentRequest();
      stopSpeaking();
    }
  };

  const handleUserSpeechEnd = () => {
    console.log('🎤 Speech End Detected');
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    
    speechTimeoutRef.current = setTimeout(() => {
      console.log('🎤 Confirming speech end after timeout');
      setIsUserSpeaking(false);
    }, 500);
  };

  const handleVoiceInteraction = async () => {
    if (isRecording) {
      handleOverlayClose();
      return;
    }

    cancelCurrentRequest();

    try {
      setIsRecording(true);
      setOverlayMessages([]);
      
      const handleTranscript = async (data) => {
        try {
          if (data.speech_started) {
            handleUserSpeechStart();
            return;
          }
          if (data.speech_ended) {
            handleUserSpeechEnd();
            return;
          }

          if (!data?.content) return;

          if (data.isFinal && data.confidence >= 0.7) {
            const userMessage = data.content.trim();
            console.log('Final transcript received:', userMessage);
            
            const voiceMessageId = `voice-${Date.now()}`;
            
            setOverlayMessages(prev => [...prev, { type: 'user', content: userMessage }]);
            
            onSendMessage(userMessage, "user", false, voiceMessageId);
            
            try {
              console.log('Sending request to voice-chat endpoint');
              const requestId = Date.now().toString();
              setIsProcessing(true);
              
              const response = await fetch(`${PYTHON_API_URL}/voice-chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Session-ID': sessionId,
                  'X-Request-ID': requestId
                },
                body: JSON.stringify({
                  message: userMessage,
                  model: selectedModel,
                  language: data.language || 'en-US'
                })
              });

              if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
              }

              const responseData = await response.json();
              console.log('Response received:', responseData);
              setIsProcessing(false);
              
              if (responseData.success && responseData.response) {
                const aiResponse = responseData.response.trim();
                
                setOverlayMessages(prev => [...prev, { 
                  type: 'assistant', 
                  content: aiResponse 
                }]);
                
                onSendMessage(aiResponse, "assistant", false, `${voiceMessageId}-response`);
                
                setIsAISpeaking(true);
                try {
                  await speakWithDeepgram(aiResponse, responseData.language);
                } finally {
                  setIsAISpeaking(false);
                }
              }
            } catch (error) {
              setIsProcessing(false);
              console.error('API request error:', error);
              onSendMessage(`Error: ${error.message}`, "system");
            }
          }
        } catch (error) {
          console.error('Transcript processing error:', error);
        }
      };

      const { socket, recorder, stop } = await startSpeechToTextStreaming(handleTranscript);
      socketRef.current = socket;
      recorderRef.current = recorder;
      stopRef.current = stop;

    } catch (error) {
      console.error('Error starting voice interaction:', error);
      setIsRecording(false);
      onSendMessage("Failed to start voice interaction.", "system");
    }
  };

  const handleOverlayClose = () => {
    try {
      if (isRecording) {
        if (stopRef.current) {
          stopRef.current();
        }
        setIsRecording(false);
      }
    } catch (error) {
      console.error('Error closing voice interaction:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    const requestId = Date.now();
    const currentMessage = message.trim();
    cancelCurrentRequest();

    try {
      setIsSubmitting(true);
      setMessage('');
      onSendMessage(currentMessage, "user");

      abortControllerRef.current = new AbortController();
      currentRequestRef.current = requestId;

      const response = await fetch(`${PYTHON_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'X-Request-ID': requestId.toString(),
          'X-Cancel-Previous': 'true'
        },
        body: JSON.stringify({
          message: currentMessage,
          model: selectedModel
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const reader = response.body.getReader();
      let buffer = '';
      let lastUpdateTime = Date.now();
      const updateInterval = 50;
      let accumulatedContent = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        buffer += chunk;
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const message of lines) {
          if (message.startsWith('data: ')) {
            const data = message.slice(6);
            
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsedData = JSON.parse(data);
              
              if (parsedData.content && currentRequestRef.current === requestId) {
                accumulatedContent += parsedData.content;
                
                const now = Date.now();
                if (now - lastUpdateTime >= updateInterval) {
                  onSendMessage(
                    accumulatedContent, 
                    "assistant", 
                    true
                  );
                  
                  if (isFirstChunk) {
                    isFirstChunk = false;
                  }
                  
                  lastUpdateTime = now;
                }
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }

      if (accumulatedContent.trim() && currentRequestRef.current === requestId) {
        onSendMessage(accumulatedContent.trim(), "assistant", false);
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        onSendMessage(`Error: ${error.message}`, "system");
      }
    } finally {
      if (currentRequestRef.current === requestId) {
        setIsSubmitting(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleAgentChatSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    const requestId = Date.now();
    const currentMessage = message.trim();
    cancelCurrentRequest();

    try {
      setIsSubmitting(true);
      setMessage('');
      onSendMessage(currentMessage, "user");

      abortControllerRef.current = new AbortController();
      currentRequestRef.current = requestId;

      const response = await fetch(`${PYTHON_API_URL}/agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'X-Request-ID': requestId.toString(),
        },
        body: JSON.stringify({
          message: currentMessage,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const reader = response.body.getReader();
      let buffer = '';
      let lastUpdateTime = Date.now();
      const updateInterval = 50;
      let accumulatedContent = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        buffer += chunk;

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const message of lines) {
          if (message.startsWith('data: ')) {
            const data = message.slice(6);

            if (data === '[DONE]') {
              break;
            }

            try {
              const parsedData = JSON.parse(data);

              if (parsedData.content && currentRequestRef.current === requestId) {
                accumulatedContent += parsedData.content;

                const now = Date.now();
                if (now - lastUpdateTime >= updateInterval) {
                  onSendMessage(
                    accumulatedContent,
                    "assistant",
                    true
                  );

                  if (isFirstChunk) {
                    isFirstChunk = false;
                  }

                  lastUpdateTime = now;
                }
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }

      if (accumulatedContent.trim() && currentRequestRef.current === requestId) {
        onSendMessage(accumulatedContent.trim(), "assistant", false);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        onSendMessage(`Error: ${error.message}`, "system");
      }
    } finally {
      if (currentRequestRef.current === requestId) {
        setIsSubmitting(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('https://smith-backend-psi.vercel.app/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadedFile(data.fileUrl);
      
      onSendMessage(`Uploaded file: ${file.name}`, "user");
    } catch (error) {
      console.error('Upload error:', error);
      onSendMessage("Failed to upload file. Please try again.", "system");
    }
  };

  const stopSpeaking = () => {
    setIsAISpeaking(false);
  };

  useEffect(() => {
    return () => {
      cancelCurrentRequest();
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (stopRef.current) {
        stopRef.current();
      }
      setIsAISpeaking(false);
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (showModelSelector && inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      const availableBottom = window.innerHeight - rect.bottom;
      const requiredHeight = 150;
      if (availableBottom < requiredHeight) {
        setSelectorPlacement("top");
      } else {
        setSelectorPlacement("bottom");
      }
    }
  }, [showModelSelector]);

  return (
    <div className="px-2 sm:px-4 py-2 sm:py-4 overflow-hidden">
      <motion.form
        ref={inputContainerRef}
        onSubmit={(e) => {
          e.preventDefault();
          if (isAgentChat) {
            handleAgentChatSubmit(e);
          } else {
            handleSubmit(e);
          }
        }}
        className="group relative w-full max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto flex flex-col gap-1 sm:gap-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-2 sm:px-4 py-2 sm:py-3 mb-0"
      >
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (isAgentChat) {
                handleAgentChatSubmit(e);
              } else {
                handleSubmit(e);
              }
            }
          }}
          placeholder={isAgentChat ? "Chat with AI Agent..." : "Type a message..."}
          className="flex-1 bg-transparent text-xs sm:text-sm md:text-base text-white/90 placeholder:text-white/40 focus:outline-none resize-none overflow-hidden min-h-[36px] sm:min-h-[44px] max-h-[100px] sm:max-h-[120px]"
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />

        <div className="flex items-center justify-between">
          <motion.button
            type="button"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className={`flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 md:p-2 rounded-lg transition-all duration-200 ${
              isAgentChat ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
            }`}
            whileHover={{ scale: isAgentChat ? 1 : 1.05 }}
            whileTap={{ scale: isAgentChat ? 1 : 0.95 }}
            disabled={isAgentChat}
          >
            {selectedModel === "gemini-pro" ? (
              <TbBrandGoogleFilled className="h-4 w-4 sm:h-5 sm:w-5 text-[#cc2b5e]" />
            ) : selectedModel === "gpt-3.5-turbo" ? (
              <SiOpenai className="h-4 w-4 sm:h-5 sm:w-5 text-[#cc2b5e]" />
            ) : selectedModel === "claude-3-haiku" ? (
              <TbBrain className="h-4 w-4 sm:h-5 sm:w-5 text-[#cc2b5e]" />
            ) : selectedModel === "llama-v2-7b" ? (
              <SiClarifai className="h-4 w-4 sm:h-5 sm:w-5 text-[#cc2b5e]" />
            ) : (
              <HiSparkles className="h-4 w-4 sm:h-5 sm:w-5 text-[#cc2b5e]" />
            )}
            <span className="text-[9px] sm:text-[10px] md:text-xs text-[#cc2b5e]">
              {models.find(m => m.id === selectedModel)?.name}
            </span>
          </motion.button>

          <div className="flex items-center gap-1 sm:gap-2">
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-1 sm:p-2 rounded-lg transition-all duration-200 ${
                isAgentChat ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
              }`}
              whileHover={{ scale: isAgentChat ? 1 : 1.05 }}
              whileTap={{ scale: isAgentChat ? 1 : 0.95 }}
              disabled={isAgentChat}
            >
              <IoMdAttach className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />
            </motion.button>

            <motion.button
              type="button"
              onClick={handleVoiceInteraction}
              className={`p-1 sm:p-2 rounded-lg transition-all duration-200 ${
                isAgentChat ? 'opacity-50 cursor-not-allowed' : 
                isRecording ? 'bg-red-500/20' : 'hover:bg-white/5'
              }`}
              whileHover={{ scale: isAgentChat ? 1 : 1.05 }}
              whileTap={{ scale: isAgentChat ? 1 : 0.95 }}
              disabled={isAgentChat}
            >
              <FiMic className={`h-3 w-3 sm:h-4 sm:w-4 ${
                isRecording ? 'text-red-400' : 'text-[#cc2b5e]'
              }`} />
            </motion.button>

            <motion.button
              type="button"
              onClick={() => {
                setIsAgentChat(!isAgentChat);
                if (!isAgentChat) {
                  setShowModelSelector(false);
                }
              }}
              className={`p-1 sm:p-2 rounded-lg transition-all duration-200 ${
                isAgentChat ? 'bg-blue-500/20' : 'hover:bg-white/5'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaRobot className={`h-3 w-3 sm:h-4 sm:w-4 ${isAgentChat ? 'text-blue-400' : 'text-[#cc2b5e]'}`} />
            </motion.button>

            <motion.button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className={`p-1 sm:p-2 rounded-lg transition-all duration-200 ${
                message.trim() ? 'bg-[#cc2b5e] hover:bg-[#cc2b5e]/90' : 'hover:bg-white/5'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiSend className={`h-3 w-3 sm:h-4 sm:w-4 ${
                message.trim() ? 'text-white' : 'text-[#cc2b5e]'
              }`} />
            </motion.button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.mp4"
        />

<AnimatePresence>
  {showModelSelector && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed bottom-[calc(100%+0.5rem)] w-[200px] sm:w-[250px] md:w-[300px] bg-black rounded-xl p-1 sm:p-1.5 border border-white/10 z-[9999] h-[100px] sm:h-[120px] shadow-lg"
      style={{
        bottom: `calc(${inputContainerRef.current?.getBoundingClientRect().height || 0}px + 0.5rem)`,
        left: `${inputContainerRef.current?.getBoundingClientRect().left - 40}px`,
        ...(selectorPlacement === "top" && {
          bottom: 'unset',
          top: `calc(${inputContainerRef.current?.getBoundingClientRect().top}px - 0.5rem - ${100}px)` // Adjusted top placement
        })
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 overflow-hidden">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => {
              setSelectedModel(model.id);
              setShowModelSelector(false);
            }}
            className={`p-0.5 rounded-lg text-white/80 hover:bg-white/10 transition-all duration-200 flex flex-col items-center justify-center gap-0.5 ${
              selectedModel === model.id ? 'bg-white/20' : ''
            }`}
          >
            {model.id === "gpt-3.5-turbo" ? (
              <SiOpenai className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#cc2b5e]" />
            ) : model.id === "gpt-4o-mini" ? (
              <SiOpenai className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#cc2b5e]" />
            ) : model.id === "gemini-flash-2.0" ? (
              <TbBrandGoogleFilled className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#cc2b5e]" />
            ) : model.id === "claude-3.5-haiku" ? (
              <TbBrain className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#cc2b5e]" />
            ) : model.id === "llama-3.3" ? (
              <SiClarifai className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#cc2b5e]" />
            ) : (
              <HiSparkles className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#cc2b5e]" />
            )}
            <span className="text-center text-[6px] sm:text-[8px] md:text-[9px] leading-tight">
              {model.name}
            </span>
            <span className="text-[5px] sm:text-[6px] opacity-60">{model.cost}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )}
</AnimatePresence>
      </motion.form>

      {isRecording && (
        <VoiceRecordingOverlay
          onClose={handleOverlayClose}
          isRecording={isRecording}
          onMuteToggle={(muted) => setIsMuted(muted)}
          messages={overlayMessages}
          isUserSpeaking={isUserSpeaking}
          isAISpeaking={isAISpeaking}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

export default MessageInput;
