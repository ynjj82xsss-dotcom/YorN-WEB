import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Background from './Background';

interface SplashLoaderProps {
  isLoading: boolean;
  onComplete: () => void;
  theme: string;
  disableAnimations?: boolean;
}

export default function SplashLoader({ isLoading, onComplete, theme, disableAnimations = false }: SplashLoaderProps) {
  const [step, setStep] = useState<number>(0);
  const [isExiting, setIsExiting] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // If animations are disabled, immediately complete when loading is done
  useEffect(() => {
    if (disableAnimations && !isLoading) {
      onCompleteRef.current();
    }
  }, [isLoading, disableAnimations]);

  // Step 0 timer: minimum time for the main logo
  useEffect(() => {
    if (disableAnimations) return;
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [disableAnimations]);

  // Step transitions
  useEffect(() => {
    if (disableAnimations) return;
    // Stage 0 -> Stage 1 (AURA DEVELOPMENT)
    if (step === 0 && minTimeElapsed && !isLoading) {
      setStep(1);
    }
  }, [step, minTimeElapsed, isLoading, disableAnimations]);

  useEffect(() => {
    if (disableAnimations) return;
    if (step === 1) {
      const t = setTimeout(() => {
        setStep(2);
      }, 2000);
      return () => clearTimeout(t);
    }
    if (step === 2) {
      const t = setTimeout(() => {
        setStep(3);
      }, 2000);
      return () => clearTimeout(t);
    }
    if (step === 3) {
      const t = setTimeout(() => {
        setIsExiting(true);
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [step, disableAnimations]);

  // Handle final exit transition
  useEffect(() => {
    if (disableAnimations) return;
    if (isExiting) {
      const exitTimer = setTimeout(() => {
        onCompleteRef.current();
      }, 550);
      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, disableAnimations]);

  if (disableAnimations) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070707] overflow-hidden select-none" data-theme={theme}>
        {isLoading && (
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#1A1A1A] border border-[#222] animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // Content render for each stage
  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            key="yorn"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col items-center justify-center text-center p-8"
          >
            {/* Outer soft breathing circle ring */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.2, 0.4, 0.2]
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

              {/* YorN Logo */}
              <svg 
                viewBox="0 0 100 100" 
                className="w-10 h-10 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" 
                fill="none" 
                stroke="#F3F4F6" 
                strokeWidth="7" 
                strokeLinejoin="miter"
                strokeLinecap="round"
              >
                <motion.path 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.1 }}
                  d="M15 20 L40 55 V85 M65 20 L40 55" 
                />
                <motion.path 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }}
                  d="M55 85 V20 L85 85 V20" 
                />
              </svg>
            </div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-stone-300 font-sans tracking-[0.25em] text-xs font-semibold mt-6 uppercase"
            >
              YorN Intelligence
            </motion.h2>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="auradev"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col items-center justify-center text-center p-8"
          >
            {/* Elegant Aura Development Lightning Frame */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Pulsing deep-blue outer border ring */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.15, 0.35, 0.15]
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 rounded-full border border-blue-500/20"
              />

              {/* Subtly tinted circular backplate */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-b from-[#0a1122] to-[#04060d] border border-blue-500/15 shadow-inner" />

              {/* White sharp lightning-A vector representation (AURA logo) */}
              <svg 
                viewBox="0 0 100 100" 
                className="w-12 h-12 relative z-10 text-white drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" 
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="miter"
              >
                <path 
                  fill="currentColor"
                  stroke="none"
                  d="M50 16 L22 76 L44 53 L38 58 L57 39 L49 61 L78 76 Z" 
                />
              </svg>
            </div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-stone-100 font-sans tracking-[0.2em] text-xs font-semibold mt-6 uppercase"
            >
              AURA DEVELOPMENT
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-neutral-500 font-mono text-[9px] tracking-widest mt-2 uppercase"
            >
              Frontend & Design
            </motion.p>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="maya"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col items-center justify-center text-center p-8"
          >
            {/* Elegant Maya Gothic Crest */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <motion.div 
                animate={{ 
                  scale: [1, 1.03, 1],
                  opacity: [0.15, 0.3, 0.15]
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 rounded-2xl border border-violet-500/20"
              />

              <div className="absolute inset-2 rounded-xl bg-[#110D1A]/50 border border-violet-500/15 shadow-inner" />

              {/* Geometric gothic "MAYA" text in deep shiny Royal Violet with spikes */}
              <svg 
                viewBox="0 0 200 100" 
                className="w-20 h-10 relative z-10 text-[#C084FC] drop-shadow-[0_2px_15px_rgba(168,85,247,0.4)]" 
                fill="currentColor"
              >
                <g stroke="#A855F7" strokeWidth="1" strokeLinejoin="miter">
                  {/* M */}
                  <path d="M20,70 L25,30 L38,55 L50,22 L62,55 L75,30 L80,70 L67,70 L62,45 L50,65 L38,45 L33,70 Z" />
                  {/* A */}
                  <path d="M85,70 L100,22 L115,70 L102,70 L98,58 L102,58 L100,50 L94,58 Z" />
                  {/* Y */}
                  <path d="M120,22 L132,48 L132,70 L138,70 L138,48 L150,22 L139,22 L135,38 L131,22 Z" />
                  {/* A */}
                  <path d="M155,70 L170,22 L185,70 L172,70 L168,58 L172,58 L170,50 L164,58 Z" />
                </g>
              </svg>
            </div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-stone-200 font-sans tracking-[0.3em] text-xs font-semibold mt-6 uppercase pl-[0.3em]"
            >
              MAYA
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-neutral-500 font-mono text-[9px] tracking-widest mt-2 uppercase"
            >
              Backend
            </motion.p>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="hcode"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col items-center justify-center text-center p-8"
          >
            {/* Elegant h-Code Puffy Glow Logo */}
            <div className="relative w-40 h-24 flex items-center justify-center">
              <motion.div 
                animate={{ 
                  scale: [1, 1.04, 1],
                  opacity: [0.15, 0.35, 0.15]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 rounded-2xl border border-red-500/20"
              />

              <div className="absolute inset-1.5 rounded-xl bg-gradient-to-b from-[#1c0a0a] to-[#080303] border border-red-500/10 shadow-inner" />

              {/* Replicating the "h-Code" neon bubble graphic perfectly with Fredoka and the glow effect */}
              <div className="relative z-10 flex items-center justify-center">
                <span className="font-fredoka text-3xl font-bold tracking-tight text-white neon-red-glow select-none">
                  h-Code
                </span>
              </div>
            </div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-stone-200 font-sans tracking-[0.25em] text-xs font-semibold mt-6 uppercase"
            >
              h-Code
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-neutral-500 font-mono text-[9px] tracking-widest mt-2 uppercase"
            >
              Security
            </motion.p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 0.99,
            filter: "blur(6px)",
            transition: { duration: 0.55, ease: [0.25, 1, 0.5, 1] }
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070707] overflow-hidden select-none"
          data-theme={theme}
        >
          {/* Subtle ambient blurred backing */}
          <div className="absolute inset-0 z-0 opacity-20">
            <Background isTyping={true} />
          </div>

          <div className="relative z-10 max-w-sm w-full h-80 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
