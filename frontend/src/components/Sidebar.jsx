import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { FiUser, FiLogOut, FiSearch, FiPlus, FiSettings } from "react-icons/fi"
import { IoChatboxEllipses } from "react-icons/io5"
import { BsLayoutSidebar } from "react-icons/bs"
import { useAuth } from "../context/AuthContext"
import { HiMenuAlt2 } from "react-icons/hi"
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
        
        console.log('Active Chat:', activeChat);
        console.log('Attempting to save chat:', {
            chatId: activeChat.id,
            title: activeChat.title,
            hasMessages: Boolean(activeChat.messages?.length)
        });

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

        const response = await fetch('https://vercel.com/algo-hype-analytics/smith-backend/api/chats/save', {
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

  const sortedChats = [...filteredChats].sort((a, b) => {
    const dateA = new Date(a.lastUpdated || 0);
    const dateB = new Date(b.lastUpdated || 0);
    return dateB - dateA;
  });

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
        if (data.success && data.categories) {
          console.log('Chat history received:', data.categories);
          setCategorizedChats(data.categories);
        }
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    refreshChatHistory
  }));

  useEffect(() => {
    console.log('Initial chat history load');
    refreshChatHistory();
  }, []);

  const handleChatClick = async (chat) => {
    const chatId = chat.id || chat.chatId;
    
    if (!chatId) {
      console.error('Invalid chat object:', chat);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://vercel.com/algo-hype-analytics/smith-backend/api/chats/${chatId}`, {
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

  const handleMobileMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const renderChatList = (chats, title) => {
    if (!chats?.length) return null;

    return (
      <div className="mb-4">
        {!isSidebarCollapsed && (
          <h3 className="px-3 text-xs font-medium text-slate-400 py-2">
            {title}
          </h3>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id || chat.chatId}
            className={`group px-2 py-2 rounded-lg cursor-pointer transition-all duration-300
              hover:bg-white/5 flex items-center gap-2 mx-1
              ${activeChat?.id === (chat.id || chat.chatId) ? 'bg-white/5' : ''}`}
            onClick={() => handleChatClick(chat)}
          >
            {!isSidebarCollapsed && (
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
            )}
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <span className={`text-sm truncate block transition-colors duration-300 ${
                  activeChat?.id === (chat.id || chat.chatId) 
                    ? 'text-slate-200 font-medium' 
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}>
                  {chat.title || 'New Chat'}
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
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1a1a1a] border border-white/10 hover:bg-white/5 transition-colors"
      >
        <HiMenuAlt2 className="h-5 w-5 text-[#cc2b5e]" />
      </button>

      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`${isSidebarCollapsed ? 'w-12' : 'w-52'} h-screen bg-[#0a0a0a] flex flex-col transition-all duration-300 ease-in-out border-r border-white/10 fixed lg:static z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="sticky top-0 z-30 px-3 py-4 bg-[#0a0a0a]/80 backdrop-blur-lg">
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col space-y-4' : 'justify-between'} w-full`}>
            <div className="hidden lg:flex items-center justify-end w-full lg:justify-start gap-3">
              {isSidebarCollapsed ? (
                <div className="w-8 h-8">
                  <img src="/vannipro.png" alt="Vaani.pro Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12">
                    <img src="/vannipro.png" alt="Vaani.pro Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xl font-display font-bold text-white leading-none py-1">Vaani.pro</span>
                </div>
              )}
            </div>
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

        <div className="px-3 py-2 lg:mt-0 mt-4">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors border border-white/10 ${
              isSidebarCollapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            <FiPlus className={isSidebarCollapsed ? "h-6 w-6 text-[#cc2b5e]" : "h-4 w-4 text-[#cc2b5e]"} />
            {!isSidebarCollapsed && (
              <span className="text-sm text-slate-200">New Chat</span>
            )}
          </button>
        </div>

        <div className="px-3 py-2">
          <div className={`relative flex items-center w-full ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            {!isSidebarCollapsed && (
              <div className="absolute left-2 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-[#cc2b5e]" />
              </div>
            )}
            {isSidebarCollapsed ? (
              <button 
                className="p-2 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
                title="Search"
              >
                <FiSearch className="h-4 w-4 text-[#cc2b5e]" />
              </button>
            ) : (
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] rounded-lg py-2 pl-8 pr-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#cc2b5e]/50 border border-white/10"
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-1">
          {renderChatList(categorizedChats.today, 'Today')}
          {renderChatList(categorizedChats.yesterday, 'Yesterday')}
          {renderChatList(categorizedChats.lastWeek, 'Last 7 Days')}
          {renderChatList(categorizedChats.lastMonth, 'Last Month')}
          {renderChatList(categorizedChats.older, 'Older')}
        </div>

        <div className="relative p-2 border-t border-white/10">
          <div className={`flex items-center ${
            isSidebarCollapsed
              ? 'flex-col space-y-2 w-full'
              : 'flex-col space-y-2 w-full'
          } gap-2`}>
            <button
              className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-white/5 transition-colors 
                flex items-center justify-center border border-white/10 w-full"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
            >
              <FiSettings className="h-4 w-4 text-[#cc2b5e]" />
              {!isSidebarCollapsed && <span className="text-sm text-slate-200 ml-2">Settings</span>}
            </button>

            <button
              className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-white/5 transition-colors 
                flex items-center justify-center border border-white/10 w-full"
              onClick={() => !isSidebarCollapsed && setShowUserDetails(!showUserDetails)}
              title={isSidebarCollapsed ? user?.name : "Profile"}
            >
              <FiUser className="h-4 w-4 text-[#cc2b5e]" />
              {!isSidebarCollapsed && <span className="text-sm text-slate-200 ml-2">Profile</span>}
            </button>
          </div>

          {showUserDetails && !isSidebarCollapsed && (
            <div className="absolute bottom-full mb-2 left-2 right-2 p-3 
              bg-[#1a1a1a] rounded-lg shadow-lg border border-white/10 backdrop-blur-lg"
            >
              <h3 className="font-medium text-xs text-slate-100 truncate mb-1">
                {user?.name}
              </h3>
              <p className="text-xs text-slate-400 mb-2 truncate">
                {user?.email}
              </p>
              <button 
                onClick={logout}
                className="flex items-center text-red-400 hover:text-red-300 text-xs w-full gap-1.5 transition-colors"
              >
                <FiLogOut className="h-3 w-3" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
})

export default Sidebar