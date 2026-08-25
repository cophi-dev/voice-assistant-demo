export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "error";

export interface GrokVoiceConfig {
  token: string;
  voice: string;
  systemPrompt: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: Error) => void;
}

export class GrokVoiceClient {
  private config: GrokVoiceConfig;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private status: ConnectionStatus = "disconnected";
  
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;
  private levelInterval: number | null = null;

  constructor(config: GrokVoiceConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.setStatus("connecting");

    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      
      // Create analyser for input visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Connect mic to analyser for level detection
      const micSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      micSource.connect(this.analyser);
      
      // Start level monitoring
      this.startLevelMonitoring();

      const wsUrl = "wss://api.x.ai/v1/realtime?model=grok-voice-latest";
      this.ws = new WebSocket(wsUrl, [`xai-client-secret.${this.config.token}`]);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = () => this.handleError();
      this.ws.onclose = (event) => this.handleClose(event);
    } catch (error) {
      this.setStatus("error");
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          this.config.onError?.(new Error("Mikrofon-Zugriff verweigert."));
        } else {
          this.config.onError?.(error);
        }
      } else {
        this.config.onError?.(new Error(String(error)));
      }
      throw error;
    }
  }

  private startLevelMonitoring(): void {
    if (!this.analyser) return;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const checkLevel = () => {
      if (!this.analyser) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const level = Math.min(1, average / 128);
      
      // Only send input level when listening
      if (this.status === "listening") {
        this.config.onAudioLevel?.(level);
      }
    };
    
    this.levelInterval = window.setInterval(checkLevel, 50);
  }

  private async handleOpen(): Promise<void> {
    if (!this.ws) return;

    const sessionConfig = {
      type: "session.update",
      session: {
        voice: this.config.voice,
        instructions: this.config.systemPrompt,
        turn_detection: {
          type: "server_vad",
        },
        input_audio_transcription: {
          model: "grok-2-latest"
        }
      },
    };

    this.ws.send(JSON.stringify(sessionConfig));
    this.setStatus("connected");

    await this.startAudioCapture();

    // Trigger greeting
    setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "response.create" }));
      }
    }, 300);
  }

  private async startAudioCapture(): Promise<void> {
    if (!this.audioContext || !this.mediaStream || !this.ws) return;

    try {
      await this.audioContext.audioWorklet.addModule(
        "data:text/javascript," +
          encodeURIComponent(`
            class AudioProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                this.buffer = new Float32Array(0);
              }
              
              process(inputs) {
                const input = inputs[0];
                if (input && input[0]) {
                  const newBuffer = new Float32Array(this.buffer.length + input[0].length);
                  newBuffer.set(this.buffer);
                  newBuffer.set(input[0], this.buffer.length);
                  this.buffer = newBuffer;
                  
                  while (this.buffer.length >= 2400) {
                    const chunk = this.buffer.slice(0, 2400);
                    this.buffer = this.buffer.slice(2400);
                    
                    const pcm = new Int16Array(chunk.length);
                    for (let i = 0; i < chunk.length; i++) {
                      pcm[i] = Math.max(-32768, Math.min(32767, chunk[i] * 32768));
                    }
                    
                    this.port.postMessage(pcm.buffer, [pcm.buffer]);
                  }
                }
                return true;
              }
            }
            registerProcessor('audio-processor', AudioProcessor);
          `)
      );

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, "audio-processor");
      
      this.workletNode.port.onmessage = (event) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          const base64 = this.arrayBufferToBase64(event.data);
          this.ws.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64,
            })
          );
        }
      };

      source.connect(this.workletNode);
      
      this.setStatus("listening");
    } catch (error) {
      this.config.onError?.(new Error("Audio capture failed"));
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "session.created":
        case "session.updated":
          break;

        case "input_audio_buffer.speech_started":
          this.setStatus("listening");
          this.stopPlayback();
          break;

        case "input_audio_buffer.speech_stopped":
          break;

        case "response.audio.delta":
        case "response.output_audio.delta":
          if (message.delta) {
            this.setStatus("speaking");
            this.queueAudio(message.delta);
          }
          break;

        case "response.audio.done":
        case "response.output_audio.done":
          break;

        case "response.done":
          setTimeout(() => {
            if (this.status === "speaking" && this.audioQueue.length === 0 && !this.isPlaying) {
              this.setStatus("listening");
            }
          }, 300);
          break;

        case "error":
          this.config.onError?.(new Error(message.error?.message || "Server error"));
          break;
      }
    } catch (error) {
      console.error("Message parse error:", error);
    }
  }

  private queueAudio(base64Audio: string): void {
    if (!this.audioContext) return;

    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      this.audioQueue.push(bytes.buffer);
      this.processAudioQueue();
    } catch (error) {
      console.error("Audio decode error:", error);
    }
  }

  private async processAudioQueue(): Promise<void> {
    if (this.isPlaying || this.audioQueue.length === 0 || !this.audioContext) return;
    
    this.isPlaying = true;
    
    while (this.audioQueue.length > 0) {
      const buffer = this.audioQueue.shift()!;
      await this.playAudioBuffer(buffer);
    }
    
    this.isPlaying = false;
    
    if (this.status === "speaking") {
      this.setStatus("listening");
    }
  }

  private async playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) return;

    return new Promise((resolve) => {
      try {
        if (this.audioContext!.state === "suspended") {
          this.audioContext!.resume();
        }

        const pcm16 = new Int16Array(buffer);
        const float32 = new Float32Array(pcm16.length);
        
        // Calculate audio level from output
        let sum = 0;
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
          sum += Math.abs(float32[i]);
        }
        const level = Math.min(1, (sum / pcm16.length) * 8);
        this.config.onAudioLevel?.(level);

        const audioBuffer = this.audioContext!.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = this.audioContext!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext!.destination);
        
        const currentTime = this.audioContext!.currentTime;
        const startTime = Math.max(currentTime, this.nextPlayTime);
        source.start(startTime);
        
        this.nextPlayTime = startTime + audioBuffer.duration;
        
        source.onended = () => resolve();
        setTimeout(resolve, audioBuffer.duration * 1000 + 50);
      } catch (error) {
        resolve();
      }
    });
  }

  private stopPlayback(): void {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
    this.config.onAudioLevel?.(0);
  }

  private handleError(): void {
    this.setStatus("error");
    this.config.onError?.(new Error("WebSocket Verbindungsfehler"));
  }

  private handleClose(event: CloseEvent): void {
    this.setStatus("disconnected");
    
    if (event.code !== 1000) {
      let errorMsg = "Verbindung geschlossen";
      if (event.code === 1006) {
        errorMsg = "Verbindung zum Server verloren";
      } else if (event.code === 4001) {
        errorMsg = "Authentifizierung fehlgeschlagen";
      }
      this.config.onError?.(new Error(errorMsg));
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  disconnect(): void {
    this.stopPlayback();
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.workletNode = null;
    this.analyser = null;
    this.setStatus("disconnected");
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}