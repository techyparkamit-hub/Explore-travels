
import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onRecordingStatus?: (isRecording: boolean) => void;
  dark?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, onRecordingStatus, dark = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const text = await transcribeAudio(base64Audio);
          onTranscript(text);
          setIsRecording(false);
          onRecordingStatus?.(false);
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      onRecordingStatus?.(true);
    } catch (err) {
      console.error("Microphone error", err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        className={`p-3 rounded-xl transition-all flex items-center justify-center min-w-[46px] h-[46px] ${
          isRecording 
            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40 ring-4 ring-red-500/20' 
            : dark 
              ? 'bg-white/20 text-white hover:bg-white/30' 
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
        }`}
        title="Hold to speak"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
        </svg>
      </button>
      
      {isRecording && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-600 text-[10px] font-bold text-white px-2 py-1 rounded shadow-lg whitespace-nowrap animate-bounce flex items-center space-x-1 z-50">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
          <span>REC</span>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
