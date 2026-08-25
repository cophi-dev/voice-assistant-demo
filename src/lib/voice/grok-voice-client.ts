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
  onTranscript?: (text: string, isFinal: boolean, speaker: "user" | "assistant") => void;
  onError?: (error: Error) => void;
  onDebug?: (message: string) => void;
}

export class GrokVoiceClient {
  private config: GrokVoiceConfig;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private status: ConnectionStatus = "disconnected";
  private lastFinalUserTranscript = "";
  private lastFinalAssistantTranscript = "";
  private audioQueue: AudioBufferSourceNode[] = [];
  private isPlaying = false;

  constructor(config: GrokVoiceConfig) {
    this.config = config;
  }

  private debug(msg: string): void {
    console.log(`[GrokVoice] ${msg}`);
    this.config.onDebug?.(msg);
  }

  async connect(): Promise<void> {
    this.setStatus("connecting");
    this.debug("Starting connection...");

    try {
      // Create audio context - will be resumed on user interaction
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.debug(`AudioContext created, state: ${this.audioContext.state}`);
      
      // Resume audio context (needed for autoplay policy)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
        this.debug(`AudioContext resumed, state: ${this.audioContext.state}`);
      }
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.debug("Microphone access granted");

      // Correct model name: grok-voice-latest
      const wsUrl = "wss://api.x.ai/v1/realtime?model=grok-voice-latest";
      this.debug(`Connecting to ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl, [`xai-client-secret.${this.config.token}`]);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (e) => this.handleError(e);
      this.ws.onclose = (event) => this.handleClose(event);
    } catch (error) {
      this.setStatus("error");
      this.debug(`Connection error: ${error}`);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          this.config.onError?.(new Error("Mikrofon-Zugriff verweigert. Bitte erlauben Sie den Zugriff."));
        } else {
          this.config.onError?.(error);
        }
      } else {
        this.config.onError?.(new Error(String(error)));
      }
      throw error;
    }
  }

  private async handleOpen(): Promise<void> {
    if (!this.ws) return;
    this.debug("WebSocket connected");

    // Session config matching xAI docs
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

    this.debug(`Sending session config: ${JSON.stringify(sessionConfig)}`);
    this.ws.send(JSON.stringify(sessionConfig));
    this.setStatus("connected");

    await this.startAudioCapture();

    // Trigger greeting by sending a text message and creating response
    this.debug("Triggering greeting...");
    setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Create a conversation item to trigger the assistant
        this.ws.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "Hallo" }]
          }
        }));
        this.ws.send(JSON.stringify({ type: "response.create" }));
        this.debug("Greeting request sent");
      }
    }, 500);
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
      // Don't connect to destination - we don't want to hear ourselves
      
      this.setStatus("listening");
      this.debug("Audio capture started");
    } catch (error) {
      this.debug(`Audio capture error: ${error}`);
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
      this.debug(`Received: ${message.type}`);

      switch (message.type) {
        case "session.created":
          this.debug("Session created");
          break;
          
        case "session.updated":
          this.debug("Session updated");
          break;

        case "input_audio_buffer.speech_started":
          this.setStatus("listening");
          break;

        case "input_audio_buffer.speech_stopped":
          this.debug("Speech stopped, waiting for response...");
          break;

        case "conversation.item.input_audio_transcription.completed":
          if (message.transcript && message.transcript !== this.lastFinalUserTranscript) {
            this.lastFinalUserTranscript = message.transcript;
            this.config.onTranscript?.(message.transcript, true, "user");
            this.debug(`User said: ${message.transcript}`);
          }
          break;

        // Handle both possible event names for audio transcript
        case "response.audio_transcript.delta":
        case "response.text.delta":
          if (message.delta) {
            this.config.onTranscript?.(message.delta, false, "assistant");
          }
          break;

        case "response.audio_transcript.done":
        case "response.text.done":
          if (message.transcript && message.transcript !== this.lastFinalAssistantTranscript) {
            this.lastFinalAssistantTranscript = message.transcript;
            this.config.onTranscript?.(message.transcript, true, "assistant");
            this.debug(`Assistant said: ${message.transcript}`);
          }
          break;

        // Handle both possible event names for audio data
        case "response.audio.delta":
        case "response.output_audio.delta":
          if (message.delta) {
            this.setStatus("speaking");
            this.playAudio(message.delta);
          }
          break;

        case "response.audio.done":
        case "response.output_audio.done":
          this.debug("Audio response complete");
          break;

        case "response.done":
          this.setStatus("listening");
          this.debug("Response complete");
          break;

        case "error":
          this.debug(`Server error: ${JSON.stringify(message.error)}`);
          this.config.onError?.(new Error(message.error?.message || "Server error"));
          break;
          
        default:
          this.debug(`Unhandled event: ${message.type}`);
      }
    } catch (error) {
      this.debug(`Message parse error: ${error}`);
    }
  }

  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Ensure audio context is running
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // xAI returns 16-bit PCM at 24kHz
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      this.debug(`Audio playback error: ${error}`);
    }
  }

  private handleError(e: Event): void {
    this.debug(`WebSocket error: ${JSON.stringify(e)}`);
    this.setStatus("error");
    this.config.onError?.(new Error("WebSocket Verbindungsfehler"));
  }

  private handleClose(event: CloseEvent): void {
    this.debug(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
    this.setStatus("disconnected");
    
    if (event.code !== 1000) {
      let errorMsg = "Verbindung geschlossen";
      if (event.code === 1006) {
        errorMsg = "Verbindung zum Server verloren";
      } else if (event.code === 4001) {
        errorMsg = "Authentifizierung fehlgeschlagen";
      } else if (event.code === 4002) {
        errorMsg = "Ungültiger Token";
      } else if (event.code === 4003) {
        errorMsg = "Nicht genug Credits";
      }
      this.config.onError?.(new Error(errorMsg));
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  disconnect(): void {
    this.debug("Disconnecting...");
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
    this.setStatus("disconnected");
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}