
import React, { useState } from 'react';
import { generateItinerary, speakText, decodeAudioData } from '../services/geminiService';
import VoiceInput from './VoiceInput';

const TravelPlanner: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Booking states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const tripSuggestions = [
    { label: 'Culinary Tour', icon: '🍝', prompt: 'A 5-day gastronomic journey through San Sebastian and Bilbao, focusing on pintxos tours and Michelin-starred dining.' },
    { label: 'Alpine Adventure', icon: '🏔️', prompt: 'A 10-day hiking and mountain biking adventure through the Swiss Alps, staying in mountain huts and luxury lodges.' },
    { label: 'Cultural Immersion', icon: '⛩️', prompt: 'A 2-week immersive cultural exploration of Kyoto and Kanazawa, including tea ceremonies and artisan workshop visits.' },
    { label: 'Island Bliss', icon: '🏝️', prompt: 'A week of ultimate serenity in the Maldives, focusing on wellness, overwater spa treatments, and private island hopping.' },
    { label: 'Hidden Gems', icon: '💎', prompt: 'Exploring the untouched beauty of Slovenia\'s Julian Alps and the coastal charm of Piran, away from the typical tourist crowds.' }
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt) return;

    setLoading(true);
    setItinerary('');
    try {
      const result = await generateItinerary(prompt);
      setItinerary(result);
    } catch (error) {
      console.error(error);
      setItinerary("Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!itinerary || isSpeaking) return;
    setIsSpeaking(true);
    try {
      const audioBase64 = await speakText(itinerary.substring(0, 500) + "... and much more in your full itinerary.");
      if (audioBase64) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const buffer = await decodeAudioData(bytes, audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start(0);
      }
    } catch (error) {
      console.error("TTS failed", error);
      setIsSpeaking(false);
    }
  };

  const selectSuggestion = (sPrompt: string) => {
    setPrompt(sPrompt);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setIsBookingSuccess(false);
    setUserName('');
    setUserEmail('');
  };

  const handleFinalBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setIsBookingSuccess(true);
  };

  return (
    <div className="space-y-8">
      <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-serif font-bold mb-2">Deep Travel Intelligence</h2>
          <p className="text-indigo-100 opacity-80 mb-6 text-sm">Describe your dream vacation. Our AI will use deep reasoning to craft the perfect itinerary.</p>
          
          <div className="mb-6">
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] mb-3">Quick Starters</p>
            <div className="flex flex-wrap gap-2">
              {tripSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSuggestion(suggestion.prompt)}
                  className={`px-4 py-2 rounded-full border border-white/20 text-xs font-semibold bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all flex items-center space-x-2 ${prompt === suggestion.prompt ? 'bg-white/20 border-white/60' : ''}`}
                >
                  <span>{suggestion.icon}</span>
                  <span>{suggestion.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="flex bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your perfect trip in detail..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-indigo-200 px-4 py-3 min-h-[100px] resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 bg-white text-indigo-600 font-bold py-3 px-6 rounded-xl hover:bg-indigo-50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                    <span>Thinking Deeply...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Generate Masterpiece</span>
                  </>
                )}
              </button>
              <VoiceInput onTranscript={(text) => setPrompt(text)} dark />
            </div>
          </form>
        </div>
        
        {/* Background blobs for visual flair */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {itinerary && (
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm animate-in zoom-in-95 duration-700">
          <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
            <h3 className="text-2xl font-bold font-serif text-slate-800">Your Tailored Itinerary</h3>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleSpeak}
                disabled={isSpeaking}
                className={`p-3 rounded-full transition-all ${isSpeaking ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                title="Listen to summary"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18.01,19.86 21,16.28 21,12C21,7.72 18.01,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.02C15.5,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                </svg>
              </button>
              <button 
                onClick={() => setIsBookingModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-2 text-sm"
              >
                <span>Book My Trip</span>
              </button>
            </div>
          </div>
          <div className="prose prose-indigo prose-sm max-w-none text-slate-600 leading-relaxed space-y-4">
            {itinerary.split('\n').map((line, i) => (
              <p key={i} className={line.startsWith('#') ? 'text-xl font-bold text-slate-900 font-serif mt-6' : ''}>
                {line}
              </p>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-50 flex justify-center">
            <button 
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 px-12 rounded-2xl transition-all shadow-2xl flex items-center space-x-3 group"
            >
              <span className="text-lg">Secure This Itinerary</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal Overlay */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={closeBookingModal}
          ></div>
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {isBookingSuccess ? (
              <div className="p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
                  ✓
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-serif font-bold text-slate-900">Itinerary Confirmed!</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Traveler</span>
                      <span className="text-sm font-bold text-slate-800">{userName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter">Processing Booking</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm">We are now coordinating with our luxury partners. You will receive the final booking confirmation at <strong>{userEmail}</strong> within 24 hours.</p>
                </div>
                <button 
                  onClick={closeBookingModal}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all"
                >
                  Return to Planner
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-serif font-bold">Secure Your Custom Trip</h3>
                    <p className="text-indigo-100 text-xs opacity-80 uppercase tracking-widest font-bold">VIP Travel Concierge</p>
                  </div>
                  <button onClick={closeBookingModal} className="text-white/60 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 text-sm text-indigo-900 font-medium">
                    Our concierge will handle all bookings based on your personalized itinerary. Just provide your contact details to begin the process.
                  </div>

                  <form onSubmit={handleFinalBooking} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                      <input 
                        required
                        type="text" 
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Alexander Pierce"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email for Confirmation</label>
                      <input 
                        required
                        type="email" 
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="alexander@luxury.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    
                    <div className="pt-4 flex flex-col space-y-4 border-t border-slate-100">
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.666.92v6.574a1 1 0 01-.268.683l-7.931 8.647a1 1 0 01-1.468 0l-7.931-8.647a1 1 0 01-.268-.683V5.82a1 1 0 01.666-.92zM10 3.19l-6.5 2.78v5.85a1 1 0 00.268.683l6.232 6.794 6.232-6.794a1 1 0 00.268-.683V5.97L10 3.19z" clipRule="evenodd" />
                        </svg>
                        <span>Protected by LuxeTravel Secure Booking</span>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                      >
                        Initiate Booking Request
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPlanner;
