
import React, { useState, useMemo } from 'react';
import { searchTravelInfo } from '../services/geminiService';
import { GroundingSource, Flight, BookingRecord } from '../types';
import VoiceInput from './VoiceInput';

type SortCriteria = 'price' | 'duration' | 'departure' | 'none';
type TripType = 'one-way' | 'multi-city';

interface FlightSegment {
  from: string;
  to: string;
  date: string;
}

const FlightSearch: React.FC = () => {
  const [tripType, setTripType] = useState<TripType>('one-way');
  const [segments, setSegments] = useState<FlightSegment[]>([{ from: '', to: '', date: '' }]);
  
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [sortBy, setSortBy] = useState<SortCriteria>('none');
  
  const [activeRecordingField, setActiveRecordingField] = useState<{index: number, field: string} | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');

  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({});

  const addSegment = () => {
    if (segments.length < 4) {
      const lastSegment = segments[segments.length - 1];
      setSegments([...segments, { from: lastSegment.to, to: '', date: '' }]);
    }
  };

  const removeSegment = (index: number) => {
    if (segments.length > 1) {
      setSegments(segments.filter((_, i) => i !== index));
    }
  };

  const updateSegment = (index: number, field: keyof FlightSegment, value: string) => {
    const newSegments = [...segments];
    newSegments[index] = { ...newSegments[index], [field]: value };
    setSegments(newSegments);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const isValid = segments.every(s => s.from && s.to);
    if (!isValid) return;
    
    setLoading(true);
    setFlights([]);
    setSummary('');
    setSortBy('none');

    try {
      let query = "";
      if (tripType === 'one-way') {
        const s = segments[0];
        query = `Find the best current flights from ${s.from} to ${s.to} around ${s.date}.`;
      } else {
        const legs = segments.map((s, i) => `Leg ${i+1}: ${s.from} to ${s.to} on ${s.date}`).join(", ");
        query = `Find the best multi-city flight options for the following route: ${legs}.`;
      }

      query += ` First, provide a one-sentence overview of the travel options.
                Then, list each individual flight option exactly in this format:
                - Airline: [Name]
                - Flight Number: [Number]
                - Departure: [Time, Location (Airport Code)]
                - Arrival: [Time, Location (Airport Code)]
                - Price: [Price]
                - Duration: [Time]
                - Link: [URL if available]
                
                Only provide real, current information with accurate airport IATA codes (e.g., LHR, JFK).`;
      
      const response = await searchTravelInfo(query);
      const text = response.text || "";
      setSummary(text);
      setSources(response.sources);

      const flightBlocks = text.split(/(?=- Airline:)/g).filter(b => b.trim().startsWith('- Airline:'));
      
      const parsedFlights: Flight[] = flightBlocks.map(block => {
        const getVal = (label: string) => {
          const regex = new RegExp(`- ${label}:\\s*(.*)`, 'i');
          const match = block.match(regex);
          return match ? match[1].split('\n')[0].trim() : 'N/A';
        };
        
        return {
          airline: getVal('Airline'),
          flightNumber: getVal('Flight Number'),
          departure: getVal('Departure'),
          arrival: getVal('Arrival'),
          price: getVal('Price'),
          duration: getVal('Duration'),
          link: getVal('Link')
        };
      });

      if (parsedFlights.length > 0) {
        setFlights(parsedFlights);
      }
    } catch (error) {
      console.error(error);
      setSummary("Sorry, I encountered an error finding flight information.");
    } finally {
      setLoading(false);
    }
  };

  const sortedFlights = useMemo(() => {
    if (sortBy === 'none') return flights;
    return [...flights].sort((a, b) => {
      if (sortBy === 'price') {
        const priceA = parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0;
        const priceB = parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0;
        return priceA - priceB;
      }
      if (sortBy === 'duration') {
        const getMinutes = (d: string) => {
          const hours = parseInt(d.match(/(\d+)h/)?.[1] || '0');
          const mins = parseInt(d.match(/(\d+)m/)?.[1] || '0');
          return (hours * 60) + mins;
        };
        return getMinutes(a.duration) - getMinutes(b.duration);
      }
      return 0;
    });
  }, [flights, sortBy]);

  const splitTimeLoc = (str: string) => {
    const timeMatch = str.match(/\d{1,2}:\d{2}(?:\s?[AP]M)?/i);
    const time = timeMatch ? timeMatch[0] : 'TBD';
    const remaining = str.replace(timeMatch ? timeMatch[0] : '', '').replace(/^[\s,:-]+|[\s,:-]+$/g, '').trim();
    
    // Extract airport code (3 uppercase letters, usually in parens or after location)
    const codeMatch = remaining.match(/\(?([A-Z]{3})\)?/);
    const code = codeMatch ? codeMatch[1] : '';
    const loc = remaining.replace(codeMatch ? codeMatch[0] : '', '').replace(/^[\s,:-]+|[\s,:-]+$/g, '').trim();
    
    return { time, loc, code };
  };

  const getAirlineLogo = (airline: string) => {
    const domain = airline.toLowerCase().replace(/[^a-z0-9]/g, '') + ".com";
    return `https://logo.clearbit.com/${domain}`;
  };

  const closeBookingModal = () => {
    setSelectedFlight(null);
    setIsBookingSuccess(false);
    setPassengerName('');
    setPassengerEmail('');
  };

  const confirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const randomId = 'FL-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    
    const newBooking: BookingRecord = {
      id: randomId,
      type: 'flight',
      details: selectedFlight,
      date: new Date().toISOString(),
      status: 'Confirmed'
    };
    
    const existing = JSON.parse(localStorage.getItem('luxe_bookings') || '[]');
    localStorage.setItem('luxe_bookings', JSON.stringify([...existing, newBooking]));
    
    setIsBookingSuccess(true);
  };

  return (
    <div className="space-y-8">
      {/* Trip Type Selector */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => { setTripType('one-way'); setSegments([{ from: '', to: '', date: '' }]); }}
          className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tripType === 'one-way' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          One-way
        </button>
        <button 
          onClick={() => { setTripType('multi-city'); if (segments.length < 2) setSegments([...segments, { from: '', to: '', date: '' }]); }}
          className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tripType === 'multi-city' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Multi-city
        </button>
      </div>

      <div className={`transition-all duration-300 overflow-hidden ${activeRecordingField ? 'h-8 opacity-100 mb-2' : 'h-0 opacity-0'}`}>
        <div className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest border border-red-100">
          <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
          <span>Listening for Leg {activeRecordingField?.index! + 1} {activeRecordingField?.field}...</span>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="space-y-4">
          {segments.map((segment, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {tripType === 'multi-city' ? `Leg ${index + 1} From` : 'From'}
                </label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={segment.from} 
                    onChange={(e) => updateSegment(index, 'from', e.target.value)} 
                    placeholder="Origin" 
                    className="w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                  <VoiceInput 
                    onTranscript={(text) => updateSegment(index, 'from', text.replace(/[.?!]/g, ''))} 
                    onRecordingStatus={(rec) => setActiveRecordingField(rec ? {index, field: 'origin'} : null)} 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   {tripType === 'multi-city' ? `Leg ${index + 1} To` : 'To'}
                </label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={segment.to} 
                    onChange={(e) => updateSegment(index, 'to', e.target.value)} 
                    placeholder="Destination" 
                    className="w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  />
                  <VoiceInput 
                    onTranscript={(text) => updateSegment(index, 'to', text.replace(/[.?!]/g, ''))} 
                    onRecordingStatus={(rec) => setActiveRecordingField(rec ? {index, field: 'destination'} : null)} 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                <input 
                  type="date" 
                  value={segment.date} 
                  onChange={(e) => updateSegment(index, 'date', e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" 
                />
              </div>
              <div className="flex items-center space-x-2">
                {tripType === 'multi-city' && segments.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeSegment(index)}
                    className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove Leg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
                {index === segments.length - 1 && tripType === 'multi-city' && segments.length < 4 && (
                   <button 
                    type="button" 
                    onClick={addSegment}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-3 rounded-xl border border-dashed border-slate-200 text-xs uppercase tracking-widest transition-all"
                  >
                    + Add Leg
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center h-[56px] text-base"
        >
          {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Search Master Itinerary'}
        </button>
      </form>

      {summary && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-sm font-bold font-serif text-indigo-900 mb-2 flex items-center">
              <span className="mr-2">✨</span> Flight Intel
            </h3>
            <p className="text-sm text-indigo-800 leading-relaxed font-medium">{summary.split('- Airline:')[0].trim()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedFlights.map((flight, idx) => {
              const dep = splitTimeLoc(flight.departure);
              const arr = splitTimeLoc(flight.arrival);
              const hasLogoError = !!logoErrors[flight.airline];

              return (
                <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">{flight.airline}</div>
                        <div className="w-5 h-5 flex items-center justify-center overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                          {!hasLogoError ? (
                            <img 
                              src={getAirlineLogo(flight.airline)} 
                              alt={flight.airline}
                              className="w-full h-full object-contain"
                              onError={() => setLogoErrors(prev => ({ ...prev, [flight.airline]: true }))}
                            />
                          ) : (
                            <span className="text-[8px]">✈️</span>
                          )}
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-slate-800 flex items-center">
                        {flight.flightNumber}
                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Direct</span>
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900 leading-none">{flight.price}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Economy</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-6 border-y border-slate-50 mb-8">
                    <div className="flex-1 space-y-1">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Departure</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-3xl font-bold text-slate-900 tracking-tight">{dep.time}</div>
                        {dep.code && (
                          <div className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm shadow-indigo-100 transform -rotate-2">
                            {dep.code}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-tight truncate max-w-[120px]">{dep.loc}</div>
                    </div>
                    
                    <div className="flex flex-col items-center px-4 flex-none">
                      <div className="text-[10px] text-slate-400 font-bold mb-2 tracking-tighter flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{flight.duration}</span>
                      </div>
                      <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg group-hover:translate-x-4 transition-transform duration-1000">✈️</div>
                      </div>
                    </div>

                    <div className="flex-1 text-right space-y-1">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Arrival</div>
                      <div className="flex items-center justify-end space-x-2">
                        {arr.code && (
                          <div className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm shadow-indigo-100 transform rotate-2">
                            {arr.code}
                          </div>
                        )}
                        <div className="text-3xl font-bold text-slate-900 tracking-tight">{arr.time}</div>
                      </div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-tight truncate max-w-[120px] inline-block">{arr.loc}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold shadow-sm">🍴</div>
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold shadow-sm">📶</div>
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold shadow-sm">🔋</div>
                    </div>
                    <button 
                      onClick={() => setSelectedFlight(flight)} 
                      className="bg-slate-900 text-white text-xs font-bold px-8 py-3.5 rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 group-hover:shadow-indigo-100 active:scale-95"
                    >
                      Book Flight
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {sources.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Live Grounding Sources</p>
              <div className="flex flex-wrap gap-2">
                {sources.map((source, i) => (
                  <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-white hover:bg-indigo-50 text-indigo-600 text-[10px] font-bold px-4 py-2 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all shadow-sm">
                    <span className="max-w-[150px] truncate">{source.title || "Travel Platform"}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedFlight && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeBookingModal}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {isBookingSuccess ? (
              <div className="p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">✓</div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-serif font-bold text-slate-900">Booking Confirmed!</h3>
                  <p className="text-slate-500 text-sm">Your flight <strong>{selectedFlight.flightNumber}</strong> is reserved. Check the "My Trips" dashboard for updates.</p>
                </div>
                <button onClick={closeBookingModal} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all">Close</button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-serif font-bold">Complete Reservation</h3>
                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">{selectedFlight.airline} {selectedFlight.flightNumber}</p>
                  </div>
                  <button onClick={closeBookingModal} className="text-white/60 hover:text-white">✕</button>
                </div>
                <div className="p-8 space-y-6">
                  <form onSubmit={confirmBooking} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passenger Name</label>
                      <input required type="text" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="Full Name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                      <input required type="email" value={passengerEmail} onChange={(e) => setPassengerEmail(e.target.value)} placeholder="Email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-2xl font-bold text-indigo-600">{selectedFlight.price}</div>
                      <button type="submit" className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-xl transition-all">Confirm Booking</button>
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

export default FlightSearch;
