import { motion } from 'motion/react';

interface BackgroundProps {
  isTyping?: boolean;
  isMobileDevice?: boolean;
}

export default function Background({ isTyping, isMobileDevice }: BackgroundProps) {
  // Compute optimized values based on device detection
  const blurValue1 = isMobileDevice ? 'blur-[65px]' : 'blur-[100px]';
  const blurValue2 = isMobileDevice ? 'blur-[75px]' : 'blur-[120px]';
  const blurValue3 = isMobileDevice ? 'blur-[60px]' : 'blur-[100px]';

  // Reduce translation frames on mobile to prevent intensive composite paints
  const translateKeyframes1 = isMobileDevice 
    ? { x: ['0%', '5%', '0%'], y: ['0%', '-5%', '0%'] }
    : { x: ['0%', '15%', '-10%', '0%'], y: ['0%', '-15%', '10%', '0%'] };

  const translateKeyframes2 = isMobileDevice
    ? { x: ['0%', '-6%', '0%'], y: ['0%', '6%', '0%'] }
    : { x: ['0%', '-20%', '15%', '0%'], y: ['0%', '15%', '-20%', '0%'] };

  // Adjust timing to be slower and gentler on low-end processors
  const durationMultiplier = isMobileDevice ? 1.6 : 1.0;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#050505]">
      {/* Blob 1 */}
      <motion.div
        animate={{
          ...translateKeyframes1,
          opacity: isTyping ? [0.35, 0.6, 0.35] : [0.15, 0.3, 0.15],
          backgroundColor: isTyping ? '#5b21b6' : '#121212',
          scale: isTyping ? [1, 1.08, 1] : 1
        }}
        transition={{ 
          duration: (isTyping ? 12 : 25) * durationMultiplier, 
          repeat: Infinity, 
          ease: 'linear', 
          backgroundColor: { duration: 0.8 },
          scale: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } 
        }}
        className={`absolute top-[-10%] left-[-5%] w-[320px] md:w-[400px] h-[320px] md:h-[400px] rounded-full will-change-transform ${blurValue1}`}
      />

      {/* Blob 2 */}
      <motion.div
        animate={{
          ...translateKeyframes2,
          opacity: isTyping ? [0.3, 0.55, 0.3] : [0.1, 0.25, 0.1],
          backgroundColor: isTyping ? '#701a75' : '#1A1A1A',
          scale: isTyping ? [1, 1.06, 1] : 1
        }}
        transition={{ 
          duration: (isTyping ? 15 : 32) * durationMultiplier, 
          repeat: Infinity, 
          ease: 'linear', 
          backgroundColor: { duration: 0.8 },
          scale: { duration: 4.0, repeat: Infinity, ease: 'easeInOut' }
        }}
        className={`absolute bottom-[-15%] right-[-10%] w-[380px] md:w-[500px] h-[380px] md:h-[500px] rounded-full will-change-transform ${blurValue2}`}
      />
      
      {/* subtle central glow */}
      <motion.div
        animate={{
          opacity: isTyping ? [0.4, 0.65, 0.4] : [0.2, 0.35, 0.2],
          backgroundColor: isTyping ? '#6b21a8' : '#0F0F0F',
          scale: isTyping ? [1.05, 1.15, 1.05] : [1, 1, 1],
        }}
        transition={{ 
          duration: (isTyping ? 8 : 15) * durationMultiplier, 
          repeat: Infinity, 
          ease: 'easeInOut', 
          backgroundColor: { duration: 0.8 }, 
          scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } 
        }}
        className={`absolute top-[30%] left-[30%] md:left-[40%] w-[240px] md:w-[300px] h-[240px] md:h-[300px] rounded-full will-change-transform ${blurValue3}`}
      />

      {/* Animated Full-Screen Screen-Edge Vignette Breathing Pulsar when typing - Only on PC */}
      {isTyping && !isMobileDevice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.65, 0.2] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0,0,0,0) 40%, rgba(139,92,246,0.1) 100%)'
          }}
        />
      )}

      {/* Dedicated neural thinking core - Only on PC */}
      {isTyping && !isMobileDevice && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.15, 0.5, 0.15],
            scale: [0.8, 1.15, 0.8]
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full pointer-events-none blur-[120px] z-[1]"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.16) 0%, rgba(0,0,0,0) 70%)'
          }}
        />
      )}

      {/* Noise overlay for texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-[2]" 
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat'
        }}
      />
    </div>
  );
}
