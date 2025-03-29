import { useState, useEffect, useRef } from "react";
import MessageInput from "./MessageInput";
import { motion} from "framer-motion";
import { stopSpeaking } from "../utils/textToSpeech";
import { sendEmailWithPDF } from "../utils/emailService";
import { useAuth } from "../context/AuthContext";
import MessageContentDisplay from "./MessageContentDisplay";
import { MediaGenerationIndicator, MediaLoadingAnimation } from "./MediaComponents";

function ChatContainer({ activeChat, onUpdateChatTitle, isOpen, onChatSaved, onUpdateMessages }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const saveInProgress = useRef(false);
  const pendingMessages = useRef([]);
  const chatIdRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState({});
  const [expandedSources, setExpandedSources] = useState({});
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [generatingMediaType, setGeneratingMediaType] = useState("image");
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [mediaLoadingType, setMediaLoadingType] = useState("image");

  useEffect(() => {
    if (!activeChat?.id) return;
    
    chatIdRef.current = activeChat.id;
    setIsLoadingChat(true);
    
    const loadChat = async () => {
      if (activeChat.id.startsWith("temp_")) {
        setMessages([]);
        setIsFirstMessage(true);
        setIsLoadingChat(false);
        return;
      }
      
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5000/api/chats/${activeChat.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            credentials: "include"
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.chat?.messages) {
          const formattedMessages = data.chat.messages.map((msg, index) => {
            let msgContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            let imgUrl = msg.imageUrl || null;
            
            if (!imgUrl && msg.role === "assistant" && msgContent.includes("Generated image:")) {
              const parts = msgContent.split("Generated image:");
              if (parts.length > 1 && parts[1].trim()) {
                imgUrl = parts[1].trim();
              }
            }
            
            return {
              messageId: msg.messageId || `msg-${Date.now()}-${index}`,
              content: msgContent,
              role: msg.role,
              timestamp: msg.timestamp || new Date().toISOString(),
              ...(imgUrl && { imageUrl: imgUrl })
            };
          });
          
          setMessages(formattedMessages);
          setIsFirstMessage(formattedMessages.length === 0);
        }
      } catch (error) {
        console.error("Error loading chat:", error);
        if (!activeChat.id.startsWith("temp_")) {
          setMessages((prev) => [
            ...prev,
            {
              messageId: `error-${Date.now()}`,
              content: `Error loading chat: ${error.message}`,
              role: "system",
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadChat();
  }, [activeChat?.id]);

  const generateChatTitle = async (messages) => {
    if (!messages || messages.length === 0) return "New Chat";
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/ai/generate-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messages })
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate title");
      }
      
      const data = await response.json();
      
      if (data.success && data.title) {
        return data.title;
      } else {
        const firstMessage = messages[0].content.trim();
        return firstMessage.split(/\s+/).slice(0, 3).join(" ");
      }
    } catch (error) {
      console.error("Error generating title:", error);
      const firstMessage = messages[0].content.trim();
      return firstMessage.split(/\s+/).slice(0, 3).join(" ");
    }
  };

  const saveMessages = async (messagesToSave) => {
    if (!chatIdRef.current || saveInProgress.current) return;
    
    saveInProgress.current = true;

    try {
      console.log("Saving chat:", {
        chatId: chatIdRef.current,
        messageCount: messagesToSave.length
      });

      let chatTitle = activeChat.title;
      if (chatIdRef.current.startsWith("temp_") && messagesToSave.length > 0) {
        chatTitle = await generateChatTitle(messagesToSave);
      }

      const token = localStorage.getItem("token");
      const isTemporaryChat = chatIdRef.current.startsWith("temp_");
      
      const endpoint = isTemporaryChat 
        ? "http://localhost:5000/api/chats/save"
        : `http://localhost:5000/api/chats/${chatIdRef.current}/update`;
      
      const method = isTemporaryChat ? "POST" : "PUT";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({
          chatId: chatIdRef.current,
          title: chatTitle || "New Chat",
          messages: messagesToSave
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to save chat");
      }

      if (data.success) {
        if (isTemporaryChat && data.chat?.id) {
          chatIdRef.current = data.chat.id;
        }

        onUpdateMessages(messagesToSave);
        
        if (data.chat.title !== activeChat.title) {
          onUpdateChatTitle(data.chat.title);
        }
        
        if (onChatSaved) {
          onChatSaved();
        }
      }

    } catch (error) {
      console.error("Error saving chat:", error);
    } finally {
      saveInProgress.current = false;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const predefinedPrompts = [
    {
      id: 1,
      title: "General Assistant",
      prompt: "Hi! I'd love to learn more about what you can help me with. What are your capabilities?"
    },
    {
      id: 2,
      title: "Writing Help",
      prompt: "Can you help me improve my writing skills? I'd like some tips and guidance."
    },
    {
      id: 3,
      title: "Code Assistant",
      prompt: "I need help with programming. Can you explain how you can assist with coding?"
    }
  ];

  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        clamp: true
      }
    }
  };

  const handlePromptClick = (promptText) => {
    addMessage(promptText, "user");
    setIsFirstMessage(false);
  };

  const stopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleEmailRequest = async (recentMessages) => {
    try {
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const lastMessages = recentMessages.slice(-10);
      
      const result = await sendEmailWithPDF(
        user.email,
        lastMessages,
        `Chat Summary - ${activeChat?.title || "AI Conversation"}`
      );

      console.log("Email send result:", result);

      setMessages((prev) => [
        ...prev,
        {
          messageId: `sys-${Date.now()}`,
          content: `✅ I've sent the email to ${user.email} with our conversation. Please check your inbox!`,
          role: "assistant",
          timestamp: new Date().toISOString()
        }
      ]);

    } catch (error) {
      console.error("Email send error:", error);
      
      setMessages((prev) => [
        ...prev,
        {
          messageId: `err-${Date.now()}`,
          content: `❌ Sorry, I couldn't send the email: ${error.message}. Please try again or contact support if the issue persists.`,
          role: "assistant",
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  useEffect(() => {
    if (messages.length > 0 && onUpdateMessages) {
      onUpdateMessages(messages);
    }
  }, [messages, onUpdateMessages]);

  const addMessage = async (content, role, isStreaming = false, isChunkOnly = false) => {
    const safeContent = typeof content === "string" 
      ? content 
      : (content && typeof content === "object" 
        ? JSON.stringify(content) 
        : String(content));
    
    if (!chatIdRef.current) return;
    
    let imageUrl = null;
    let processedContent = safeContent;
    
    if (role === "assistant" && !isChunkOnly) {
      if (safeContent.includes("Generated image:")) {
        const parts = safeContent.split("Generated image:");
        let textPart = parts[0].trim() || "Here's the generated image:";
        imageUrl = parts[1]?.trim();
        
        if (!imageUrl || imageUrl === "") {
          processedContent = textPart + "\n\n(Image generation failed - no URL returned)";
        } else {
          processedContent = textPart;
        }
      }
    }

    setMessages((prevMessages) => {
      let updatedMessages;
      
      if (isStreaming) {
        if (prevMessages.length > 0 && prevMessages[prevMessages.length - 1].role === "assistant") {
          updatedMessages = [...prevMessages];
          
          if (isChunkOnly) {
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + processedContent,
              ...(imageUrl && { imageUrl })
            };
          } else {
            updatedMessages[updatedMessages.length - 1] = {
              ...updatedMessages[updatedMessages.length - 1],
              content: processedContent,
              ...(imageUrl && { imageUrl })
            };
          }
        } else {
          const newMessage = {
            messageId: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: processedContent,
            role,
            timestamp: new Date().toISOString(),
            ...(imageUrl && { imageUrl })
          };
          updatedMessages = [...prevMessages, newMessage];
        }
      } else {
        const newMessage = {
          messageId: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: processedContent,
          role,
          timestamp: new Date().toISOString(),
          ...(imageUrl && { imageUrl })
        };
        updatedMessages = [...prevMessages, newMessage];
      }

      if (role === "assistant" && !isStreaming) {
        saveMessages(updatedMessages);
      }
      
      return updatedMessages;
    });

    if (role === "user") {
      setIsFirstMessage(false);
      setIsLoading(true);
    } else if (role === "assistant" && !isStreaming) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && pendingMessages.current.length > 0) {
      saveMessages(pendingMessages.current);
      pendingMessages.current = [];
    }
  }, [isLoading]);

  const handleStopResponse = () => {
    stopSpeaking();
  };

  const copyToClipboard = (content, messageId) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopyStatus((prev) => ({ ...prev, [messageId]: true }));
      setTimeout(() => setCopyStatus((prev) => ({ ...prev, [messageId]: false })), 2000);
    });
  };

  const toggleSourcesExpansion = (messageId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const renderMessage = (message, index) => {
    return (
      <motion.div
        key={message.messageId}
        initial="hidden"
        animate="visible"
        variants={messageVariants}
        className="mb-8 w-full max-w-[95%] xs:max-w-[90%] sm:max-w-2xl md:max-w-3xl mx-auto overflow-hidden"
      >
        <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          {message.role === "user" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-[#343541] rounded-xl px-4 pt-2 pb-1 inline-block max-w-[80%] shadow-sm text-white"
            >
              <MessageContentDisplay 
                content={message.content} 
                imageUrl={message.imageUrl} 
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-[95%] xs:max-w-[90%] sm:max-w-2xl md:max-w-3xl overflow-wrap break-word"
            >
              <MessageContentDisplay 
                content={message.content} 
                imageUrl={message.imageUrl} 
              />
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex items-start gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] animate-pulse" />
          <div className={`max-w-[70%] h-20 rounded-2xl animate-pulse ${i % 2 === 0 ? "bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]" : "bg-[#1a1a1a]"}`} />
          {i % 2 === 0 && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] animate-pulse" />}
        </motion.div>
      ))}
    </div>
  );

  const createNewChat = () => {
    const newChat = {
      id: `temp_${Date.now()}`,
      title: "New Chat",
      messages: []
    };
    if (typeof setActiveChat === "function") setActiveChat(newChat);
  };

  useEffect(() => {
    return () => {
      setIsLoading(false);
      saveInProgress.current = false;
      pendingMessages.current = [];
      chatIdRef.current = null;
    };
  }, [activeChat?.id]);

  const getUniqueMessages = () => {
    const seen = new Set();
    return messages.filter((msg) => {
      const key = `${msg.role}-${msg.content}`;
      if (seen.has(key)) {
        console.log("Duplicate message filtered:", msg.content);
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  return (
    <div className={`flex-1 flex flex-col relative h-screen bg-[#0a0a0a] overflow-hidden ${isOpen ? "lg:ml-0" : "lg:ml-0"} transition-all duration-300`}>
      <div className="sticky top-0 z-20 px-3 sm:px-4 py-3 sm:py-4 flex items-center bg-[#0a0a0a]/80 backdrop-blur-lg h-[60px]">
        <div className="flex items-center justify-between w-full">
          <div className="w-full flex items-center justify-center lg:justify-start gap-2 sm:gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10">
                <img
                  src="/vannipro.png"
                  alt="Vaani.pro Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg sm:text-xl font-display font-bold text-white leading-none py-1">
                Vaani.pro
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 sm:p-4 space-y-4 sm:space-y-6 bg-[#0a0a0a]">
        {isLoadingChat ? (
          <LoadingSkeleton />
        ) : (
          <>
            {getUniqueMessages().map((message, index) => renderMessage(message, index))}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start w-full max-w-[95%] xs:max-w-[90%] sm:max-w-2xl md:max-w-3xl mx-auto"
              >
                <span>⚪</span>
              </motion.div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className={`w-full ${isFirstMessage ? "absolute top-1/2 -translate-y-1/2" : "relative"}`}>
        {isFirstMessage && (
          <div className="px-4 py-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-[#cc2b5e]">Welcome to Vaani.pro</h1>
              <p className="text-gray-400 text-xl mt-2">How may I help you today?</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {predefinedPrompts.map((item) => (
                <motion.div
                  key={item.id}
                  className="group relative bg-white/[0.05] backdrop-blur-xl border border-white/20 rounded-xl p-4 cursor-pointer hover:bg-white/[0.08] transition-all duration-100 shadow-[0_0_20px_rgba(204,43,94,0.3)] hover:shadow-[0_0_30px_rgba(204,43,94,0.5)] "
                  onClick={() => handlePromptClick(item.prompt)}
                  whileHover={{ 
                    scale: 1.03,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div 
                    className="absolute  opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-2xl"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 0.25, transition: { duration: 0.3 } }}
                  />
                  <motion.div 
                    className="absolute  opacity-0 group-hover:opacity-30 transition-all duration-500 blur-md"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ opacity: 0.3, scale: 1.05, transition: { duration: 0.5 } }}
                  />
                  <div className="relative z-10">
                    <h3 className="text-white/90 font-medium text-sm mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-2">
                      {item.prompt}
                    </p>
                  </div>
                  <div className="absolute - rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-xl -z-10" />
                </motion.div>
              ))}
            </div>
          </div>
        )}
        <MessageInput 
          onSendMessage={addMessage}
          isLoading={isLoading}
          onStopResponse={stopSpeaking}
        />
      </div>

      {isGeneratingMedia && (
        <MediaGenerationIndicator 
          generatingMediaType={generatingMediaType}
        />
      )}

      {isMediaLoading && (
        <MediaLoadingAnimation 
          mediaType={mediaLoadingType}
        />
      )}
    </div>
  );
}

export default ChatContainer;
