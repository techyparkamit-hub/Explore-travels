
import React from 'react';
import { AppTab } from '../types';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 py-4">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-slate-800">LuxeTravel</span>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-[60%] sm:max-w-none">
          {[
            { id: AppTab.Flights, label: 'Flights', icon: '✈️' },
            { id: AppTab.Hotels, label: 'Hotels', icon: '🏨' },
            { id: AppTab.Planner, label: 'Planner', icon: '🗺️' },
            { id: AppTab.Bookings, label: 'My Trips', icon: '💼' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <div className="flex -space-x-2">
             <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
             <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">JD</div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
