import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Background from './Background';

interface SplashLoaderProps {
  isLoading: boolean;
  onComplete: () => void;
  theme: string;
}

export default function SplashLoader({ isLoading, onComplete, theme }: SplashLoaderProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Store the onComplete callback in a ref to avoid effect cleanup cycles
  // caused by parent component re-renders (where onComplete is an inline arrow function).
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Elegant, short introductory loading phase (1.8s) for maximum fluid feel
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1800);

    return () => clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    if (minTimeElapsed && !isLoading && !isExiting) {
      setIsExiting(true);
    }
  }, [minTimeElapsed, isLoading, isExiting]);

  useEffect(() => {
    if (isExiting) {
      const exitTimer = setTimeout(() => {
        onCompleteRef.current();
      }, 500);
      return () => clearTimeout(exitTimer);
    }
  }, [isExiting]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 0.98,
            filter: "blur(8px)",
            transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] }
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
          data-theme={theme}
        >
          {/* Subtle ambient blurred backing */}
          <div className="absolute inset-0 z-0 opacity-25">
            <Background isTyping={true} />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center p-8 max-w-sm w-full text-center">
            {/* Elegant glowing SVG logo container */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
              className="relative w-24 h-24 mb-6 flex items-center justify-center"
            >
              {/* Outer soft breathing circle ring */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.04, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 rounded-2xl border border-white/10"
              />

              {/* Glassmorphic card frame */}
              <div className="absolute inset-1 rounded-xl bg-gradient-to-b from-white/5 to-white/[0.01] border border-white/5 shadow-2xl backdrop-blur-md" />

              {/* The stylized SVG logo from the sidebars */}
              <svg 
                viewBox="0 0 100 100" 
                className="w-10 h-10 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" 
                fill="none" 
                stroke="#F3F4F6" 
                strokeWidth="7" 
                strokeLinejoin="miter"
                strokeLinecap="round"
              >
                {/* Stylized Y */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.1 }}
                  d="M15 20 L40 55 V85 M65 20 L40 55" 
                />
                {/* Stylized N */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }}
                  d="M55 85 V20 L85 85 V20" 
                />
              </svg>
            </motion.div>

            {/* Minimally polished text and subtle tracking */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-1.5 mb-8"
            >
              <h1 className="text-xl font-medium text-white tracking-wider font-sans select-none">
                YorN AI
              </h1>
              <p className="text-[10px] tracking-[0.25em] text-[#666] font-mono select-none uppercase">
                Атмосферный интеллект
              </p>
            </motion.div>

            {/* Sleek aesthetic visual-only progress bar */}
            <div className="w-40 flex flex-col items-center">
              <div className="w-full h-[1.5px] bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-neutral-600 via-neutral-300 to-neutral-600 rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
