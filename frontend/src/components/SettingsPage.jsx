import React, { useState, useEffect } from "react";
import { IoSettingsOutline, IoVolumeHighOutline, IoKeyOutline } from "react-icons/io5";
import { AiOutlineRobot } from "react-icons/ai";
import { useAuth } from "../context/AuthContext"; // Import useAuth

const SettingPage = ({ isOpen, onClose }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState("general");
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [apiKey, setApiKey] = useState("");

  const { user } = useAuth(); // Access user data from useAuth

  const contentRef = React.useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      const container = contentRef.current;
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [activeSection]);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setDarkMode(isDarkMode);
    if (!localStorage.getItem('theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const handleToggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  const navigationItems = [
    { id: "general", label: "General", icon: <IoSettingsOutline className="w-5 h-5" /> },
    { id: "model", label: "Model Settings", icon: <AiOutlineRobot className="w-5 h-5" /> },
    { id: "voice", label: "Voice Settings", icon: <IoVolumeHighOutline className="w-5 h-5" /> },
    { id: "Account", label: "Account", icon: <IoKeyOutline className="w-5 h-5" /> },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Settings Container */}
      <div className="absolute inset-0 sm:inset-2 md:inset-4 lg:inset-8 xl:inset-16 bg-gray-50 dark:bg-gray-950 rounded-lg shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Header with close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white dark:bg-gray-900 border-b md:border-r border-gray-200 dark:border-gray-800 shrink-0">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          </div>
          <nav className="mt-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors
                  ${activeSection === item.id 
                    ? "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border-r-4 border-purple-600 dark:border-purple-300" 
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {activeSection === item.id && (
                  <span className="ml-auto">
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-auto scroll-smooth bg-gray-50 dark:bg-gray-950"
        >
          <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
            {/* General Settings Section */}
            {activeSection === "general" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">General Settings</h2>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 space-y-4 border border-gray-200 dark:border-gray-800">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Dark Mode</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Adjust the appearance of the interface</p>
                    </div>
                    <button
                      onClick={handleToggleDarkMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                        ${darkMode ? 'bg-purple-600' : 'bg-gray-200'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform
                          ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Model Settings Section */}
            {activeSection === "model" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Model Settings</h2>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-800">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="gpt-4o-mini">GPT-4o-mini</option>
                    <option value="gemini-flash-2.0">Gemini-flash-2.0</option>
                    <option value="claude-3.5-haiku">Claude 3.5 Haiku</option>
                    <option value="llama-3.3">Llama 3.3</option>
                  </select>
                </div>
              </div>
            )}

            {/* Voice Settings Section */}
            {activeSection === "voice" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Voice Settings</h2>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 space-y-6 border border-gray-200 dark:border-gray-800">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Voice Model
                    </label>
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="alloy">Alloy - Neutral and balanced</option>
                      <option value="echo">Echo - Warm and natural</option>
                      <option value="fable">Fable - British accent</option>
                      <option value="onyx">Onyx - Deep and authoritative</option>
                      <option value="nova">Nova - Professional and clear</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Speech Rate <span className="ml-2 text-gray-500 dark:text-gray-400">1.0x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      defaultValue="1"
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Pitch <span className="ml-2 text-gray-500 dark:text-gray-400">Normal</span>
                    </label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      defaultValue="0"
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                  <div>
                    <button
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      onClick={() => {/* Add test voice functionality */}}
                    >
                      Test Voice
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Account Settings Section */}
            {activeSection === "Account" && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 space-y-6 border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile</h3>
                  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <IoKeyOutline className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <button className="absolute bottom-0 right-0 p-1 bg-purple-600 rounded-full text-white hover:bg-purple-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload a profile picture (max 2MB)
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={user?.name || ''}
                      placeholder="Enter your display name"
                      className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      placeholder="Enter your email"
                      className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Change Password
                    </label>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Current password"
                        className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      onClick={() => {/* Add save functionality */}}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 space-y-6 border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">API Settings</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your OpenAI API key"
                      className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Your API key is stored securely and never shared with third parties.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;