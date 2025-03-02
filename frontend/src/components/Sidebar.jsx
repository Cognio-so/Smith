import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { FiUser, FiLogOut, FiSearch, FiPlus, FiSettings, FiDownload } from "react-icons/fi"
import { IoChatboxEllipses } from "react-icons/io5"
import { BsLayoutSidebar } from "react-icons/bs"
import { useAuth } from "../context/AuthContext"
import { HiMenuAlt2, HiSparkles } from "react-icons/hi"
import { formatDistanceToNow } from 'date-fns'
import { Link } from "react-router-dom"
import Settings from './SettingsPage'

const Sidebar = forwardRef(({ chats, activeChat, setActiveChat, createNewChat, isOpen = false }, ref) => {
  const { user, logout } = useAuth()
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [categorizedChats, setCategorizedChats] = useState({
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: []
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const saveCurrentChat = async () => {
    if (!activeChat?.id) {
        console.log('No active chat to save');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        
        // Debug logs
        console.log('Active Chat:', activeChat);
        console.log('Attempting to save chat:', {
            chatId: activeChat.id,
            title: activeChat.title,
            hasMessages: Boolean(activeChat.messages?.length)
        });

        // Get messages from localStorage if not in activeChat
        let messages = activeChat.messages;
        if (!messages?.length) {
            const savedMessages = localStorage.getItem(`chat_${activeChat.id}`);
            if (savedMessages) {
                messages = JSON.parse(savedMessages);
                console.log('Retrieved messages from localStorage:', messages.length);
            }
        }

        if (!messages?.length) {
            console.log('No messages to save');
            return;
        }

        const response = await fetch('https://smith-backend-psi.vercel.app/api/chats/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({
                chatId: activeChat.id,
                title: activeChat.title || 'New Chat',
                messages: messages.map(msg => ({
                    content: msg.content,
                    role: msg.role,
                    timestamp: msg.timestamp || new Date().toISOString()
                }))
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to save chat');
        }

        console.log('Chat saved successfully:', data);
    } catch (error) {
        console.error('Error saving chat:', error);
    }
  };

  const handleNewChat = () => {
    const newChat = {
      id: `temp_${Date.now()}`,
      title: 'New Chat',
      messages: []
    };
    
    setActiveChat(newChat);
    setSearchQuery("");
    createNewChat(newChat);
  };

  const filteredChats = chatHistory.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort chats by last updated time (most recent first)
  const sortedChats = [...filteredChats].sort((a, b) => {
    const dateA = new Date(a.lastUpdated || 0);
    const dateB = new Date(b.lastUpdated || 0);
    return dateB - dateA;
  });

  // Add a function to refresh chat history
  const refreshChatHistory = async () => {
    try {
      console.log('Fetching chat history');
      const token = localStorage.getItem('token');
      const response = await fetch('https://smith-backend-psi.vercel.app/api/chats/history/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.chats) {
          console.log('Chat history received:', data.chats.length);
          // Deduplicate chats based on ID
          const uniqueChats = data.chats.reduce((acc, chat) => {
            if (!acc.find(c => c.id === chat.id)) {
              acc.push(chat);
            }
            return acc;
          }, []);
          categorizeChats(uniqueChats);
        }
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  // Expose refreshChatHistory to parent
  useImperativeHandle(ref, () => ({
    refreshChatHistory
  }));

  // Initial load of chat history
  useEffect(() => {
    console.log('Initial chat history load');
    refreshChatHistory();
  }, []);

  const categorizeChats = (chats) => {
    const now = new Date();
    const categories = {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: []
    };

    chats.forEach(chat => {
      const lastUpdated = new Date(chat.lastUpdated);
      const diffDays = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        categories.today.push(chat);
      } else if (diffDays === 1) {
        categories.yesterday.push(chat);
      } else if (diffDays <= 7) {
        categories.lastWeek.push(chat);
      } else if (diffDays <= 30) {
        categories.lastMonth.push(chat);
      } else {
        categories.older.push(chat);
      }
    });

    setCategorizedChats(categories);
  };

  const handleChatClick = async (chat) => {
    const chatId = chat.id || chat.chatId;
    
    if (!chatId) {
      console.error('Invalid chat object:', chat);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://smith-backend-psi.vercel.app/api/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.chat) {
          setActiveChat({
            id: chatId,
            title: data.chat.title || 'New Chat',
            messages: data.chat.messages || []
          });
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  // Mobile menu button handler
  const handleMobileMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    // Ensure sidebar expands when menu is opened on mobile
    if (!isSidebarCollapsed && window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
  }

  // Update the chat list rendering in the return statement
  const renderChatList = (chats, title) => {
    if (!chats?.length) return null;

    return (
      <div className="mb-4">
        {/* Only show category titles when sidebar is expanded */}
        {!isSidebarCollapsed && (
          <h3 className="px-3 text-xs font-medium text-slate-400 py-2">
            {title}
          </h3>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id || chat.chatId}
            className={`group pl-0.5 pr-1 py-2 rounded-lg cursor-pointer transition-all duration-300
              hover:bg-white/5 flex items-center gap-2 mx-0.5
              ${activeChat?.id === (chat.id || chat.chatId) ? 'bg-white/5' : ''}`}
            onClick={() => handleChatClick(chat)}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${
              activeChat?.id === (chat.id || chat.chatId) 
                ? 'from-[#cc2b5e] to-[#753a88] shadow-lg shadow-[#cc2b5e]/20' 
                : 'from-[#1a1a1a] to-[#2a2a2a]'
            } flex items-center justify-center border border-white/10 transition-all duration-300`}>
              <IoChatboxEllipses className={`h-4 w-4 transition-colors duration-300 ${
                activeChat?.id === (chat.id || chat.chatId) 
                  ? 'text-white' 
                  : 'text-slate-400 group-hover:text-[#cc2b5e]'
              }`} />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <span className={`text-sm truncate block transition-colors duration-300 ${
                  activeChat?.id === (chat.id || chat.chatId) 
                    ? 'text-slate-200 font-medium' 
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}>
                  {chat.title || 'New Chat'}
                </span>
                <span className="text-xs text-slate-500 truncate block">
                  {formatDistanceToNow(new Date(chat.lastUpdated), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative flex">
      {/* Mobile Menu Button */}
      <button
        onClick={handleMobileMenuClick}
        className="lg:hidden fixed top-4 left-4 z-50 p-1 rounded-lg bg-[#1a1a1a] border border-white/10 hover:bg-white/5 transition-colors"
      >
        <HiMenuAlt2 className="h-4 w-4 text-white" />
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`${isSidebarCollapsed ? 'w-14' : 'w-46'} h-screen bg-black/90 flex flex-col transition-all duration-300 ease-in-out border-r border-white/10 fixed lg:static z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-30 px-3 py-4 bg-[#0a0a0a]/80 backdrop-blur-lg">
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col space-y-4' : 'justify-between'} w-full`}>
            {/* Logo Section - Hidden on mobile */}
            <div className="hidden lg:flex items-center justify-end w-full lg:justify-start gap-3">
              {isSidebarCollapsed ? (
                <div className="w-8 h-8">
                  <img
                    src="/vannipro.png"
                    alt="Vaani.pro Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12">
                    <img
                      src="/vannipro.png"
                      alt="Vaani.pro Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-xl font-display font-bold text-white leading-none py-1">Vaani.pro</span>
                </div>
              )}
            </div>
            
            {/* Collapse Button - Only show on desktop */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors hidden lg:flex items-center justify-center"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <BsLayoutSidebar 
                className={`h-5 w-5 text-[#cc2b5e] hover:text-[#753a88] transition-transform duration-300 ${
                  isSidebarCollapsed ? 'rotate-180' : ''
                }`} 
              />
            </button>
          </div>
        </div>

        {/* New Chat Button - Fixed alignment */}
        <div className="px-2 py-4 lg:mt-0 mt-4">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors border border-white/10 ${
              isSidebarCollapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            <FiPlus className="h-4 w-4 text-purple-600" />
            {!isSidebarCollapsed && (
              <span className="text-sm text-slate-200">New Chat</span>
            )}
          </button>
        </div>

        {/* Search Bar - Fixed alignment */}
        <div className="px-2 py-1">
          <div className={`relative flex items-center w-full ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            {!isSidebarCollapsed && (
              <div className="absolute left-2 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-purple-600" />
              </div>
            )}
            {isSidebarCollapsed ? (
              <button 
                className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
                title="Search"
              >
                <FiSearch className="h-4 w-4 text-purple-600" />
              </button>
            ) : (
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/90 rounded-lg py-2 pl-8 pr-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white/5 border border-white/10"
              />
            )}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2">
          {!isSidebarCollapsed && (
            <>
              {renderChatList(categorizedChats.today, 'Today')}
              {renderChatList(categorizedChats.yesterday, 'Yesterday')}
              {renderChatList(categorizedChats.lastWeek, 'Last 7 Days')}
              {renderChatList(categorizedChats.lastMonth, 'Last Month')}
              {renderChatList(categorizedChats.older, 'Older')}
            </>
          )}
        </div>

        {/* Profile Section */}
        <div className="relative p-1 border-t border-white/5 mt-2">
          <div className="flex flex-col justify-center items-center gap-2 py-2">
            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`${isSidebarCollapsed ? 'p-2' : 'w-full px-3 py-2'} hover:bg-white/10 rounded-lg transition-colors flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Settings"
            >
              <div className="flex items-center gap-2">
                <FiSettings className="h-5 w-5 text-purple-600" />
                {!isSidebarCollapsed && <span className="text-sm text-slate-200">Settings</span>}
              </div>
            </button>

            {/* User Button */}
            <button
              className={`${isSidebarCollapsed ? 'p-2' : 'w-full px-3 py-2'} hover:bg-white/10 rounded-lg transition-colors flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
              onClick={() => setShowUserDetails(!showUserDetails)}
              title={user?.email}
            >
              <div className="flex items-center gap-2">
                <FiUser className="h-5 w-5 text-purple-600" />
                {!isSidebarCollapsed && <span className="text-sm text-slate-200">{user?.email || ''}</span>}
              </div>
            </button>
          </div>
          
          {/* User Details Popup */}
          {showUserDetails && !isSidebarCollapsed && (
            <div className="absolute bottom-full mb-2 left-2 right-2 p-3 
              bg-black/90 rounded-lg shadow-lg border border-white/10 backdrop-blur-lg z-10"
            >
              <p className="text-xs text-white mb-3 truncate">
                {user?.email}
              </p>
              <button 
                onClick={logout}
                className="flex items-center text-purple-300 hover:text-purple-100 text-xs w-full gap-2 py-1 transition-colors"
              >
                <FiLogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add the Settings component */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
})

export default Sidebar

