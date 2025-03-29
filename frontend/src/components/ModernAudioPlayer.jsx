import React, { useState, useRef, useMemo } from 'react';

const ModernAudioPlayer = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 15);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Generate bars pattern that exactly matches the image
  const generateBars = () => {
    const bars = [];
    const numberOfBars = 35; // Adjusted to match image exactly
    
    for (let i = 0; i < numberOfBars; i++) {
      let height;
      const center = numberOfBars / 2;
      const distanceFromCenter = Math.abs(i - center);
      
      // Create exact wave pattern from the image
      if (distanceFromCenter < 3) {
        // Deepest dip in center
        height = 6;
      } else if (distanceFromCenter < 6) {
        // First rise from center
        height = 15;
      } else if (distanceFromCenter < 9) {
        // Second level
        height = 22;
      } else if (distanceFromCenter < 12) {
        // Third level
        height = 18;
      } else {
        // Outer edges
        height = 12;
      }
      
      bars.push(height);
    }
    
    return bars;
  };

  const bars = useMemo(generateBars, [url]);
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="bg-[#2a2a2a] rounded-xl overflow-hidden max-w-sm">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />
      
      {/* Header section */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <div className="bg-[#cc2b5e] w-12 h-12 rounded-full flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <div className="text-white">
            <div className="font-semibold">Generated Audio</div>
            <div className="text-sm text-white/70">Vaani.pro</div>
          </div>
        </div>
        
        <a 
          href={url} 
          download
          className="bg-[#cc2b5e] w-10 h-10 rounded-full flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
      
      {/* Waveform visualization */}
      <div className="px-4 py-2">
        <div className="h-16 flex items-center justify-center">
          <div className="w-full flex items-end justify-center gap-[2px]">
            {bars.map((height, i) => {
              const isPlayed = (i / bars.length) * 100 <= progressPercent;
              
              return (
                <div
                  key={i}
                  className={`w-[3px] ${isPlayed ? 'bg-[#cc2b5e]' : 'bg-[#384759]'}`}
                  style={{ 
                    height: `${height}px`,
                    transition: 'background-color 0.2s ease'
                  }}
                ></div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Player controls */}
      <div className="flex items-center p-4 pt-2">
        <button
          onClick={togglePlay}
          className="bg-[#cc2b5e] w-12 h-12 rounded-full flex items-center justify-center mr-4"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        <div className="flex-1 flex items-center space-x-2">
          <span className="text-white text-sm">
            {formatTime(progress)}
          </span>
          
          <div className="flex-1 relative h-1 bg-gray-700 rounded-full">
            <input
              type="range"
              min="0"
              max={duration || 15}
              value={progress}
              step="0.01"
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute h-1 bg-[#cc2b5e] rounded-full" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          
          <span className="text-white text-sm">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModernAudioPlayer;