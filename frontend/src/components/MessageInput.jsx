import { useState, useRef, useEffect } from "react";
import { FiMic, FiSend } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi";
import { IoMdAttach } from "react-icons/io";
import { SiOpenai } from "react-icons/si";
import { TbBrandGoogleFilled } from "react-icons/tb";
import { SiClarifai } from "react-icons/si";
import { TbBrain } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";
import { startSpeechToTextStreaming } from '../utils/speechToTextStreaming';
import { speakWithDeepgram } from '../utils/textToSpeech';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';

function MessageInput({ onSendMessage, isLoading }) {
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
  const [selectedModel, setSelectedModel] = useState("gemini-pro");
  const [models, setModels] = useState([
    { id: "gemini-pro", name: "Gemini Pro", cost: "Cheapest" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5", cost: "Low" },
    { id: "claude-3-haiku", name: "Claude Haiku", cost: "Low" },
    { id: "llama-v2-7b", name: "Llama2 7B", cost: "Free" },
    { id: "mixtral-8x7b", name: "Mixtral 8x7B", cost: "Low" }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const processingTimeoutRef = useRef(null);
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const [sessionId, setSessionId] = useState(() => {
    // Get existing session ID or create a new one
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
  const [useAgent, setUseAgent] = useState(false);

  const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

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
    
    // Cancel ongoing AI response
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
          console.log('📝 Received transcript data:', data);

          // Handle speech events
          if (data.speech_started) {
            console.log('🎤 Speech start event received');
            handleUserSpeechStart();
            return;
          }
          if (data.speech_ended) {
            console.log('🎤 Speech end event received');
            handleUserSpeechEnd();
            return;
          }

          if (!data?.content) {
            console.warn('⚠️ Invalid transcript data received');
            return;
          }

          // Process transcript
          if (!data.isFinal && (!data.confidence || data.confidence < 0.85)) {
            console.log('⏳ Skipping low confidence interim result');
            return;
          }

          console.log(`📝 Processing ${data.isFinal ? 'final' : 'interim'} transcript:`, data.content);
          
          if (data.isFinal) {
            console.log('🎯 Processing final transcript');
            cancelCurrentRequest();
            
            setOverlayMessages(prev => [...prev, { type: 'user', content: data.content }]);
            onSendMessage(data.content, "user");

            try {
              abortControllerRef.current = new AbortController();
              currentRequestRef.current = Date.now();
              const currentRequest = currentRequestRef.current;

              console.log('🚀 Sending request to API');
              const response = await fetch(`${PYTHON_API_URL}/voice-chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Session-ID': sessionId,
                  'X-Request-ID': currentRequest.toString()
                },
                body: JSON.stringify({
                  message: data.content,
                  model: selectedModel,
                  language: data.language || 'en-US'
                }),
                signal: abortControllerRef.current.signal
              });

              if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
              }

              const responseData = await response.json();
              console.log('✅ Received API response:', responseData);

              if (currentRequestRef.current === currentRequest) {
                setOverlayMessages(prev => [...prev, { type: 'assistant', content: responseData.response }]);
                onSendMessage(responseData.response, "assistant");

                // Add speech synthesis
                if (!isMuted) {
                  setIsAISpeaking(true);
                  try {
                    await speakWithDeepgram(responseData.response);
                  } catch (error) {
                    console.error('Speech synthesis error:', error);
                  } finally {
                    setIsAISpeaking(false);
                  }
                }
              }
            } catch (error) {
              console.error('❌ API request error:', error);
              if (error.name === 'AbortError') {
                console.log('🛑 Request was cancelled');
              } else {
                onSendMessage(`Error: ${error.message}`, "system");
              }
            }
          }
        } catch (error) {
          console.error('❌ Transcript processing error:', error);
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
        setOverlayMessages([]);
      }
    } catch (error) {
      console.error('Error closing voice interaction:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting) {
        return;
    }

    const requestId = Date.now();
    const currentMessage = message.trim();

    cancelCurrentRequest();
    
    try {
        setIsSubmitting(true);
        setMessage('');
        onSendMessage(currentMessage, "user");

        abortControllerRef.current = new AbortController();
        currentRequestRef.current = requestId;

        stopSpeaking();

        const token = localStorage.getItem('token');
        const endpoint = useAgent ? `${PYTHON_API_URL}/agent-chat` : `${PYTHON_API_URL}/chat`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
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

        // Handle streaming response
        const reader = response.body.getReader();
        let accumulatedResponse = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                // Decode the chunk
                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');
                
                // Process each line
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            break;
                        }
                        
                        try {
                            accumulatedResponse += data;
                            if (currentRequestRef.current === requestId) {
                                onSendMessage(accumulatedResponse, "assistant", true);
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted:', error);
            } else {
                throw error;
            }
        }

    } catch (error) {
        if (error.name !== 'AbortError') {
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
      const response = await fetch('http://localhost:5000/api/upload', {
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
      
      // Send a message about the uploaded file
      onSendMessage(`Uploaded file: ${file.name}`, "user");
    } catch (error) {
      console.error('Upload error:', error);
      onSendMessage("Failed to upload file. Please try again.", "system");
    }
  };

  const getModelIcon = (modelId) => {
    switch (modelId) {
      case "gemini-pro":
        return <TbBrandGoogleFilled className="h-4 w-4 text-[#cc2b5e]" />;
      case "gpt-3.5-turbo":
        return <SiOpenai className="h-4 w-4 text-[#cc2b5e]" />;
      case "claude-3-haiku":
        return <TbBrain className="h-4 w-4 text-[#cc2b5e]" />;
      case "llama-v2-7b":
        return <SiClarifai className="h-4 w-4 text-[#cc2b5e]" />;
      case "mixtral-8x7b":
        return <HiSparkles className="h-4 w-4 text-[#cc2b5e]" />;
      default:
        return <HiSparkles className="h-4 w-4 text-[#cc2b5e]" />;
    }
  };

  const stopSpeaking = () => {
    // Add any cleanup for ongoing speech synthesis
    setIsAISpeaking(false);
    // You might need to add a method to stop ongoing speech in your speakWithDeepgram utility
  };

  // Clean up on unmount
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
    // Initialize session ID if not exists
    if (!sessionId) {
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
    }
  }, [sessionId]);

  return (
    <>
      <div className="px-2 sm:px-4 py-2 sm:py-4">
        <motion.form
          onSubmit={handleSubmit}
          className={`group relative rounded-2xl transition-all duration-300 w-full max-w-3xl mx-auto 
            ${isFocused 
              ? 'bg-white/[0.05] shadow-[0_0_20px_rgba(204,43,94,0.3)]' 
              : 'bg-white/[0.03]'
            } backdrop-blur-xl border border-white/20`}
        >
          {/* Background glow effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] opacity-0 
              group-hover:opacity-20 transition-opacity duration-300 blur-2xl rounded-2xl"
            initial={{ opacity: 0 }}
            whileHover={{ 
              opacity: 0.25,
              transition: { duration: 0.3 }
            }}
          />

          {/* Existing form content */}
          <div className="relative z-10">
            <div className="relative flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 sm:p-3">
              <motion.button
                type="button"
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {getModelIcon(selectedModel)}
                <span className="text-[10px] sm:text-xs text-[#cc2b5e]">
                  {models.find(m => m.id === selectedModel)?.name}
                </span>
              </motion.button>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Message Audio-Smith..."
                className="w-full sm:w-auto flex-1 bg-transparent px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white/90 placeholder:text-white/40 focus:outline-none rounded-xl transition-all duration-200 focus:bg-white/5 resize-none overflow-hidden min-h-[44px] max-h-[200px]"
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />

              <div className="flex items-center gap-1 sm:gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.mp4"
                />
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IoMdAttach className="h-4 w-4 text-[#cc2b5e] hover:text-[#753a88] transition-colors duration-200" />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => setUseAgent(prev => !prev)}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    useAgent ? 'bg-gradient-to-r from-[#cc2b5e] to-[#753a88]' : 'hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={useAgent ? "Agent Mode" : "Standard Mode"}
                >
                  <TbBrain className={`h-4 w-4 ${
                    useAgent ? 'text-white' : 'text-[#cc2b5e] hover:text-[#753a88]'
                  } transition-colors duration-200`} />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleVoiceInteraction}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isRecording ? 'bg-red-500/20 hover:bg-red-500/30' : 'hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiMic className={`h-4 w-4 transition-colors duration-200 ${
                    isRecording ? 'text-red-400' : 'text-[#cc2b5e] hover:text-[#753a88]'
                  }`} />
                </motion.button>

                <motion.button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    message.trim() ? 'bg-gradient-to-r from-[#cc2b5e] to-[#753a88] hover:opacity-90' : 'hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiSend className={`h-4 w-4 transition-colors duration-200 ${
                    message.trim() ? 'text-white' : 'text-[#cc2b5e] hover:text-[#753a88]'
                  }`} />
                </motion.button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="absolute bottom-full left-0 right-0 mb-2 flex justify-center">
              <motion.div
                className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-white/70"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Mr-Smith is thinking...
              </motion.div>
            </div>
          )}

          <AnimatePresence>
            {showModelSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full left-0 mb-2 w-[280px] sm:w-[350px] bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 z-50"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelSelector(false);
                      }}
                      className={`p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-all duration-200 flex flex-col items-center justify-center gap-0.5 ${
                        selectedModel === model.id ? 'bg-white/20' : ''
                      }`}
                    >
                      {getModelIcon(model.id)}
                      <span className="text-center text-[8px] sm:text-[10px] leading-tight">
                        {model.name}
                      </span>
                      <span className="text-[8px] opacity-60">{model.cost}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      </div>

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
    </>
  );
}

export default MessageInput;
