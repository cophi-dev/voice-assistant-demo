"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GrokVoiceClient, ConnectionStatus } from "@/lib/voice/grok-voice-client";
import { BusinessConfig } from "@/lib/config/businesses";

interface Transcript {
  id: string;
  speaker: "user" | "assistant";
  text: string;
}

interface VoiceCallProps {
  business: BusinessConfig;
  onEnd: () => void;
}

export function VoiceCall({ business, onEnd }: VoiceCallProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentUserText, setCurrentUserText] = useState("");
  const [currentAssistantText, setCurrentAssistantText] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const clientRef = useRef<GrokVoiceClient | null>(null);
  const transcriptIdRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcripts, currentUserText, currentAssistantText, scrollToBottom]);

  const startCall = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    setDebugLogs([]);

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
        onTranscript: (text, isFinal, speaker) => {
          if (speaker === "user") {
            if (isFinal) {
              setTranscripts((prev) => [
                ...prev,
                { id: `t-${++transcriptIdRef.current}`, speaker: "user", text },
              ]);
              setCurrentUserText("");
            } else {
              setCurrentUserText(text);
            }
          } else {
            if (isFinal) {
              setTranscripts((prev) => [
                ...prev,
                { id: `t-${++transcriptIdRef.current}`, speaker: "assistant", text },
              ]);
              setCurrentAssistantText("");
            } else {
              setCurrentAssistantText((prev) => prev + text);
            }
          }
        },
        onError: (err) => {
          setError(err.message);
          setStatus("error");
        },
        onDebug: (msg) => {
          setDebugLogs((prev) => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${msg}`]);
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
      case "listening": return "Hört zu";
      case "speaking": return "Spricht";
      case "error": return "Fehler";
      default: return "Getrennt";
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{business.icon}</span>
            <div>
              <h2 className="font-medium text-white text-sm">{business.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  status === "listening" ? "bg-green-500" :
                  status === "speaking" ? "bg-orange-500 animate-pulse" :
                  status === "error" ? "bg-red-500" :
                  "bg-neutral-500"
                }`} />
                <span className="text-xs text-neutral-500">{getStatusText()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-neutral-500 text-sm font-mono">{formatDuration(callDuration)}</span>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-neutral-600 hover:text-neutral-400"
            >
              {showDebug ? "Hide Debug" : "Debug"}
            </button>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="border-b border-neutral-800 px-6 py-2 bg-neutral-950 max-h-32 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {debugLogs.map((log, i) => (
              <div key={i} className="text-xs text-neutral-500 font-mono">{log}</div>
            ))}
            {debugLogs.length === 0 && (
              <div className="text-xs text-neutral-600">No debug logs yet...</div>
            )}
          </div>
        </div>
      )}

      {/* Transcripts */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
          {transcripts.length === 0 && !currentAssistantText && status === "listening" && (
            <p className="text-neutral-600 text-center py-12">Warte auf Begrüßung...</p>
          )}
          
          {transcripts.map((t) => (
            <div key={t.id} className={t.speaker === "user" ? "text-right" : "text-left"}>
              <p className={`inline-block max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                t.speaker === "user"
                  ? "bg-neutral-800 text-neutral-200"
                  : "bg-orange-500/20 text-orange-100"
              }`}>
                {t.text}
              </p>
            </div>
          ))}
          
          {/* Current streaming text */}
          {currentAssistantText && (
            <div className="text-left">
              <p className="inline-block max-w-[85%] px-4 py-2 rounded-2xl text-sm bg-orange-500/20 text-orange-100 opacity-70">
                {currentAssistantText}
              </p>
            </div>
          )}
          {currentUserText && (
            <div className="text-right">
              <p className="inline-block max-w-[85%] px-4 py-2 rounded-2xl text-sm bg-neutral-800 text-neutral-200 opacity-70">
                {currentUserText}
              </p>
            </div>
          )}
          
          <div ref={transcriptsEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-3 bg-red-950/50 border-t border-red-900/50">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="border-t border-neutral-800 px-6 py-6">
        <div className="max-w-2xl mx-auto flex justify-center">
          <button
            onClick={endCall}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full transition-colors"
          >
            Auflegen
          </button>
        </div>
      </div>
    </div>
  );
}