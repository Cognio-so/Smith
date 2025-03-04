import React, { useState, useCallback, useRef, useEffect } from 'react';
import ChatContainer from '../components/ChatContainer';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const sidebarRef = useRef(null);
  const updateInProgress = useRef(false);

  // Initialize with a new chat if none exists
  useEffect(() => {
    if (!activeChat) {
      createNewChat();
    }
  }, []);

  const refreshChatHistory = useCallback(() => {
    console.log('Refreshing chat history');
    if (sidebarRef.current?.refreshChatHistory) {
      sidebarRef.current.refreshChatHistory();
    }
  }, []);

  const createNewChat = useCallback(() => {
    console.log('Creating new chat');
    const newChat = {
      id: `temp_${Date.now()}`,
      title: 'New Chat',
      messages: []
    };
    setChats(prevChats => [...prevChats, newChat]);
    setActiveChat(newChat);
    setCurrentMessages([]);
  }, []);

  const handleUpdateMessages = useCallback((messages) => {
    if (updateInProgress.current) return;
    updateInProgress.current = true;

    console.log('Updating messages:', { messageCount: messages.length });
    
    // Prevent unnecessary updates
    if (JSON.stringify(currentMessages) !== JSON.stringify(messages)) {
      setCurrentMessages(messages);
      setActiveChat(prev => ({
        ...prev,
        messages,
        title: prev?.title || messages[0]?.content?.slice(0, 30) || 'New Chat'
      }));
    }

    setTimeout(() => {
      updateInProgress.current = false;
    }, 100);
  }, [currentMessages]);

  const handleUpdateChatTitle = useCallback((newTitle) => {
    console.log('Updating chat title:', newTitle);
    setActiveChat(prev => {
      if (prev && prev.title !== newTitle) {
        return { ...prev, title: newTitle };
      }
      return prev;
    });
    refreshChatHistory();
  }, [refreshChatHistory]);

  const activeChatWithMessages = activeChat ? {
    ...activeChat,
    messages: currentMessages
  } : null;

  return (
    <div className="flex h-screen" 
      style={{
        background: 'linear-gradient(to left, #414345, #232526)'
      }}>
      <Sidebar
        ref={sidebarRef}
        chats={chats} 
        activeChat={activeChatWithMessages}
        setActiveChat={setActiveChat} 
        createNewChat={createNewChat} 
      />
      <ChatContainer 
        key={activeChat?.id} // Add key to force re-render on chat change
        activeChat={activeChatWithMessages}
        onUpdateChatTitle={handleUpdateChatTitle}
        onUpdateMessages={handleUpdateMessages}
        onChatSaved={refreshChatHistory}
      />
    </div>
  );
};

export default Dashboard;
