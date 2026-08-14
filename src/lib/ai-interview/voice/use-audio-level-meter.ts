import { useEffect, useState } from "react";

export function useAiInterviewAudioLevelMeter(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    let rafId = 0;

    const loop = () => {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const item of buffer) {
        const normalized = (item - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / buffer.length);
      setLevel(Math.min(1, rms * 4));
      rafId = window.requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.cancelAnimationFrame(rafId);
      source.disconnect();
      analyser.disconnect();
      void audioContext.close();
      setLevel(0);
    };
  }, [stream]);

  return level;
}
