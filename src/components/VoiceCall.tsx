"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GrokVoiceClient, ConnectionStatus } from "@/lib/voice/grok-voice-client";
import { BusinessConfig } from "@/lib/config/businesses";

interface VoiceCallProps {
  business: BusinessConfig;
  onEnd: () => void;
}

export function VoiceCall({ business, onEnd }: VoiceCallProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const clientRef = useRef<GrokVoiceClient | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  const startCall = useCallback(async () => {
    setError(null);
    setStatus("connecting");

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start session");
      }

      const { token, business: businessData } = await response.json();

      const client = new GrokVoiceClient({
        token,
        voice: businessData.voice,
        systemPrompt: businessData.systemPrompt,
        onStatusChange: setStatus,
        onAudioLevel: setAudioLevel,
        onError: (err) => {
          setError(err.message);
          setStatus("error");
        },
      });

      clientRef.current = client;
      await client.connect();

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  }, [business.id]);

  const endCall = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setStatus("disconnected");
    onEnd();
  }, [onEnd]);

  useEffect(() => {
    let mounted = true;
    const initCall = async () => {
      if (mounted) await startCall();
    };
    initCall();
    return () => {
      mounted = false;
      if (clientRef.current) clientRef.current.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = (): string => {
    switch (status) {
      case "connecting": return "Verbinde...";
      case "connected": return "Verbunden";
      case "listening": return "H\u00f6rt zu";
      case "speaking": return `${business.assistantName} spricht`;
      case "error": return "Fehler";
      default: return "Getrennt";
    }
  };

  // Generate bars for visualization
  const bars = 32;
  const getBarHeight = (index: number): number => {
    if (status !== "speaking" && status !== "listening") return 4;
    
    const centerIndex = bars / 2;
    const distanceFromCenter = Math.abs(index - centerIndex) / centerIndex;
    const baseHeight = status === "speaking" ? audioLevel * 100 : audioLevel * 40;
    const variation = Math.sin(Date.now() / 100 + index * 0.5) * 0.3 + 0.7;
    const centerBoost = 1 - distanceFromCenter * 0.6;
    
    return Math.max(4, baseHeight * variation * centerBoost);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{business.icon}</span>
            <div>
              <h2 className="font-medium text-white">{business.name}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{getStatusText()}</p>
            </div>
          </div>
          <span className="text-neutral-400 text-lg font-mono">{formatDuration(callDuration)}</span>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-12">
          {/* Waveform */}
          <div className="flex items-center justify-center gap-1 h-32">
            {Array.from({ length: bars }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  status === "speaking" 
                    ? "bg-gradient-to-t from-orange-600 to-orange-400" 
                    : status === "listening"
                    ? "bg-gradient-to-t from-neutral-700 to-neutral-500"
                    : "bg-neutral-800"
                }`}
                style={{
                  height: `${getBarHeight(i)}px`,
                }}
              />
            ))}
          </div>

          {/* Status indicator */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${
                status === "speaking" ? "bg-orange-500 animate-pulse" :
                status === "listening" ? "bg-green-500" :
                status === "connecting" ? "bg-yellow-500 animate-pulse" :
                status === "error" ? "bg-red-500" :
                "bg-neutral-600"
              }`} />
              <span className="text-neutral-400 text-sm">
                {status === "speaking" ? `${business.assistantName} spricht...` : 
                 status === "listening" ? "Ich h\u00f6re zu..." :
                 status === "connecting" ? "Verbinde..." :
                 status === "error" ? "Verbindungsfehler" :
                 ""}
              </span>
            </div>
            {status === "listening" && (
              <span className="text-neutral-600 text-xs">
                {business.assistantPersonality}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-3 bg-red-950/50">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="px-6 py-8">
        <div className="max-w-2xl mx-auto flex justify-center">
          <button
            onClick={endCall}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85a.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}