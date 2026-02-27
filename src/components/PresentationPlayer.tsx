"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Segment {
  slide_title: string;
  bullets: string[];
  script: string;
  imageUrl: string;
  audioUrl: string;
}

export default function PresentationPlayer({ segments }: { segments: Segment[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const current = segments[currentIndex];

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextSegment = () => {
    if (currentIndex < segments.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  };
  const mockVideoSegments = [
  {
    slide_title: "Welcome to Computer Science!",
    bullets: [
      "The study of algorithms and data structures.",
      "The foundation of modern digital technology.",
      "Building blocks for AI and Software Engineering."
    ],
    script: "Welcome to your first lesson. Today, we dive into the world of computer science, exploring how algorithms and data structures form the backbone of our digital world.",
    imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
  }
];

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentIndex]);

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video relative group">
      
      {/* 1. ANIMATED BACKGROUND (KEN BURNS) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 1.15, opacity: 1 }} // Slow zoom
          exit={{ opacity: 0 }}
          transition={{ duration: 15, ease: "linear" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${current.imageUrl})` }}
        />
      </AnimatePresence>

      {/* 2. OVERLAY CONTENT (PERFECT TYPOGRAPHY) */}
      <div className="absolute inset-0 bg-black/40 flex flex-col justify-center p-16 text-white z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          key={`text-${currentIndex}`}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <h2 className="text-5xl font-black mb-6 drop-shadow-2xl uppercase tracking-tighter">
            {current.slide_title}
          </h2>
          <ul className="space-y-4">
            {current.bullets.map((bullet, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + (i * 0.3) }}
                className="text-2xl font-medium flex items-center gap-3 drop-shadow-md"
              >
                <span className="h-2 w-2 bg-blue-500 rounded-full" />
                {bullet}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* 3. DYNAMIC CAPTIONS */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <motion.p 
           key={`script-${currentIndex}`}
           initial={{ opacity: 0 }} animate={{ opacity: 1 }}
           className="bg-black/70 backdrop-blur-md px-8 py-3 rounded-full text-xl text-blue-100 border border-white/20"
        >
          {current.script}
        </motion.p>
      </div>

      {/* 4. CONTROLS */}
      <div className="absolute bottom-4 right-6 flex items-center gap-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={togglePlay} className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-3 rounded-full">
          {isPlaying ? "⏸" : "▶️"}
        </button>
        <div className="text-white font-mono text-sm bg-black/50 px-3 py-1 rounded">
          {currentIndex + 1} / {segments.length}
        </div>
      </div>

      <audio 
        ref={audioRef}
        src={current.audioUrl}
        onEnded={nextSegment}
        className="hidden"
      />
    </div>
  );
}