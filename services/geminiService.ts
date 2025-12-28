
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { GroundingSource } from "../types";

/**
 * Decodes raw PCM data into an AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Search Grounding for Flights and Hotels.
 */
export async function searchTravelInfo(query: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map((chunk: any) => chunk.web)
    .filter((web: any) => web && web.uri) || [];

  return {
    text: response.text || "",
    sources,
  };
}

/**
 * Complex Travel Planner with Thinking Mode.
 */
export async function generateItinerary(prompt: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a luxury travel expert. Create a detailed itinerary for: ${prompt}. Include specific recommendations for hidden gems and dining.`,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
    },
  });

  return response.text || "";
}

/**
 * Chat Interface using Gemini Pro.
 */
export const createChat = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are LuxeTravel AI assistant. You help users find flights, hotels, and plan trips with a refined, professional, and helpful tone.",
    },
  });
};

/**
 * Transcribe Audio from Mic Input.
 */
export async function transcribeAudio(audioBase64: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
        { text: "Please transcribe this audio accurately." },
      ],
    },
  });
  return response.text || "";
}

/**
 * Text-to-Speech Generation.
 */
export async function speakText(text: string): Promise<string | undefined> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
