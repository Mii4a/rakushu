import type { CSSProperties } from "react";

import { Check, LoaderCircle, Mic, Sparkles } from "lucide-react";

export type InterviewRecordingState = "idle" | "recording" | "transcribing" | "evaluating" | "complete";

type RecordingVisualizerProps = {
  state: InterviewRecordingState;
  interactive?: boolean;
  audioLevel?: number;
};

const recordingWaveHeights = [8, 10, 14, 18, 26, 38, 22, 16, 28, 40, 24, 18, 12, 10, 8, 10, 12, 18, 28, 42, 24, 16, 12, 10, 8];
const idleDotOpacities = [0.24, 0.32, 0.48, 0.72, 0.9, 1, 0.9, 0.72, 0.48, 0.32, 0.24];

function Waveform({ active, audioLevel = 0 }: { active: boolean; audioLevel?: number }) {
  const normalizedLevel = Math.min(1, Math.max(0, audioLevel));

  return (
    <div className={`hidden min-w-[220px] flex-1 items-center justify-center md:flex ${active ? "text-[#ef4444]" : "text-[#22c55e]"}`}>
      {active ? (
        <div className="flex items-center justify-center gap-1.5">
          {recordingWaveHeights.map((height, index) => {
            const emphasis = 0.55 + normalizedLevel * 1.1;
            const barWidth = 6 + normalizedLevel * 3 + (index % 3 === 1 ? 1 : 0);
            const multiplier = (0.42 + normalizedLevel * 0.38) * (0.7 + ((index % 5) + 1) * 0.16) * emphasis;
            return (
              <span
                key={`${height}-${index}`}
                className="rounded-full bg-current transition-[height,width,opacity,transform] duration-100"
                style={{
                  height: `${Math.max(10, Math.round(height * multiplier))}px`,
                  width: `${barWidth.toFixed(1)}px`,
                  opacity: 0.58 + normalizedLevel * 0.42,
                  transform: `translateY(-${(normalizedLevel * ((index % 4) + 1) * 0.7).toFixed(2)}px)`
                } as CSSProperties}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {idleDotOpacities.map((opacity, index) => (
            <span key={`${opacity}-${index}`} className="ai-interview-dot-wave" style={{ opacity }} />
          ))}
        </div>
      )}
    </div>
  );
}

function IdleVisualizer({ interactive }: { interactive: boolean }) {
  return (
    <div className="flex w-full max-w-[760px] items-center justify-center gap-4 md:gap-8">
      <Waveform active={false} />
      <div className={`relative flex size-28 items-center justify-center rounded-full bg-white md:size-32 ${interactive ? "ai-interview-recorder-hover-target" : ""}`}>
        <span className="ai-interview-recorder-ring-outer absolute inset-0 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] shadow-[0_30px_70px_-44px_rgba(22,163,74,0.32)]" />
        <span className="absolute inset-[8px] rounded-full border border-[#d1fae5] bg-white/95" />
        <span className="ai-interview-recorder-ring-inner absolute inset-[16px] rounded-full bg-[#16a34a] shadow-[0_28px_56px_-28px_rgba(22,163,74,0.72)]" />
        <Mic className="relative z-10 size-11 text-white md:size-12" />
      </div>
      <Waveform active={false} />
    </div>
  );
}

function RecordingVisualizer({ audioLevel = 0 }: { audioLevel?: number }) {
  const normalizedLevel = Math.min(1, Math.max(0, audioLevel));
  const recorderMotionStyle = {
    transform: `translateY(-${(3 + normalizedLevel * 10).toFixed(2)}px) scale(${(1 + normalizedLevel * 0.07).toFixed(3)})`,
    boxShadow: `0 ${Math.round(22 + normalizedLevel * 18)}px ${Math.round(42 + normalizedLevel * 26)}px -${Math.round(20 + normalizedLevel * 5)}px rgba(239,68,68,${(0.3 + normalizedLevel * 0.26).toFixed(2)})`
  } satisfies CSSProperties;

  return (
    <div className="flex w-full max-w-[760px] items-center justify-center gap-4 md:gap-8">
      <Waveform active audioLevel={audioLevel} />
      <div className="ai-interview-recording-core relative flex size-28 items-center justify-center rounded-full md:size-32" style={recorderMotionStyle}>
        <span className="ai-interview-recording-pulse absolute inset-0 rounded-full border border-[rgba(248,113,113,0.55)] bg-[rgba(239,68,68,0.2)]" />
        <span className="absolute inset-[4px] rounded-full border border-[#fca5a5] bg-[rgba(254,226,226,0.88)]" />
        <span className="absolute inset-[14px] rounded-full bg-[#dc2626] shadow-[0_36px_72px_-22px_rgba(239,68,68,0.82)]" />
        <Mic className="relative z-10 size-11 text-white md:size-12" />
      </div>
      <Waveform active audioLevel={audioLevel} />
    </div>
  );
}

function LoadingVisualizer({ icon }: { icon: "mic" | "sparkles" }) {
  const ringClass =
    icon === "sparkles"
      ? "ai-interview-spin-ring-segmented bg-[conic-gradient(from_0deg,rgba(22,163,74,0.02)_0deg,rgba(22,163,74,0.02)_24deg,rgba(22,163,74,0.94)_24deg,rgba(22,163,74,0.94)_72deg,rgba(220,252,231,1)_72deg,rgba(220,252,231,1)_112deg,rgba(22,163,74,0.82)_112deg,rgba(22,163,74,0.82)_158deg,rgba(220,252,231,0.95)_158deg,rgba(220,252,231,0.95)_210deg,rgba(22,163,74,0.7)_210deg,rgba(22,163,74,0.7)_258deg,rgba(220,252,231,0.96)_258deg,rgba(220,252,231,0.96)_360deg)]"
      : "ai-interview-spin-ring border-4 border-[#d1fae5] border-t-[#16a34a]";

  return (
    <div className="relative flex size-32 items-center justify-center rounded-full bg-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.2)] md:size-36">
      <span className="absolute inset-0 rounded-full border border-[#dcfce7] bg-[radial-gradient(circle_at_center,#ffffff_42%,#f0fdf4_100%)]" />
      <span className={`absolute inset-[7px] rounded-full ${ringClass}`} />
      <span className="absolute inset-[17px] rounded-full bg-white" />
      {icon === "mic" ? <Mic className="relative z-10 size-12 text-[#16a34a]" /> : <Sparkles className="relative z-10 size-12 text-[#16a34a]" />}
      <LoaderCircle className="absolute bottom-4 right-4 size-5 text-[#16a34a]" />
    </div>
  );
}

function CompleteVisualizer() {
  const confetti = [
    "left-2 top-10",
    "left-8 top-2",
    "right-4 top-8",
    "right-10 top-1",
    "left-4 bottom-6",
    "right-6 bottom-8",
    "left-0 top-1/2",
    "right-0 top-1/3",
    "left-12 -top-1",
    "right-12 top-0"
  ];

  return (
    <div className="relative flex size-32 items-center justify-center rounded-full bg-white md:size-36">
      {confetti.map((position, index) => (
        <span
          key={position}
          className={`ai-interview-confetti absolute ${position} size-2.5 rounded-[2px] ${index % 2 === 0 ? "bg-[#22c55e]" : "bg-[#86efac]"}`}
          style={{ animationDelay: `${index * 0.12}s` }}
        />
      ))}
      <span className="absolute inset-[6px] rounded-full border border-[#bbf7d0] bg-[#f0fdf4] shadow-[0_28px_60px_-38px_rgba(22,163,74,0.32)]" />
      <span className="absolute inset-[16px] rounded-full bg-[#16a34a] shadow-[0_30px_60px_-28px_rgba(22,163,74,0.72)]" />
      <Check className="ai-interview-success-pop relative z-10 size-12 text-white" />
    </div>
  );
}

export function AiInterviewRecordingVisualizer({ state, interactive = false, audioLevel = 0 }: RecordingVisualizerProps) {
  if (state === "recording") {
    return <RecordingVisualizer audioLevel={audioLevel} />;
  }

  if (state === "transcribing") {
    return <LoadingVisualizer icon="mic" />;
  }

  if (state === "evaluating") {
    return <LoadingVisualizer icon="sparkles" />;
  }

  if (state === "complete") {
    return <CompleteVisualizer />;
  }

  return <IdleVisualizer interactive={interactive} />;
}
