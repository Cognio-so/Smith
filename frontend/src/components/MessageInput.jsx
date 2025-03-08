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
import { RiRobot2Line } from "react-icons/ri";

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
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  // Replace the models array with the correct Llama model ID
  const [models, setModels] = useState([
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", cost: "Free/Cheap" },
    { id: "gpt-4o-mini", name: "GPT-4o-mini", cost: "Low" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", cost: "Free/Cheap" },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", cost: "Free" },
  ]);

  // Update the default selected model if needed
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
  const [useAgent, setUseAgent] = useState(false);
  const [useCognioAgent, setUseCognioAgent] = useState(false);

  const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000' || 'https://python-backend-2-algohype.replit.app';

  const cancelCurrentRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
  };

  const handleUserSpeechStart = () => {
    setIsUserSpeaking(true);
    
    if (abortControllerRef.current) {
      cancelCurrentRequest();
      stopSpeaking();
    }
  };

  const handleUserSpeechEnd = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    
    speechTimeoutRef.current = setTimeout(() => {
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

          if (!data?.content) {
            return;
          }

          if (!data.isFinal && (!data.confidence || data.confidence < 0.85)) {
            return;
          }

          if (data.isFinal) {
            cancelCurrentRequest();
            
            setOverlayMessages(prev => [...prev, { type: 'user', content: data.content }]);
            onSendMessage(data.content, "user");

            try {
              abortControllerRef.current = new AbortController();
              currentRequestRef.current = Date.now();
              const currentRequest = currentRequestRef.current;

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

              if (currentRequestRef.current === currentRequest) {
                setOverlayMessages(prev => [...prev, { type: 'assistant', content: responseData.response }]);
                onSendMessage(responseData.response, "assistant");

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
      
      let endpoint = `/chat`;
      
      if (useAgent) {
        endpoint = `/agent-chat`;
      } else if (useCognioAgent) {
        endpoint = `/cognio-agent`;
      }
      
      const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
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
          model: selectedModel,
          file_url: uploadedFile || "",
          web_search_enabled: useCognioAgent ? true : false,
          deep_research: false
        }),
        signal: abortControllerRef.current.signal
      });
  
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
  
      const reader = response.body.getReader();
      let accumulatedResponse = "";
  
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break; // No final onSendMessage call here
          }
  
          const chunkText = new TextDecoder().decode(value);
          const lines = chunkText.split('\n').filter(line => line.trim());
  
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonData = line.substring(6);
              if (jsonData === "[DONE]") {
                // Stream complete, do nothing extra
              } else {
                try {
                  let parsedData;
                  try {
                    parsedData = JSON.parse(jsonData);
                  } catch {
                    parsedData = jsonData; // Fallback to raw string
                  }

                  let contentPiece;
                  if (typeof parsedData === 'object' && parsedData !== null) {
                    contentPiece = parsedData.response || 
                                 parsedData.text || 
                                 parsedData.content || 
                                 JSON.stringify(parsedData);
                  } else {
                    contentPiece = String(parsedData);
                  }

                  accumulatedResponse += contentPiece;

                  if (currentRequestRef.current === requestId) {
                    onSendMessage(accumulatedResponse, "assistant", true); // Send each chunk for real-time typing
                  }
                } catch (parseError) {
                  console.error("Error parsing JSON:", parseError);
                  accumulatedResponse += `[Parse Error: ${parseError.message}]`;
                }
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
      const response = await fetch('https://vercel.com/algo-hype-analytics/smith-backend/api/upload', {
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

  const getModelIcon = (modelId) => {
    switch (modelId) {
      case "gemini-1.5-flash":
        return <TbBrandGoogleFilled className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
      case "gpt-4o-mini":
        return <SiOpenai className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
      case "claude-3-haiku-20240307":
        return <TbBrain className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
      default:
        return <HiSparkles className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
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

  const availableModels = [
    {
      name: "gpt-4o-mini",
      label: "GPT-4o-mini",
      description: "OpenAI's latest flagship model, optimized for speed.",
      icon: <SiOpenai size={18} />,
      cost: "$0.005/1K",
    },
    {
      name: "gemini-1.5-flash",
      label: "Gemini 1.5 Flash",
      description: "Google's lightweight model, balanced for performance and cost.",
      icon: <TbBrandGoogleFilled size={18} />,
      cost: "$0.0005/1K",
    },
    {
      name: "claude-3-haiku-20240307",
      label: "Claude 3 Haiku",
      description: "Anthropic's fastest and most cost-effective model.",
      icon: <SiClarifai size={18} />,
      cost: "$0.0003/1K",
    },
    {
      name: "llama-3.3-70b-versatile",
      label: "Llama 3.3 70B",
      description: "Meta's open-source model, great for research and customization.",
      icon: <TbBrain size={18} />,
      cost: "$0.0002/1K",
    }
  ];

  return (
    <>
      <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 w-full">
        <motion.form
          onSubmit={handleSubmit}
          className={`group relative rounded-lg sm:rounded-xl md:rounded-2xl transition-all duration-300 w-full max-w-full sm:max-w-2xl md:max-w-3xl mx-auto 
            ${isFocused 
              ? 'bg-white/[0.05] shadow-[0_0_15px_rgba(204,43,94,0.3)] sm:shadow-[0_0_20px_rgba(204,43,94,0.3)]' 
              : 'bg-white/[0.03]'
            } backdrop-blur-xl border border-white/20`}
        >
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] opacity-0 
              group-hover:opacity-20 transition-opacity duration-300 blur-lg sm:blur-2xl rounded-lg sm:rounded-xl md:rounded-2xl"
            initial={{ opacity: 0 }}
            whileHover={{ 
              opacity: 0.25,
              transition: { duration: 0.3 }
            }}
          />

          <div className="relative z-10">
            <div className="relative flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-2 p-1 sm:p-2 md:p-3">
              <motion.button
                type="button"
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 md:p-2 rounded-lg sm:rounded-xl hover:bg-white/10 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {getModelIcon(selectedModel)}
                <span className="text-[9px] sm:text-[10px] md:text-xs text-[#cc2b5e]">
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
                className="w-full sm:w-auto flex-1 bg-transparent px-2 sm:px-3 md:px-4 py-1 sm:py-2 md:py-3 text-xs sm:text-sm md:text-base text-white/90 placeholder:text-white/40 focus:outline-none rounded-lg sm:rounded-xl transition-all duration-200 focus:bg-white/5 resize-none overflow-hidden min-h-[36px] sm:min-h-[44px] max-h-[150px] sm:max-h-[200px]"
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
                  className="p-1 sm:p-2 rounded-lg sm:rounded-xl hover:bg-white/10 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IoMdAttach className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e] hover:text-[#753a88] transition-colors duration-200" />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => setUseAgent(!useAgent)}
                  className={`p-1 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                    useAgent ? 'bg-red-500/20 hover:bg-red-500/30' : 'hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={useAgent ? "Using Agent (with web search)" : "Switch to Agent mode"}
                >
                  <RiRobot2Line className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors duration-200 ${
                    useAgent ? 'text-[#cc2b5e]' : 'text-[#cc2b5e] hover:text-[#753a88]'
                  }`} />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => {
                    if (!useCognioAgent) {
                      setUseAgent(false);
                    }
                    setUseCognioAgent(!useCognioAgent);
                  }}
                  className={`p-1 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                    useCognioAgent ? 'bg-purple-500/20 hover:bg-purple-500/30' : 'hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={useCognioAgent ? "Using Cognio Agent" : "Switch to Cognio Agent"}
                >
                  <HiSparkles className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors duration-200 ${
                    useCognioAgent ? 'text-purple-400' : 'text-[#cc2b5e] hover:text-[#753a88]'
                  }`} />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleVoiceInteraction}
                  className={`p-1 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                    isRecording ? 'bg-red-500/20 hover:bg-red-500/30' : 'hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiMic className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors duration-200 ${
                    isRecording ? 'text-red-400' : 'text-[#cc2b5e] hover:text-[#753a88]'
                  }`} />
                </motion.button>

                <motion.button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className={`p-1 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                    message.trim() ? 'bg-gradient-to-r from-[#cc2b5e] to-[#753a88] hover:opacity-90' : 'hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiSend className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors duration-200 ${
                    message.trim() ? 'text-white' : 'text-[#cc2b5e] hover:text-[#753a88]'
                  }`} />
                </motion.button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="absolute bottom-full left-0 right-0 mb-1 sm:mb-2 flex justify-center">
              <motion.div
                className="px-2 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-[10px] sm:text-xs text-white/70"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {useAgent ? "Agent is searching & thinking..." : "Mr-Smith is thinking..."}
              </motion.div>
            </div>
          )}

          <AnimatePresence>
            {showModelSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full left-0 mb-1 sm:mb-2 w-[240px] xs:w-[260px] sm:w-[300px] md:w-[350px] bg-black rounded-lg sm:rounded-xl p-1 sm:p-1.5 border border-white/10 z-50"
              >
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelSelector(false);
                      }}
                      className={`p-1 sm:p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-all duration-200 flex flex-col items-center justify-center gap-0.5 sm:gap-1 ${
                        selectedModel === model.id ? 'bg-white/30' : ''
                      }`}
                    >
                      {getModelIcon(model.id)}
                      <span className="text-center text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] leading-tight">
                        {model.name}
                      </span>
                      <span className="text-[7px] xs:text-[8px] opacity-60">{model.cost}</span>
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