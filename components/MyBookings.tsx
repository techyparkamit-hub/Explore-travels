
import React, { useState, useEffect } from 'react';
import { BookingRecord } from '../types';

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('luxe_bookings');
    if (saved) {
      setBookings(JSON.parse(saved));
    }
  }, []);

  const removeBooking = (id: string) => {
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    localStorage.setItem('luxe_bookings', JSON.stringify(updated));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Your Luxury Portfolio</h2>
          <p className="text-sm text-slate-500">Check and manage your confirmed reservations.</p>
        </div>
        <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
          {bookings.length}
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-16 text-center">
          <div className="text-6xl mb-6 grayscale opacity-30">💼</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No active bookings</h3>
          <p className="text-slate-400 max-w-xs mx-auto text-sm">
            Your journey hasn't started yet. Browse flights or hotels to begin building your perfect trip.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                    booking.type === 'flight' ? 'bg-blue-50' : booking.type === 'hotel' ? 'bg-indigo-50' : 'bg-purple-50'
                  }`}>
                    {booking.type === 'flight' ? '✈️' : booking.type === 'hotel' ? '🏨' : '🗺️'}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{booking.type}</div>
                    <h4 className="font-bold text-slate-800 truncate max-w-[180px]">
                      {booking.type === 'flight' ? booking.details.airline : booking.type === 'hotel' ? booking.details.name : 'Custom Itinerary'}
                    </h4>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
                {booking.type === 'flight' && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Route</span>
                      <span className="font-bold text-slate-700">{booking.details.departure} → {booking.details.arrival}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Flight No.</span>
                      <span className="font-bold text-slate-700">{booking.details.flightNumber}</span>
                    </div>
                  </>
                )}
                {booking.type === 'hotel' && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Location</span>
                      <span className="font-bold text-slate-700">{booking.details.location}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Booking ID</span>
                      <span className="font-mono font-bold text-indigo-600">{booking.id}</span>
                    </div>
                  </>
                )}
                {booking.type === 'itinerary' && (
                  <div className="text-xs text-slate-600 italic">
                    {booking.details.prompt.substring(0, 80)}...
                  </div>
                )}
                <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-400">Booked on</span>
                  <span className="font-medium text-slate-500">{new Date(booking.date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button className="flex-1 bg-slate-900 text-white text-xs font-bold py-3 rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200">
                  Check Status
                </button>
                <button 
                  onClick={() => removeBooking(booking.id)}
                  className="p-3 border border-slate-100 rounded-xl text-slate-300 hover:text-red-500 hover:border-red-100 transition-all"
                  title="Cancel Booking"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
