"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ChevronRight, ChevronLeft, Volume2, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Segment {
  slide_title: string;
  bullets: string[];
  script: string;
  imageUrl: string;
  audioUrl: string;
}

export default function PresentationPlayer({ segments = [] }: { segments: Segment[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = segments[currentIndex];

  const sentences = useMemo(() => {
    if (!current?.script) return [];
    return current.script.match(/[^.!?]+[.!?]+/g) || [current.script];
  }, [current?.script]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextSegment = () => {
    if (currentIndex < segments.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentSentenceIdx(0);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
      setCurrentSentenceIdx(0);
    }
  };

  const prevSegment = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setCurrentSentenceIdx(0);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleTimeUpdate = () => {
    if (!audioRef.current || sentences.length === 0) return;
    const currentTime = audioRef.current.currentTime;
    const duration = audioRef.current.duration;
    if (isNaN(duration) || duration === 0) return;

    const adjustedTime = Math.min(currentTime + 1.0, duration);
    const progress = adjustedTime / duration;
    
    const estimatedIndex = Math.min(
      Math.floor(progress * sentences.length),
      sentences.length - 1
    );

    if (estimatedIndex !== currentSentenceIdx) {
      setCurrentSentenceIdx(estimatedIndex);
    }
  };

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentIndex]);

  if (!segments || segments.length === 0) return null;

  return (
    <div 
      ref={containerRef} 
      // FIX 1: Added [container-type:inline-size] so child elements can read this div's exact width
      className={`relative w-full aspect-video bg-black overflow-hidden group [container-type:inline-size] ${
        isFullscreen ? "rounded-none" : "rounded-xl shadow-2xl"
      }`}
    >
      
      {/* 1. BACKGROUND LAYER */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`bg-${currentIndex}`}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 15, ease: "linear" }}
            className="w-full h-full bg-cover bg-center opacity-70" 
            style={{ backgroundImage: `url(${current.imageUrl})` }}
          />
        </AnimatePresence>
      </div>

      {/* 2. TEXT CONTENT LAYER */}
      <div className={`absolute inset-0 flex flex-col justify-center items-center text-left z-10 ${
        // FIX 2: Liquid padding using cqi
        isFullscreen ? "p-16 pb-32" : "p-[clamp(1rem,4cqi,2rem)] pb-[clamp(3rem,10cqi,5rem)]"
      }`}>
         <div className={`bg-black/80 border border-white/10 w-full max-w-4xl shadow-2xl ${
           // FIX 3: Liquid inner padding
           isFullscreen ? "p-10 rounded-2xl" : "p-[clamp(0.75rem,3cqi,1.5rem)] rounded-xl"
         }`}>
           <motion.h2 
             key={`title-${currentIndex}`}
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             // FIX 4: Liquid font size for Title. Scales fluidly between 14px and 28px based on container width
             className={`font-bold text-white drop-shadow-md leading-tight ${
               isFullscreen ? "text-3xl md:text-4xl mb-6" : "text-[clamp(14px,4cqi,28px)] mb-[clamp(0.5rem,2cqi,1rem)]"
             }`}
           >
             {current.slide_title}
           </motion.h2>
           <ul className={`list-none p-0 ${isFullscreen ? "space-y-4" : "space-y-[clamp(0.25rem,1.5cqi,0.75rem)]"}`}>
             {current.bullets.map((bullet, i) => (
               <motion.li 
                 key={`bullet-${currentIndex}-${i}`} 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: i * 0.2 }}
                 // FIX 5: Liquid font size for Bullets. Scales between 10px and 18px.
                 className={`flex items-start drop-shadow-md text-gray-100 ${
                   isFullscreen ? "text-lg md:text-xl gap-3" : "text-[clamp(10px,2.5cqi,18px)] gap-[clamp(0.3rem,1.5cqi,0.75rem)] leading-snug"
                 }`}
               >
                 <div className={`rounded-full bg-primary shrink-0 ${isFullscreen ? "mt-2.5 h-2 w-2" : "mt-[clamp(0.25rem,1cqi,0.4rem)] h-[clamp(4px,0.8cqi,6px)] w-[clamp(4px,0.8cqi,6px)]"}`} />
                 {bullet}
               </motion.li>
             ))}
           </ul>
         </div>
      </div>

      {/* 3. CAPTIONS LAYER */}
      <div className={`absolute inset-x-0 flex justify-center z-20 pointer-events-none transition-all duration-300 ${
        isFullscreen ? "bottom-12 px-12" : "bottom-[clamp(0.5rem,3cqi,1.5rem)] px-[clamp(0.5rem,3cqi,1.5rem)]"
      }`}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={`sentence-${currentIndex}-${currentSentenceIdx}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className={`bg-black/90 border border-white/20 text-center shadow-lg ${
              isFullscreen ? "px-6 py-3 rounded-xl max-w-3xl" : "px-[clamp(0.5rem,2cqi,1rem)] py-[clamp(0.25rem,1cqi,0.5rem)] rounded-lg max-w-[95%]"
            }`}
          >
            {/* FIX 6: Liquid font size for Captions */}
            <p className={`text-blue-50 flex items-center justify-center gap-2 ${
              isFullscreen ? "text-base md:text-lg" : "text-[clamp(9px,2cqi,14px)] leading-tight"
            }`}>
              <Volume2 className={`opacity-70 shrink-0 text-primary ${isFullscreen ? "h-5 w-5" : "h-[clamp(10px,2.5cqi,16px)] w-[clamp(10px,2.5cqi,16px)]"}`} />
              <span className="italic line-clamp-2">"{sentences[currentSentenceIdx]?.trim()}"</span>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 4. CONTROLS LAYER */}
      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent flex items-center justify-between z-30 transition-opacity group-hover:opacity-100 opacity-0 ${
        isFullscreen ? "p-4" : "p-[clamp(0.25rem,2cqi,1rem)]"
      }`}>
        <div className="flex items-center gap-[clamp(0.25rem,1cqi,0.5rem)]">
          <Button variant="ghost" size="icon" className={`${isFullscreen ? "h-8 w-8" : "h-6 w-6 sm:h-8 sm:w-8"} text-white hover:bg-white/20`} onClick={prevSegment} disabled={currentIndex === 0}>
            <ChevronLeft className={`${isFullscreen ? "h-5 w-5" : "h-3 w-3 sm:h-4 sm:w-4"}`} />
          </Button>

          <Button variant="secondary" size="icon" className={`${isFullscreen ? "h-10 w-10" : "h-6 w-6 sm:h-8 sm:w-8"} rounded-full`} onClick={togglePlay}>
            {isPlaying ? <Pause className={`${isFullscreen ? "h-5 w-5" : "h-3 w-3"}`} /> : <Play className={`${isFullscreen ? "h-5 w-5" : "h-3 w-3"} fill-current ml-0.5`} />}
          </Button>

          <Button variant="ghost" size="icon" className={`${isFullscreen ? "h-8 w-8" : "h-6 w-6 sm:h-8 sm:w-8"} text-white hover:bg-white/20`} onClick={nextSegment} disabled={currentIndex === segments.length - 1}>
            <ChevronRight className={`${isFullscreen ? "h-5 w-5" : "h-3 w-3 sm:h-4 sm:w-4"}`} />
          </Button>
        </div>

        <div className="flex items-center gap-[clamp(0.25rem,1.5cqi,0.75rem)]">
          <div className={`font-mono text-white/70 bg-black/50 rounded-full border border-white/10 ${
            isFullscreen ? "text-xs px-3 py-1" : "text-[clamp(8px,1.5cqi,12px)] px-2 py-0.5"
          }`}>
            {currentIndex + 1} / {segments.length}
          </div>
          <Button variant="ghost" size="icon" className={`${isFullscreen ? "h-8 w-8" : "h-6 w-6 sm:h-8 sm:w-8"} text-white hover:bg-white/20`} onClick={toggleFullScreen}>
            {isFullscreen ? <Minimize className={`${isFullscreen ? "h-4 w-4" : "h-3 w-3"}`} /> : <Maximize className={`${isFullscreen ? "h-4 w-4" : "h-3 w-3"}`} />}
          </Button>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={current.audioUrl}
        onEnded={nextSegment}
        onTimeUpdate={handleTimeUpdate} 
        style={{ display: "none" }}
      />
    </div>
  );
}