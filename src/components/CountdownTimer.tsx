import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface CountdownTimerProps {
  targetDateStr: string; // ISO or parseable date string
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isCompleted: boolean;
}

export function CountdownTimer({ targetDateStr }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false,
  });

  useEffect(() => {
    // Target date in MSK (UTC+3)
    const target = new Date(targetDateStr).getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isCompleted: true,
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isCompleted: false,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDateStr]);

  const timeBlocks = [
    { label: "Дней", value: timeLeft.days },
    { label: "Часов", value: timeLeft.hours },
    { label: "Минут", value: timeLeft.minutes },
    { label: "Секунд", value: timeLeft.seconds },
  ];

  return (
    <div className="w-full flex flex-col items-center gap-4 my-6">
      <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono flex items-center gap-2 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
        Приходи через:
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-3 w-full">
        {timeBlocks.map((block, idx) => (
          <motion.div
            key={block.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx, duration: 0.5 }}
            className="relative overflow-hidden bg-neutral-900/70 border border-neutral-800 p-3 md:p-4 rounded-xl flex flex-col items-center justify-center shadow-sm"
          >
            {/* Ambient subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-800/10 to-transparent z-0 pointer-events-none" />

            {/* Scrolling digit change indicator */}
            <div className="relative z-10 h-8 md:h-10 flex items-center justify-center overflow-hidden font-mono text-2xl md:text-3xl font-bold text-neutral-100 tracking-tight">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={block.value}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="block"
                >
                  {String(block.value).padStart(2, "0")}
                </motion.span>
              </AnimatePresence>
            </div>

            <span className="relative z-10 text-[10px] md:text-xs text-neutral-400 font-medium select-none mt-1">
              {block.label}
            </span>
          </motion.div>
        ))}
      </div>

      {timeLeft.isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs text-neutral-300 font-mono mt-2 select-none"
        >
          Время пришло! ⏳
        </motion.div>
      )}
    </div>
  );
}
