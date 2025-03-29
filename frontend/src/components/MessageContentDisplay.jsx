import React, { useState, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { FaDownload, FaRegCopy } from 'react-icons/fa';
import { TbCopyCheckFilled } from 'react-icons/tb';
import { ThemeContext } from '../App';
import ModernAudioPlayer from './ModernAudioPlayer';

// Helper functions
const extractMediaUrls = (content) => {
  if (!content) return { text: '', imageUrls: [], musicUrls: [] };
  
  const imageRegex = /!\[(.*?)\]\((https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp))\)|(?<!\[)(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp))(?!\])/gi;
  const musicRegex = /(https?:\/\/\S+\.(?:mp3|wav|ogg|m4a)(?:\S*))|(https?:\/\/(?:api\.musicfy\.lol|replicate\.delivery|replicate\.com|\w+\.(?:r2\.cloudflarestorage|cloudfront|amazonaws))\.com\/\S+)/gi;
  
  const imageUrls = [];
  const musicUrls = [];
  
  let imageMatch;
  while ((imageMatch = imageRegex.exec(content)) !== null) {
    imageUrls.push(imageMatch[2] || imageMatch[0]);
  }
  
  let musicMatch;
  while ((musicMatch = musicRegex.exec(content)) !== null) {
    musicUrls.push(musicMatch[0]);
  }
  
  let text = content;
  [...imageUrls, ...musicUrls].forEach(url => {
    text = text.replace(new RegExp(`^${url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'gm'), '');
    text = text.replace(new RegExp(url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');
    text = text.replace(new RegExp(`!\\[.*?\\]\\(${url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\)`, 'g'), '');
  });
  
  return { text, imageUrls, musicUrls };
};

const extractSources = (content) => {
  if (!content) return [];
  
  // Look for URLs in the content
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const sources = [];
  let match;
  
  // Find all URLs in the content
  while ((match = urlRegex.exec(content)) !== null) {
    try {
      const url = match[0].replace(/\.$/, ''); // Remove trailing period if present
      
      // Skip media URLs
      const isMediaUrl = 
        /\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|m4a)$/i.test(url) || 
        url.includes('musicfy.lol') || 
        url.includes('replicate.delivery') || 
        url.includes('replicate.com') ||
        url.includes('r2.cloudflarestorage') ||
        url.includes('cloudfront') ||
        url.includes('amazonaws');
      
      // Only add unique non-media URLs
      if (!isMediaUrl && !sources.some(s => s.url === url)) {
        sources.push({
          url: url,
          // Try to extract domain for title
          title: new URL(url).hostname.replace('www.', '')
        });
      }
    } catch (e) {
      console.error("Error parsing URL:", match[0]);
    }
  }
  
  return sources;
};

const SourcesDropdown = ({ sources }) => {
  const { theme } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  
  if (!sources || sources.length === 0) return null;
  
  // Function to determine if a URL is a storage or media URL
  const isStorageUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return domain.includes('cloudflarestorage') || 
              domain.includes('amazonaws') ||
              domain.includes('cloudfront') ||
              domain.includes('replicate');
    } catch (e) {
      return false;
    }
  };
  
  // Get icon for the source based on domain type
  const getSourceIcon = (source) => {
    try {
      const url = source.url;
      const domain = new URL(url).hostname;
      
      // For storage URLs, use a custom generic icon
      if (isStorageUrl(url)) {
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V8C22 6.89543 21.1046 6 20 6H4Z" />
            <path d="M12 18V6" />
          </svg>
        );
      }
      
      // For normal websites, use a favicon with fallback
      return (
        <img 
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
          alt=""
          className="w-4 h-4"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z' fill='%23999'/%3E%3C/svg%3E";
          }}
        />
      );
    } catch (e) {
      // Fallback for invalid URLs
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      );
    }
  };
  
  return (
    <div className="mt-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 rounded-lg px-2 py-1.5 text-xs ${
          theme === 'dark' 
            ? 'bg-white/10 hover:bg-white/15 text-white' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
        } transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7 10 12 15 17 10"></polyline>
        </svg>
        <span>{sources.length} {sources.length === 1 ? 'Source' : 'Sources'}</span>
      </button>
      
      {isOpen && (
        <div className={`mt-2 p-2 rounded-lg ${
          theme === 'dark' 
            ? 'bg-black/40 border border-white/10' 
            : 'bg-white border border-gray-200 shadow-md'
        }`}>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, index) => {
              try {
                const domain = new URL(source.url).hostname;
                const title = source.title || domain.replace('www.', '');
                
                return (
                  <a 
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center rounded-md p-2 ${
                      theme === 'dark' 
                        ? 'bg-white/5 hover:bg-white/10' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    } transition-colors`}
                    title={source.url}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                      theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                    }`}>
                      {getSourceIcon(source)}
                    </div>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {title}
                    </span>
                  </a>
                );
              } catch (e) {
                return null;
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MessageContent = ({ content }) => {
  const { theme } = useContext(ThemeContext);
  const { text, imageUrls, musicUrls } = extractMediaUrls(content);
  
  // Extract sources from content
  const sources = extractSources(content);
  
  // Remove URLs at the end of text for clean display
  let cleanedText = text;
  if (sources.length > 0) {
    // Remove URLs from the end of the content
    sources.forEach(source => {
      cleanedText = cleanedText.replace(source.url, '');
    });
    
    // Remove "Sources:" section and bullet points completely
    cleanedText = cleanedText.replace(/\n\n\*\*Sources:\*\*\n(•.*\n?)+/g, '');
    cleanedText = cleanedText.replace(/Sources:(\s|\n)*(•\s*\n*)*$/g, '');
    
    // Clean up any empty lines at the end
    cleanedText = cleanedText.replace(/\n+$/g, '');
  }
  
  const handleImageDownload = (url) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function() {
      if (this.status === 200) {
        const blob = new Blob([this.response], { type: 'image/jpeg' });
        
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'image-' + Date.now() + '.jpg';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 100);
      }
    };
    xhr.send();
  };
  
  return (
    <div className={`message-content break-words ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      {cleanedText && (
        <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} prose-sm sm:prose-base max-w-none overflow-hidden`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const [copied, setCopied] = useState(false);
                
                const copyToClipboard = (text) => {
                  navigator.clipboard.writeText(text)
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    })
                    .catch(err => {
                      console.error('Failed to copy code: ', err);
                    });
                };

                return !inline && match ? (
                  <div className="code-block">
                    <div className="code-header">
                      <span className="code-lang">{match[1]}</span>
                      <button 
                        onClick={() => copyToClipboard(codeString)}
                        className="code-copy-btn"
                        title={copied ? "Copied!" : "Copy code"}
                      >
                        {copied ? <TbCopyCheckFilled className="h-4 w-4" /> : <FaRegCopy className="h-4 w-4" />}
                        <span className="ml-1">Copy</span>
                      </button>
                    </div>
                    <SyntaxHighlighter
                      style={atomDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: '0',
                        padding: '0.75rem',
                        background: '#1e1e1e',
                        fontSize: '14px',
                        borderRadius: '0 0 6px 6px'
                      }}
                      codeTagProps={{
                        style: {
                          fontSize: 'inherit',
                          lineHeight: 1.5
                        }
                      }}
                      wrapLines={false}
                      wrapLongLines={false}
                      className="code-syntax"
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              a: ({ node, ...props }) => {
                const href = props.href || '';
                const isMediaUrl = /\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg)$/i.test(href) || 
                                  href.includes('musicfy.lol') || 
                                  href.includes('replicate');
                
                if (isMediaUrl) {
                  return null;
                }
                
                return (
                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#cc2b5e] underline" />
                );
              },
              table: ({ node, ...props }) => (
                <table {...props} className={`border-collapse ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} my-4 w-full`} />
              ),
              th: ({ node, ...props }) => (
                <th {...props} className={`border ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'} px-4 py-2`} />
              ),
              td: ({ node, ...props }) => (
                <td {...props} className={`border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} px-4 py-2`} />
              ),
              p: ({node, ...props}) => (
                <p {...props} className="mb-4" />
              ),
              h1: ({node, ...props}) => (
                <h1 {...props} className="text-2xl font-bold mt-6 mb-4" />
              ),
              h2: ({node, ...props}) => (
                <h2 {...props} className="text-xl font-bold mt-6 mb-3" />
              ),
              h3: ({node, ...props}) => (
                <h3 {...props} className="text-lg font-bold mt-4 mb-2" />
              ),
              ul: ({node, ...props}) => (
                <ul {...props} className="list-disc pl-6 my-4 space-y-2" />
              ),
              ol: ({node, ...props}) => (
                <ol {...props} className="list-decimal pl-6 my-4 space-y-2" />
              ),
              li: ({node, ...props}) => (
                <li {...props} className="ml-4 pl-1" />
              ),
              strong: ({node, ...props}) => (
                <strong {...props} className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
              ),
            }}
          >
            {cleanedText}
          </ReactMarkdown>
        </div>
      )}
      
      {/* Sources dropdown */}
      {sources.length > 0 && <SourcesDropdown sources={sources} />}
      
      {imageUrls.length > 0 && (
        <div className="mt-2 space-y-2">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full max-w-full object-contain rounded-lg" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' text-anchor='middle' dominant-baseline='middle' fill='%23999999'%3EImage Failed to Load%3C/text%3E%3C/svg%3E";
                }}
              />
              <button
                onClick={() => handleImageDownload(url)}
                className="absolute bottom-2 right-2 bg-[#cc2b5e]/80 hover:bg-[#cc2b5e] text-white rounded-full w-10 h-10 flex items-center justify-center transition-all shadow-md"
                title="Download image"
              >
                <FaDownload className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {musicUrls.length > 0 && (
        <div className="mt-3 space-y-4">
          {musicUrls.map((url, index) => (
            <ModernAudioPlayer key={index} url={url} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageContent;

export const sanitizeContent = (content) => {
  if (!content) return '';
  
  return content.replace(
    /(https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|m4a)(\?\S*)?)/gi, 
    '[media]'
  ).replace(
    /(https?:\/\/(?:api\.musicfy\.lol|replicate\.delivery|replicate\.com|\w+\.(?:r2\.cloudflarestorage|cloudfront|amazonaws))\.com\/\S+)/gi,
    '[media]'
  );
}; 