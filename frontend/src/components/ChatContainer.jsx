import { useState, useEffect, useRef } from "react";
import MessageInput from "./MessageInput";
import { motion, AnimatePresence } from "framer-motion";
import { FiUser } from "react-icons/fi";
import { BsChatLeftText } from "react-icons/bs";
import { HiSparkles } from "react-icons/hi";
import { speakWithDeepgram, stopSpeaking } from "../utils/textToSpeech";
import { sendEmailWithPDF } from "../utils/emailService";
import { useAuth } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaRegCopy } from "react-icons/fa";
import { LuCopyCheck } from "react-icons/lu";

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
          `https://smith-backend-psi.vercel.app/api/chats/${activeChat.id}`,
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
      const response = await fetch("https://smith-backend-psi.vercel.app/api/ai/generate-title", {
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
        ? "https://smith-backend-psi.vercel.app/api/chats/save"
        : `https://smith-backend-psi.vercel.app/api/chats/${chatIdRef.current}/update`;
      
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
      scale: 0.9,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
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

  const addMessage = async (content, role, isStreaming = false) => {
    const safeContent = typeof content === "string" 
      ? content 
      : (content && typeof content === "object" 
        ? JSON.stringify(content) 
        : String(content));
    
    if (!chatIdRef.current) return;
    
    let imageUrl = null;
    let processedContent = safeContent;
    
    if (role === "assistant") {
      console.log("Assistant response:", safeContent);
      
      if (safeContent.includes("Generated image:")) {
        const parts = safeContent.split("Generated image:");
        let textPart = parts[0].trim() || "Here's the generated image:";
        imageUrl = parts[1]?.trim();
        
        console.log("Extracted image URL:", imageUrl);
        
        if (!imageUrl || imageUrl === "") {
          processedContent = textPart + "\n\n(Image generation failed - no URL returned)";
        } else {
          processedContent = textPart;
        }
      }
    }

    setMessages((prevMessages) => {
      let updatedMessages;
      if (isStreaming && prevMessages.length > 0 && prevMessages[prevMessages.length - 1].role === "assistant") {
        updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          content: processedContent,
          ...(imageUrl && { imageUrl })
        };
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

      if (role === "assistant") {
        saveMessages(updatedMessages);
      }
      
      return updatedMessages;
    });

    if (role === "user") {
      setIsFirstMessage(false);
      setIsLoading(true);
    } else if (role === "assistant") {
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
    let imageUrl = message.imageUrl || null;
    let messageContent = message.content;
    let sources = [];
    
    if (message.role === "assistant") {
      messageContent = messageContent
        // Ensure bullet points have a space after the asterisk
        .replace(/\n\s*\*(?!\s)/g, "\n* ")
        // Ensure numbered lists have a space after the number
        .replace(/\n\s*(\d+)\.(?!\s)/g, "\n$1. ")
        // Ensure headings have a space after the hash
        .replace(/\n\s*(#{1,6})(?!\s)/g, "\n$1 ")
        // Fix bold formatting
        .replace(/\*\*(?!\s)(.*?)(?<!\s)\*\*/g, "**$1**")
        // Fix italic formatting 
        .replace(/\*(?!\s|\*)(.*?)(?<!\s|\*)\*/g, "*$1*")
        // Ensure proper code block formatting
        .replace(/```(\w*)\n/g, "```$1\n")
        // Improve spacing around blocks
        .replace(/\n{3,}/g, "\n\n");
        
      if (messageContent.includes("Sources:")) {
        const parts = messageContent.split(/Sources:\s*/i);
        messageContent = parts[0].trim();
        
        const sourcesText = parts[1]?.trim();
        if (sourcesText) {
          const urlRegex = /(https?:\/\/[^\s\n"')]+)/g;
          const allUrls = sourcesText.match(urlRegex);
          
          if (allUrls && allUrls.length > 0) {
            sources = allUrls.map(url => url.trim());
          }
        }
      }
      
      if (sources.length === 0) {
        const citationRegex = /\[(\d+)\]/g;
        const citations = [];
        let match;
        
        while ((match = citationRegex.exec(messageContent)) !== null) {
          citations.push(match[1]);
        }
        
        if (citations.length > 0) {
          const urlRegex = /(https?:\/\/[^\s\n"')]+)/g;
          const allUrls = messageContent.match(urlRegex);
          
          if (allUrls && allUrls.length > 0) {
            sources = allUrls.map(url => url.trim());
            allUrls.forEach(url => {
              messageContent = messageContent.replace(url, "");
            });
            
            messageContent = messageContent
              .replace(/\[\d+\]\s*\[\s*\]/g, "")
              .replace(/\s{2,}/g, " ")
              .replace(/\n\s*\n/g, "\n\n")
              .trim();
          }
        }
      }
      
      if (sources.length === 0) {
        const urlRegex = /(https?:\/\/[^\s\n"')]+)/g;
        const allUrls = messageContent.match(urlRegex);
        
        if (allUrls && allUrls.length > 0) {
          sources = allUrls.map(url => url.trim());
          
          const lastParagraphRegex = /\n\s*([^\n]+)$/;
          const lastParagraph = messageContent.match(lastParagraphRegex);
          
          if (lastParagraph && lastParagraph[1]) {
            const lastParagraphText = lastParagraph[1];
            const urlsInLastParagraph = lastParagraphText.match(urlRegex);
            
            if (urlsInLastParagraph && urlsInLastParagraph.length > 0) {
              let newLastParagraph = lastParagraphText;
              urlsInLastParagraph.forEach(url => {
                newLastParagraph = newLastParagraph.replace(url, "");
              });
              
              if (newLastParagraph.trim().length === 0) {
                messageContent = messageContent.replace(lastParagraphRegex, "");
              } else {
                messageContent = messageContent.replace(lastParagraphRegex, "\n" + newLastParagraph.trim());
              }
            }
          }
        }
      }
      
      if (sources.length > 0) {
        sources = [...new Set(sources)].filter(url => {
          return url && 
            url.startsWith("http") && 
            url.includes(".") &&
            !url.endsWith(".") && 
            !url.endsWith(",");
        });
        
        sources = sources.map(url => url.replace(/[.,;:!?)]+$/, ""));
        console.log("Final extracted sources:", sources);
      }
    }

    console.log("Sources found in message:", sources.length, sources);
    if (message.role === "assistant") {
      console.log("Raw assistant message:", messageContent);
    }

    return (
      <motion.div
        key={message.messageId}
        initial="hidden"
        animate="visible"
        variants={messageVariants}
        className={`flex items-start gap-3 mb-8 ${message.role === "user" ? "justify-end" : "justify-start"}`}
      >
        {message.role !== "user" && (
          <motion.div
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#cc2b5e] to-[#753a88] flex items-center justify-center border border-white/10 shadow-lg"
            whileHover={{ scale: 1.05 }}
          >
            {message.isVoice ? (
              <BsChatLeftText className="w-4 h-4 text-white" />
            ) : (
              <HiSparkles className="w-4 h-4 text-white" />
            )}
          </motion.div>
        )}

        <div
          className={`max-w-[85%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-lg ${
            message.role === "user"
              ? "bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white/90 border border-white/10"
              : message.content.includes("Error:") || message.content.includes("⚠️")
                ? "bg-red-900/20 text-slate-200 border border-red-500/30"
                : "bg-[#1a1a1a] text-slate-200 border border-white/10"
          } break-words`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            {message.isVoice && (
              <div className="text-xs text-[#cc2b5e] mb-1">🎤 Voice Message</div>
            )}
            
            <div 
              className="prose prose-invert max-w-none overflow-auto"
              style={{ wordBreak: 'break-word' }}
            >
              <ReactMarkdown
                key={message.messageId}
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-2xl font-bold mt-6 mb-4 text-white" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl font-bold mt-5 mb-3 text-white" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-bold mt-4 mb-2 text-white" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-base font-bold mt-3 mb-2 text-white" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="my-3 text-white/90 leading-relaxed" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-outside pl-6 my-3 text-white/90" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-outside pl-6 my-3 text-white/90" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="my-1 pl-1 text-white/90" {...props} />
                  ),
                  code: ({ node, inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || "");
                    const language = match ? match[1] : "";
                    const id = `code-${message.messageId}`;

                    return inline ? (
                      <code
                        className="bg-[#2d333b]/30 text-white/90 px-1 py-0.5 rounded font-mono text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <div className="relative my-4 rounded-md overflow-hidden border border-white/10">
                        {language && (
                          <div className="bg-[#2d333b] text-white/60 text-xs px-3 py-1 border-b border-white/10">
                            {language}
                          </div>
                        )}
                        <div 
                          className="absolute right-2 top-2 cursor-pointer hover:bg-[#2d333b] p-1 rounded"
                          onClick={() => copyToClipboard(String(children).replace(/\n$/, ""), id)}
                        >
                          {copyStatus[id] ? (
                            <LuCopyCheck className="w-4 h-4 text-white/60" />
                          ) : (
                            <FaRegCopy className="w-4 h-4 text-white/60" />
                          )}
                        </div>
                        <pre
                          className="bg-[#1e1e1e] text-white/90 p-4 font-mono text-sm overflow-x-auto"
                          {...props}
                        >
                          <code className={language ? `language-${language}` : ""}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  },
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full border-collapse border border-white/10" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-[#2d333b]/30" {...props} />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="border-b border-white/10" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="px-4 py-2 text-left font-semibold text-white/90 border border-white/10"
                      {...props}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td
                      className="px-4 py-2 text-white/90 border border-white/10"
                      {...props}
                    />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="text-blue-400 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-white/20 pl-4 my-3 italic text-white/80"
                      {...props}
                    />
                  )
                }}
              >
                {messageContent}
              </ReactMarkdown>
              
              {imageUrl && (
                <div className="mt-4">
                  <ImageWithLoading src={imageUrl} alt="Generated image" />
                </div>
              )}
              
              {sources.length > 0 && !messageContent.includes("Generated image:") && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div 
                    className="text-sm text-white/70 mb-2 font-medium flex items-center gap-2 cursor-pointer hover:text-white/90 transition-colors"
                    onClick={() => toggleSourcesExpansion(message.messageId)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                    Sources: <span className="text-xs ml-1">({sources.length})</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 transition-transform ${expandedSources[message.messageId] ? "rotate-180" : ""}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {expandedSources[message.messageId] && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {sources.map((source, i) => {
                        const domainMatch = source.match(/^https?:\/\/(?:www\.)?([^\/]+)/);
                        const domain = domainMatch ? domainMatch[1] : "website";
                        
                        return (
                          <a 
                            key={i} 
                            href={source} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-colors px-2 py-1 rounded-md border border-white/10"
                            title={source}
                          >
                            <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center">
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
                                alt=""
                                className="w-4 h-4 object-contain"
                                onError={(e) => {
                                  e.target.onerror = null; 
                                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23aaaaaa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' y1='8' x2='12' y2='16'%3E%3C/line%3E%3Cline x1='8' y1='12' x2='16' y2='12'%3E%3C/line%3E%3C/svg%3E";
                                }}
                              />
                            </div>
                            <span className="text-xs text-white/80 truncate max-w-[100px]">
                              {domain}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {message.role === "user" && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-white/10 shadow-lg">
            {message.isVoice ? (
              <BsChatLeftText className="w-4 h-4 text-[#FAAE7B]" />
            ) : (
              <FiUser className="w-4 h-4 text-[#FAAE7B]" />
            )}
          </div>
        )}
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

  const ImageWithLoading = ({ src, alt }) => {
    const [status, setStatus] = useState("loading");
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 5;
    const retryTimeoutRef = useRef(null);
    
    useEffect(() => {
      const preloadImage = () => {
        setStatus("loading");
        setRetryCount(0);
        
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        const img = new Image();
        
        img.onload = () => {
          setStatus("success");
        };
        
        img.onerror = () => {
          if (retryCount < maxRetries) {
            const delay = 1000 * Math.pow(1.5, retryCount);
            console.log(`Image load failed. Retry ${retryCount + 1}/${maxRetries} in ${delay}ms`);
            
            retryTimeoutRef.current = setTimeout(() => {
              setRetryCount((prev) => prev + 1);
              img.src = src + `?retry=${Date.now()}`;
            }, delay);
          } else {
            setStatus("error");
          }
        };
        
        img.src = src + `?t=${Date.now()}`;
      };
      
      preloadImage();
      
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }, [src, retryCount, maxRetries]);
    
    const handleRetry = () => {
      setRetryCount(0);
      setStatus("loading");
    };
    
    return (
      <div className="relative mt-3">
        {status === "loading" && (
          <div className="flex items-center justify-center bg-gray-800 rounded-lg min-h-[200px] w-full">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#cc2b5e]"></div>
              <div className="text-sm text-gray-400 mt-2">
                Loading image{retryCount > 0 ? ` (retry ${retryCount + 1}/${maxRetries})` : "..."}
              </div>
            </div>
          </div>
        )}
        
        {status === "error" && (
          <div className="flex items-center justify-center bg-gray-800 rounded-lg min-h-[200px] w-full">
            <div className="text-center text-gray-400">
              <div className="text-red-400 text-2xl mb-2">⚠️</div>
              <div>Failed to load image after multiple attempts</div>
              <button 
                onClick={handleRetry}
                className="text-blue-400 text-xs mt-2 block hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        
        {status === "success" && (
          <img 
            src={src}
            alt={alt}
            className="rounded-lg max-w-full object-contain max-h-[400px]"
          />
        )}
      </div>
    );
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
                className="flex justify-start"
              >
                <div className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-lg">
                  <motion.span
                    className="w-2 h-2 bg-[#cc2b5e] rounded-full shadow-md"
                    animate={{ y: ["0%", "-50%", "0%"] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-[#cc2b5e] rounded-full shadow-md"
                    animate={{ y: ["0%", "-50%", "0%"] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-[#cc2b5e] rounded-full shadow-md"
                    animate={{ y: ["0%", "-50%", "0%"] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
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
                  className="group relative bg-white/[0.05] backdrop-blur-xl border border-white/20 rounded-xl p-4 cursor-pointer hover:bg-white/[0.08] transition-all duration-300 shadow-[0_0_20px_rgba(204,43,94,0.3)] hover:shadow-[0_0_30px_rgba(204,43,94,0.5)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#cc2b5e]/30 before:to-[#753a88]/30 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:rounded-xl overflow-hidden hover:border-white/40"
                  onClick={() => handlePromptClick(item.prompt)}
                  whileHover={{ 
                    scale: 1.03,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-2xl"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 0.25, transition: { duration: 0.3 } }}
                  />
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] opacity-0 group-hover:opacity-30 transition-all duration-500 blur-md"
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
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-xl -z-10" />
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
    </div>
  );
}

export default ChatContainer;
