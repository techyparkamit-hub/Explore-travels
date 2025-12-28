
import React, { useState } from 'react';
import { AppTab } from './types';
import Navbar from './components/Navbar';
import FlightSearch from './components/FlightSearch';
import HotelSearch from './components/HotelSearch';
import TravelPlanner from './components/TravelPlanner';
import MyBookings from './components/MyBookings';
import ChatBot from './components/ChatBot';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Flights);

  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 overflow-x-hidden">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl animate-in fade-in duration-700">
        <section className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4 tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900">
            Elevate Your Journey
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-light leading-relaxed">
            Experience the future of travel with LuxeTravel AI. Personalized itineraries, 
            real-time flight insights, and luxury stays curated just for you.
          </p>
        </section>

        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-1 md:p-2 mb-10 transition-all duration-500">
          <div className="bg-slate-50/50 rounded-[1.8rem] p-4 md:p-8">
            {activeTab === AppTab.Flights && <FlightSearch />}
            {activeTab === AppTab.Hotels && <HotelSearch />}
            {activeTab === AppTab.Planner && <TravelPlanner />}
            {activeTab === AppTab.Bookings && <MyBookings />}
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-slate-100 mt-auto bg-white">
        <div className="container mx-auto px-4 text-center">
          <div className="font-serif text-2xl font-bold text-slate-800 mb-2 tracking-tight">LuxeTravel AI</div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Powered by Gemini Intelligence • Est. 2024</p>
        </div>
      </footer>

      <ChatBot />
    </div>
  );
};

export default App;
