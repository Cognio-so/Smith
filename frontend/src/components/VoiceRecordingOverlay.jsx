import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Update gradient texture with new colors
const gradientTexture = new THREE.CanvasTexture((() => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, '#1a1020');  // Dark color for sphere
  gradient.addColorStop(1, '#2a1835');  // Dark color for sphere
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return canvas;
})());

function AnimatedSphere({ isActive }) {
  const meshRef = useRef(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.getElapsedTime() * (isActive ? 0.5 : 0.2);
    meshRef.current.rotation.y = state.clock.getElapsedTime() * (isActive ? 0.3 : 0.1);
    meshRef.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.1;
  });

  return (
    <Sphere args={[1, 64, 64]} ref={meshRef}>
      <MeshDistortMaterial
        attach="material"
        distort={isActive ? 0.4 : 0.2}
        speed={isActive ? 2 : 1}
        roughness={0.4}
        metalness={0.3}
        radius={1}
      >
        <primitive attach="map" object={gradientTexture} />
      </MeshDistortMaterial>
    </Sphere>
  );
}

function VoiceRecordingOverlay({ 
  onClose, 
  isRecording, 
  isUserSpeaking, 
  isAISpeaking,
  messages = [],
  isProcessing
}) {
  const [intensity, setIntensity] = useState(1);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return createPortal(
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 w-screen h-screen z-[99999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#dae2f8] to-[#d6a4a4]" />
        <div className="relative h-full flex flex-col">
          <div className="absolute top-4 left-4">
            <motion.button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiX className="w-6 h-6 text-white/90" />
            </motion.button>
          </div>

          <div className="flex-1 px-4 overflow-y-auto scrollbar-none pt-16 pb-48">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.type === 'user' 
                        ? 'bg-gradient-to-r from-[#2a1835] to-[#1a1020] shadow-lg'
                        : 'bg-[#1a1020] shadow-lg'
                    }`}
                  >
                    <p className="text-white/90 text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-48">
            <Canvas 
              camera={{ position: [0, 0, 3] }}
              style={{ WebkitBackfaceVisibility: 'hidden' }}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <AnimatedSphere isActive={isUserSpeaking || isAISpeaking} />
            </Canvas>
            
            <motion.span 
              className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/90 text-sm"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isUserSpeaking ? "Listening..." : isAISpeaking ? "Speaking..." : "Try saying something..."}
            </motion.span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default VoiceRecordingOverlay; 
