import { useState, useRef, useEffect } from "react";
import { TbBrain } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";
import { startSpeechToTextStreaming } from '../utils/speechToTextStreaming';
import { speakWithDeepgram } from '../utils/textToSpeech';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';
import { RiRobot2Line } from "react-icons/ri";
import { FaGlobe, FaLightbulb } from "react-icons/fa";
import { CiGlobe } from "react-icons/ci";
import { RiSparkling2Fill, RiVoiceprintFill } from "react-icons/ri";
import { MdAttachFile } from "react-icons/md";
import { SiGoogle, SiOpenai, SiMeta, SiClaude } from 'react-icons/si'


function MessageInput({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [overlayMessages, setOverlayMessages] = useState([]);
  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const stopRef = useRef(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const [models, setModels] = useState([
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", cost: "Free/Cheap", icon: SiGoogle },
    { id: "gpt-4o-mini", name: "GPT-4o-mini", cost: "Low", icon: SiOpenai },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", cost: "Free/Cheap", icon: SiClaude },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", cost: "Free", icon: SiMeta },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const processingTimeoutRef = useRef(null);
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
  const [deepResearch, setDeepResearch] = useState(false);
  const textareaRef = useRef(null);
  const [threadId, setThreadId] = useState(null);
  const [useCognioAgent, setUseCognioAgent] = useState(false);

  const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

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

              // Format messages for API using the format main.py expects
              const messages = [
                { role: "user", content: data.content }
              ];

              const endpoint = useAgent 
                ? `${PYTHON_API_URL}/api/react-search` 
                : `${PYTHON_API_URL}/api/chat`;

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messages: messages,
                  model: selectedModel,
                  thread_id: threadId,
                  file_url: uploadedFile || null,
                  use_agent: useAgent,
                  deep_research: deepResearch,
                  stream: false
                }),
                signal: abortControllerRef.current.signal
              });

              if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
              }

              const responseData = await response.json();

              if (currentRequestRef.current === currentRequest) {
                // Update thread ID for future interactions
                if (responseData.thread_id) {
                  setThreadId(responseData.thread_id);
                }
                
                const assistantContent = responseData.message?.content || "No response content";
                setOverlayMessages(prev => [...prev, { type: 'assistant', content: assistantContent }]);
                onSendMessage(assistantContent, "assistant");

                if (!isMuted) {
                  setIsAISpeaking(true);
                  try {
                    await speakWithDeepgram(assistantContent);
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
                // User canceled
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
  
      // Format message for the API in the structure main.py expects
      const formattedMessages = [
        { role: "user", content: currentMessage }
      ];
      
      const endpoint = useAgent 
        ? `${PYTHON_API_URL}/api/react-search` 
        : `${PYTHON_API_URL}/api/chat`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: formattedMessages,
          model: selectedModel,
          thread_id: threadId,
          file_url: uploadedFile || null,
          use_agent: useAgent,
          deep_research: deepResearch,
          stream: true
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
            break;
          }
  
          const chunkText = new TextDecoder().decode(value);
          const lines = chunkText.split('\n').filter(line => line.trim());
  
          for (const line of lines) {
            try {
              const jsonData = JSON.parse(line);
              
              // Handle different message types from the streaming endpoint
              if (jsonData.type === "status") {
                // Status updates - can be shown in UI if needed
                console.log("Status:", jsonData.status);
              } 
              else if (jsonData.type === "chunk") {
                // Send each chunk immediately without accumulating
                if (currentRequestRef.current === requestId) {
                  onSendMessage(jsonData.chunk || "", "assistant", true, true);
                }
              }
              else if (jsonData.type === "result") {
                // Final result with complete message
                if (jsonData.message?.content) {
                  accumulatedResponse = jsonData.message.content;
                  
                  if (currentRequestRef.current === requestId) {
                    onSendMessage(accumulatedResponse, "assistant", false);
                  }
                }
                
                // Store thread_id for future requests
                if (jsonData.thread_id) {
                  setThreadId(jsonData.thread_id);
                }
              }
              else if (jsonData.type === "done") {
                // Stream is complete
                if (currentRequestRef.current === requestId) {
                  onSendMessage(accumulatedResponse, "assistant", false);
                }
                
                // Store thread_id for future requests
                if (jsonData.thread_id) {
                  setThreadId(jsonData.thread_id);
                }
              }
            } catch (parseError) {
              console.error("Error parsing streaming response:", parseError, line);
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

      // Update to use the endpoint from main.py
      const response = await fetch(`${PYTHON_API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadedFile(data.file_path);
      
      onSendMessage(`Uploaded file: ${file.name}`, "user");
    } catch (error) {
      console.error('Upload error:', error);
      onSendMessage("Failed to upload file. Please try again.", "system");
    }
  };

  const getModelIcon = (modelId) => {
    const model = models.find(m => m.id === modelId);
    const iconType = model?.icon || "default";
    
    switch (iconType) {
      case "google":
        return <TbBrandGoogleFilled className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
      case "openai":
        return <SiOpenai className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
      case "anthropic":
        return <TbBrain className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
      case "groq":
        return <RiSparkling2Fill className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
      default:
        return <RiSparkling2Fill className="h-3 w-3 sm:h-4 sm:w-4 text-[#cc2b5e]" />;
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

  return (
    <>
      <div className="w-full max-w-[95%] xs:max-w-[90%] sm:max-w-2xl md:max-w-3xl mx-auto mb-4">
        <motion.form
          onSubmit={handleSubmit}
          className="relative rounded-xl sm:rounded-2xl bg-white/[0.2] backdrop-blur-xl text-white px-2 sm:px-3 pt-4 sm:pt-5 pb-10 sm:pb-12 shadow-[0_0_20px_rgba(204,43,94,0.3)] hover:shadow-[0_0_30px_rgba(204,43,94,0.5)]"
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="Ask me anything..."
            className="relative w-full pl-1 sm:pl-2 pr-4 sm:pr-6 py-1 sm:py-2 -mt-1 bg-transparent outline-none text-sm sm:text-base resize-none overflow-hidden min-h-[36px] placeholder-white/40"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          <div className="absolute left-1.5 sm:left-2 md:left-4 bottom-2.5 sm:bottom-3 md:bottom-3.5 flex items-center space-x-1.5 sm:space-x-2 md:space-x-4">
            <div className="relative group">
              <button 
                type="button"
                onClick={() => setShowModelSelector(!showModelSelector)}
                className={`text-[#cc2b5e] hover:text-[#bd194d] transition-all text-base sm:text-lg md:text-xl p-0.5 sm:p-1 hover:bg-white/10 rounded-full ${
                  showModelSelector ? 'bg-white/10' : ''
                }`}
              >
                <RiSparkling2Fill/>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Select AI Model
              </div>
            </div>
            
            <div className="relative group">
              <button 
                type="button"
                onClick={() => {
                  if (useCognioAgent) {
                    setUseCognioAgent(false);
                  } else {
                    // Turn off other features when enabling AI agent
                    setUseCognioAgent(true);
                    setUseAgent(false);
                    setDeepResearch(false);
                  }
                }}
                className={`text-[#cc2b5e] hover:text-[#bd194d] transition-all text-base sm:text-lg md:text-xl p-0.5 sm:p-1 hover:bg-white/10 rounded-full ${
                  useCognioAgent ? 'bg-white/10' : ''
                } ${useAgent ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={useAgent}
              >
                <FaLightbulb />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                AI Agent
              </div>
            </div>
            
            <div className="relative group">
              <button 
                type="button"
                onClick={() => {
                  if (useAgent) {
                    setUseAgent(false);
                  } else {
                    // Turn off other features when enabling web search
                    setUseAgent(true);
                    setUseCognioAgent(false);
                    setDeepResearch(false);
                  }
                }}
                className={`text-[#cc2b5e] hover:text-[#bd194d] transition-all text-base sm:text-lg md:text-xl p-0.5 sm:p-1 hover:bg-white/10 rounded-full ${
                  useAgent ? 'bg-white/10' : ''
                } ${useCognioAgent ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={useCognioAgent}
              >
                <CiGlobe />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Web Search
              </div>
            </div>
          </div>

          <div className="absolute right-1.5 sm:right-2 md:right-4 bottom-2.5 sm:bottom-3 md:bottom-3.5 flex items-center space-x-1.5 sm:space-x-2 md:space-x-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.mp4"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#cc2b5e] hover:text-[#bd194d] transition-all text-base sm:text-lg md:text-xl p-0.5 sm:p-1 hover:bg-white/10 rounded-full"
            >
              <MdAttachFile />
            </button>
          </div>
        </motion.form>

        <AnimatePresence>
          {showModelSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-4 sm:left-8 bottom-16 sm:bottom-20 w-[240px] xs:w-[260px] sm:w-[300px] md:w-[350px] bg-black/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-1 sm:p-1.5 border border-white/10 z-50"
            >
              <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
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