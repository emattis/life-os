"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PomodoroTimerProps {
  taskName: string;
  estimatedMins: number;
  workDuration?: number; // minutes, default 25
  breakDuration?: number; // minutes, default 5
  onComplete?: () => void;
  onClose: () => void;
}

export function PomodoroTimer({
  taskName,
  estimatedMins,
  workDuration: initialWork = 25,
  breakDuration: initialBreak = 5,
  onComplete,
  onClose,
}: PomodoroTimerProps) {
  const [workMins, setWorkMins] = useState(initialWork);
  const [breakMins, setBreakMins] = useState(initialBreak);
  const [secondsLeft, setSecondsLeft] = useState(initialWork * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [session, setSession] = useState(1);
  const [flashing, setFlashing] = useState(false);
  const totalSessions = Math.max(1, Math.ceil(estimatedMins / initialWork));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = isBreak ? breakMins * 60 : workMins * 60;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const circumference = 2 * Math.PI * 54; // r=54

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Time's up
          setIsRunning(false);
          setFlashing(true);
          setTimeout(() => setFlashing(false), 3000);

          // Try to play a sound
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
            setTimeout(() => {
              const osc2 = ctx.createOscillator();
              osc2.connect(gain);
              osc2.frequency.value = 1000;
              osc2.start();
              osc2.stop(ctx.currentTime + 0.3);
            }, 400);
          } catch {
            // Audio not available
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStartPause = useCallback(() => {
    if (secondsLeft === 0) {
      // Transition to next phase
      if (isBreak) {
        setIsBreak(false);
        setSession((s) => s + 1);
        setSecondsLeft(workMins * 60);
      } else {
        if (session >= totalSessions) {
          onComplete?.();
          return;
        }
        setIsBreak(true);
        setSecondsLeft(breakMins * 60);
      }
      setIsRunning(true);
    } else {
      setIsRunning((r) => !r);
    }
  }, [secondsLeft, isBreak, session, totalSessions, workMins, breakMins, onComplete]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsBreak(false);
    setSecondsLeft(workMins * 60);
  }, [workMins]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div
      className={`bg-card rounded-xl border border-border p-6 transition-colors ${
        flashing ? "border-accent bg-accent/5" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
          {isBreak ? "Break Time" : "Focus Session"}
        </h2>
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground text-xs transition-colors"
        >
          Close
        </button>
      </div>

      <div className="flex items-center gap-6">
        {/* Circular timer */}
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--border)"
              strokeWidth="4"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={isBreak ? "#22c55e" : "var(--accent)"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold text-foreground">
              {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
            </span>
            <span className="text-[10px] text-muted mt-0.5">
              {isBreak ? "break" : `${session} of ${totalSessions}`}
            </span>
          </div>
        </div>

        {/* Info & controls */}
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-foreground truncate mb-1">
            {taskName}
          </p>
          <p className="text-xs text-muted mb-4">
            Session {session} of {totalSessions}
            {isBreak && " — Take a break!"}
          </p>

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleStartPause}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                secondsLeft === 0
                  ? "bg-green-500 hover:bg-green-500/90 text-white"
                  : isRunning
                    ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                    : "bg-accent hover:bg-accent/90 text-white"
              }`}
            >
              {secondsLeft === 0
                ? isBreak
                  ? "Start Work"
                  : session >= totalSessions
                    ? "Done!"
                    : "Start Break"
                : isRunning
                  ? "Pause"
                  : "Start"}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground border border-border hover:bg-white/5 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Duration settings */}
          <div className="flex gap-3 text-[10px]">
            <label className="flex items-center gap-1 text-muted">
              Work:
              <input
                type="number"
                min={5}
                max={90}
                value={workMins}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWorkMins(v);
                  if (!isRunning && !isBreak) setSecondsLeft(v * 60);
                }}
                className="w-10 bg-background border border-border rounded px-1 py-0.5 text-foreground text-center"
              />
              min
            </label>
            <label className="flex items-center gap-1 text-muted">
              Break:
              <input
                type="number"
                min={1}
                max={30}
                value={breakMins}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBreakMins(v);
                  if (!isRunning && isBreak) setSecondsLeft(v * 60);
                }}
                className="w-10 bg-background border border-border rounded px-1 py-0.5 text-foreground text-center"
              />
              min
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
