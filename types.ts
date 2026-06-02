import { motion } from 'motion/react';

interface BackgroundProps {
  isTyping?: boolean;
}

export default function Background({ isTyping }: BackgroundProps) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#050505]">
      {/* Blob 1 */}
      <motion.div
        animate={{
          x: ['0%', '15%', '-10%', '0%'],
          y: ['0%', '-15%', '10%', '0%'],
          opacity: isTyping ? [0.4, 0.75, 0.4] : [0.2, 0.4, 0.2],
          backgroundColor: isTyping ? '#5b21b6' : '#121212',
          scale: isTyping ? [1, 1.18, 1] : 1
        }}
        transition={{ 
          duration: isTyping ? 12 : 25, 
          repeat: Infinity, 
          ease: 'linear', 
          backgroundColor: { duration: 0.8 },
          scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } 
        }}
        className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] will-change-transform"
      />

      {/* Blob 2 */}
      <motion.div
        animate={{
          x: ['0%', '-20%', '15%', '0%'],
          y: ['0%', '15%', '-20%', '0%'],
          opacity: isTyping ? [0.35, 0.7, 0.35] : [0.15, 0.3, 0.15],
          backgroundColor: isTyping ? '#701a75' : '#1A1A1A',
          scale: isTyping ? [1, 1.15, 1] : 1
        }}
        transition={{ 
          duration: isTyping ? 15 : 32, 
          repeat: Infinity, 
          ease: 'linear', 
          backgroundColor: { duration: 0.8 },
          scale: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] will-change-transform"
      />
      
      {/* subtle central glow */}
      <motion.div
        animate={{
          opacity: isTyping ? [0.5, 0.85, 0.5] : [0.3, 0.5, 0.3],
          backgroundColor: isTyping ? '#6b21a8' : '#0F0F0F',
          scale: isTyping ? [1.1, 1.35, 1.1] : [1, 1, 1],
        }}
        transition={{ 
          duration: isTyping ? 8 : 15, 
          repeat: Infinity, 
          ease: 'easeInOut', 
          backgroundColor: { duration: 0.8 }, 
          scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } 
        }}
        className="absolute top-[30%] left-[40%] w-[300px] h-[300px] rounded-full blur-[100px] will-change-transform"
      />

      {/* Animated Full-Screen Screen-Edge Vignette Breathing Pulsar when typing */}
      {isTyping && (
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

      {/* Dedicated high-frequency neural thinking heartbeat core */}
      {isTyping && (
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
