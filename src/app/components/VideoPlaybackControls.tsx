"use client";

import React, { useState, useEffect } from "react";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  step?: number;
}

const speeds = [0.5, 1, 1.25, 1.5, 2];

const VideoPlaybackControls: React.FC<Props> = ({ videoRef, step = 5 }) => {
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoRef]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

  const changeSpeed = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = value;
    setSpeed(value);
  };

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime += seconds;
  };

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30">
      <div
        className="
        flex items-center gap-3 px-3 py-1.5
        backdrop-blur-xl
        bg-white/60
        border border-black/10
        rounded-xl
        shadow-lg
        text-black
      "
      >
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="
            w-7 h-7 flex items-center justify-center
            rounded-full
            bg-black/5
            hover:bg-black/10
            active:scale-95
            transition-all duration-150
          "
        >
          {!isPlaying ? (
            <div className="w-0 h-0 border-l-[7px] border-l-black border-y-[5px] border-y-transparent ml-[2px]" />
          ) : (
            <div className="flex gap-[2px]">
              <div className="w-[3px] h-3 bg-black rounded-sm"></div>
              <div className="w-[3px] h-3 bg-black rounded-sm"></div>
            </div>
          )}
        </button>

        {/* Retroceder */}
        <button
          onClick={() => seek(-step)}
          className="
            px-2 py-1
            rounded-md
            bg-black/5
            hover:bg-black/10
            active:scale-95
            transition-all duration-150
            text-xs font-medium
          "
        >
          -{step}s
        </button>

        {/* Adelantar */}
        <button
          onClick={() => seek(step)}
          className="
            px-2 py-1
            rounded-md
            bg-black/5
            hover:bg-black/10
            active:scale-95
            transition-all duration-150
            text-xs font-medium
          "
        >
          +{step}s
        </button>

        {/* Velocidad */}
        <div className="flex gap-1 bg-black/5 p-1 rounded-lg">
          {speeds.map((value) => (
            <button
              key={value}
              onClick={() => changeSpeed(value)}
              className={`
                px-2 py-[3px]
                rounded-md text-xs font-medium
                transition-all duration-150
                ${
                  speed === value
                    ? "bg-black text-white"
                    : "text-black/70 hover:text-black"
                }
              `}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoPlaybackControls;
