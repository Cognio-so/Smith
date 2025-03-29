import React from 'react';

export const MediaGenerationIndicator = ({ generatingMediaType }) => {
  return (
    <div className="max-w-[85%] mr-auto mb-4 pl-2 xs:pl-3 sm:pl-0">
      <div className="bg-gradient-to-r from-[#2a2a2a]/80 to-[#1a1a1a]/90 backdrop-blur-sm text-white rounded-2xl p-3 relative overflow-hidden shadow-lg border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#cc2b5e]/5 to-transparent opacity-70"></div>
        <div className="relative z-10 flex items-center">
          <div className="mr-3">
            {generatingMediaType === 'image' ? (
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border-2 border-[#cc2b5e]/20 opacity-75"></div>
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#cc2b5e] animate-spin"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-[#cc2b5e]/50 to-[#cc2b5e]/10 animate-pulse"></div>
              </div>
            ) : (
              <div className="flex space-x-1 h-8 items-center">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-[#cc2b5e] to-[#cc2b5e]/70 rounded-full animate-sound-wave shadow-[0_0_8px_rgba(204,43,94,0.5)]"
                    style={{
                      height: `${Math.max(12, 8 + Math.sin((i * 0.8) + Date.now()/500) * 12)}px`,
                      animationDelay: `${i * 0.15}s`,
                      transform: `translateY(${Math.sin(i * 0.5) * 2}px)`,
                    }}
                  ></div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium tracking-wide">
              {generatingMediaType === 'image' 
                ? 'Creating your image...' 
                : 'Composing your music...'}
            </p>
            <p className="text-xs text-white/70 font-light">
              This might take a moment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MediaLoadingAnimation = ({ mediaType }) => {
  return (
    <div className="max-w-[85%] mr-auto mb-4 pl-2 xs:pl-3 sm:pl-0">
      <div className="bg-gradient-to-br from-[#2a2a2a]/90 to-[#1a1a1a]/90 text-white rounded-2xl p-3 shadow-lg border border-white/10 overflow-hidden">
        <div className="relative">
          {mediaType === 'image' ? (
            <div className="w-full h-36 sm:h-44 bg-gradient-to-tr from-black/40 to-black/10 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" 
                     style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }}></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtMTAgMC0xOCA4LTE4IDE4czggMTggMTggMTggMTgtOCAxOC0xOC04LTE4LTE4LTE4em0wLTRjMTIuMTUgMCAyMiA5Ljg1IDIyIDIycy05Ljg1IDIyLTIyIDIyLTIyLTkuODUtMjItMjIgOS44NS0yMiAyMi0yMnoiIGZpbGwtb3BhY2l0eT0iLjA1IiBmaWxsPSIjRkZGIi8+PHBhdGggZD0iTTQzLjY3IDMwLjM0YTggOCAwIDAgMC0xNS4zNC4wNkE4IDggMCAwIDAgMzYuMDUgNDZhOCA4IDAgMCAwIDcuNjItMTUuNjZ6TTI0IDMwLjkzYTEyIDEyIDAgMCAxIDAtMS44NmwuNC0uMDJjLjQ2LS4wMyAxLS4xNSAxLjYtLjNoLS4wMkE5IDkgMCAwIDEgMzIuOSAxOGE5IDkgMCAwIDEgNy42NiAxMy44OWwtLjAyLS4wMWMuNjEuOTQuNTQgMS42Ny41MiAxLjY5bC0yLjAzLS2Yz1kxXYBYCBvcGFjaXR5PSIuNSIgZmlsbD0iI2NjMmI1ZSIvPjwvZz48L3N2Zz4=')] bg-center opacity-10"></div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="relative w-12 h-12 mb-2">
                  <svg className="animate-spin absolute inset-0 text-[#cc2b5e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-[#cc2b5e]/30 to-transparent animate-pulse"></div>
                </div>
                <p className="text-sm font-medium tracking-wide text-white/90">Creating your masterpiece...</p>
                <p className="text-xs text-white/60 mt-1">Adding final touches</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-28 sm:h-32 bg-gradient-to-tr from-black/60 to-black/20 rounded-xl relative overflow-hidden">
              {/* Abstract background elements */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-r from-[#cc2b5e]/5 via-transparent to-[#cc2b5e]/5" style={{opacity: 0.2}}></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(204,43,94,0.15)_0%,transparent_70%)]"></div>
                
                {/* Animated music notes - reduced size */}
                <div className="absolute top-0 right-1/4 text-[#cc2b5e]/30 text-sm animate-float" style={{animationDuration: '3s'}}>♪</div>
                <div className="absolute top-1/3 right-1/3 text-[#cc2b5e]/20 text-sm animate-float" style={{animationDuration: '4s', animationDelay: '0.5s'}}>♫</div>
                <div className="absolute top-2/3 right-1/2 text-[#cc2b5e]/30 text-sm animate-float" style={{animationDuration: '3.5s', animationDelay: '1s'}}>♪</div>
              </div>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                {/* Vinyl record animation - reduced size */}
                <div className="relative w-14 h-14 mb-2">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-black to-[#333] border border-[#cc2b5e]/30 animate-spin" style={{animationDuration: '3s'}}></div>
                  <div className="absolute inset-[30%] rounded-full bg-[#cc2b5e]/20 border border-[#cc2b5e]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-0.5 h-0.5 rounded-full bg-white/70"></div>
                  </div>
                  
                  {/* Lines on the vinyl */}
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className="absolute inset-0 rounded-full border border-gray-600/20"
                      style={{
                        transform: `scale(${0.85 - i * 0.1})`,
                      }}
                    ></div>
                  ))}
                  
                  {/* Frequency visualization - reduced size */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex items-end space-x-0.5">
                    {[...Array(12)].map((_, i) => {
                      const middleIndex = 6;
                      const distFromMiddle = Math.abs(i - middleIndex);
                      const heightPercentage = 100 - (distFromMiddle * 12);
                      
                      return (
                        <div 
                          key={i}
                          className="w-0.5 bg-gradient-to-t from-[#cc2b5e] to-[#cc2b5e]/20 rounded-t-full"
                          style={{ 
                            height: `${heightPercentage * 0.12}rem`,
                            animation: 'musicBars 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.05}s`,
                          }}
                        ></div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm font-medium tracking-wide text-white/90">Creating your harmony...</p>
                  <p className="text-xs text-white/60">Composing something special</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#cc2b5e] animate-pulse mr-1"></div>
              <span className="text-xs text-white/70">Processing in Vaani...</span>
            </div>
            <div className="text-xs text-white/50 tracking-wide">
              {mediaType === 'image' ? 'AI generated imagery' : 'AI composed audio'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

