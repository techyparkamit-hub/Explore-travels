
import React, { useState, useMemo } from 'react';
import { searchTravelInfo } from '../services/geminiService';
import { GroundingSource, Hotel, BookingRecord } from '../types';
import VoiceInput from './VoiceInput';

const HotelSearch: React.FC = () => {
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Voice interaction states
  const [activeRecordingField, setActiveRecordingField] = useState<string | null>(null);

  // Modal state
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingId, setBookingId] = useState('');

  // Image states for better handling
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800";

  const getHotelImage = (hotelName: string, hotelLocation: string) => {
    const keywords = encodeURIComponent(`${hotelLocation} luxury hotel ${hotelName}`);
    // Using a reliable contextual image service
    return `https://loremflickr.com/800/600/${keywords}/all`;
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!location) return;
    
    setLoading(true);
    setHotels([]);
    setSummary('');
    setSelectedAmenities([]);
    setImageErrors({});
    setLoadedImages({});
    
    try {
      const query = `Find the best luxury hotels in ${location}. 
                    First, provide a one-sentence overview of the hotel market there.
                    Then, list each hotel exactly in this format:
                    - Hotel Name: [Name]
                    - Location: [Specific Area]
                    - Price: [Price per night]
                    - Rating: [Rating out of 5]
                    - Amenities: [Amenity 1, Amenity 2, Amenity 3]
                    - Link: [URL if available]
                    
                    Only provide real, current information.`;

      const response = await searchTravelInfo(query);
      const text = response.text || "";
      setSummary(text);
      setSources(response.sources);

      const hotelBlocks = text.split(/(?=- Hotel Name:)/g).filter(b => b.trim().startsWith('- Hotel Name:'));
      
      const parsedHotels: Hotel[] = hotelBlocks.map(block => {
        const getVal = (label: string) => {
          const regex = new RegExp(`- ${label}:\\s*(.*)`, 'i');
          const match = block.match(regex);
          return match ? match[1].split('\n')[0].trim() : 'N/A';
        };
        
        const name = getVal('Hotel Name');
        const loc = getVal('Location');
        const amenitiesStr = getVal('Amenities');
        const amenities = amenitiesStr !== 'N/A' 
          ? amenitiesStr.split(',').map(s => s.trim()) 
          : [];

        return {
          name,
          location: loc,
          pricePerNight: getVal('Price'),
          rating: getVal('Rating'),
          amenities: amenities,
          link: getVal('Link')
        };
      });

      if (parsedHotels.length > 0) {
        setHotels(parsedHotels);
      }
    } catch (error) {
      console.error(error);
      setSummary("Unable to retrieve hotel data at this time.");
    } finally {
      setLoading(false);
    }
  };

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    hotels.forEach(h => h.amenities.forEach(a => set.add(a)));
    return Array.from(set).sort();
  }, [hotels]);

  const filteredHotels = useMemo(() => {
    if (selectedAmenities.length === 0) return hotels;
    return hotels.filter(h => 
      selectedAmenities.every(amenity => h.amenities.includes(amenity))
    );
  }, [hotels, selectedAmenities]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity) 
        : [...prev, amenity]
    );
  };

  const closeBookingModal = () => {
    setSelectedHotel(null);
    setIsBookingSuccess(false);
    setBookingId('');
  };

  const confirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const randomId = 'LT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    setBookingId(randomId);
    
    // Save to persistence
    const newBooking: BookingRecord = {
      id: randomId,
      type: 'hotel',
      details: selectedHotel,
      date: new Date().toISOString(),
      status: 'Confirmed'
    };
    
    const existing = JSON.parse(localStorage.getItem('luxe_bookings') || '[]');
    localStorage.setItem('luxe_bookings', JSON.stringify([...existing, newBooking]));
    
    setIsBookingSuccess(true);
  };

  return (
    <div className="space-y-8">
      <div className={`transition-all duration-300 overflow-hidden ${activeRecordingField ? 'h-8 opacity-100 mb-2' : 'h-0 opacity-0'}`}>
        <div className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest border border-red-100">
          <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
          <span>Listening for {activeRecordingField}...</span>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination</label>
          <div className="flex space-x-2">
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Tokyo, Japan"
              className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all ${
                activeRecordingField === 'destination' 
                  ? 'border-red-500 ring-4 ring-red-500/10' 
                  : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
            <VoiceInput 
              onTranscript={(text) => setLocation(text.replace(/[.?!]/g, ''))} 
              onRecordingStatus={(recording) => setActiveRecordingField(recording ? 'destination' : null)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button 
            type="submit"
            disabled={loading || activeRecordingField !== null}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 whitespace-nowrap min-w-[160px] flex justify-center items-center h-[46px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Explore Stays'
            )}
          </button>
        </div>
      </form>

      {summary && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-sm font-bold font-serif text-indigo-900 mb-2 flex items-center">
              <span className="mr-2">🛎️</span> Local Insight
            </h3>
            <p className="text-sm text-indigo-800 leading-relaxed font-medium">
              {summary.split('- Hotel Name:')[0].trim() || "Finding the finest accommodations for your stay."}
            </p>
          </div>

          {allAmenities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter by Amenities:</span>
                {selectedAmenities.length > 0 && (
                  <button 
                    onClick={() => setSelectedAmenities([])}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allAmenities.map((amenity) => (
                  <button
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      selectedAmenities.includes(amenity)
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredHotels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHotels.map((hotel, idx) => {
                const isLoaded = !!loadedImages[hotel.name];
                const hasError = !!imageErrors[hotel.name];
                
                return (
                  <div key={`${hotel.name}-${idx}`} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                    <div className="h-56 bg-slate-100 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                      
                      {/* Background Placeholder UI */}
                      {!isLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-300">
                          <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-widest">Searching imagery...</span>
                          
                          {/* Shimmer Placeholder Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                      <div className="absolute bottom-4 left-4 z-20">
                        <div className="flex items-center space-x-1 text-yellow-400 mb-1">
                          <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded mr-1 tracking-tighter uppercase">Rating</span>
                          <span className="text-sm font-bold text-white">{hotel.rating}</span>
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" /></svg>
                        </div>
                      </div>
                      
                      <img 
                        src={hasError ? FALLBACK_IMAGE : getHotelImage(hotel.name, hotel.location)} 
                        alt={hotel.name}
                        onLoad={() => setLoadedImages(prev => ({ ...prev, [hotel.name]: true }))}
                        onError={() => {
                          setImageErrors(prev => ({ ...prev, [hotel.name]: true }));
                          setLoadedImages(prev => ({ ...prev, [hotel.name]: true }));
                        }}
                        className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                        loading="lazy"
                      />
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                      <div className="mb-4">
                        <h4 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{hotel.name}</h4>
                        <p className="text-xs text-slate-400 font-medium flex items-center uppercase tracking-wider">
                          <svg className="w-3 h-3 mr-1 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {hotel.location}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {hotel.amenities.slice(0, 4).map((amenity, i) => (
                          <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 uppercase tracking-tighter">
                            {amenity}
                          </span>
                        ))}
                        {hotel.amenities.length > 4 && (
                          <span className="text-[10px] font-bold text-slate-300 px-1 py-1 uppercase tracking-tighter">
                            +{hotel.amenities.length - 4} more
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-slate-400 font-medium tracking-tight">Starting at</div>
                          <div className="text-xl font-bold text-slate-900">{hotel.pricePerNight}</div>
                        </div>
                        <button 
                          onClick={() => setSelectedHotel(hotel)}
                          className="bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-lg group-hover:shadow-indigo-100 active:scale-95"
                        >
                          Book Stay
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hotels.length > 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4 opacity-20">🔍</div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">No matches found</h4>
              <p className="text-slate-500 font-medium italic">Try adjusting your filters.</p>
            </div>
          ) : null}

          {sources.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Grounding Sources</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sources.map((source, i) => (
                  <a 
                    key={i} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-white hover:bg-indigo-50 text-indigo-600 text-[10px] font-bold px-4 py-2 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all shadow-sm"
                  >
                    <span className="max-w-[150px] truncate">{source.title || "Travel Platform"}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedHotel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={closeBookingModal}
          ></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {isBookingSuccess ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">✓</div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-serif font-bold text-slate-900">Reservation Confirmed!</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hotel</span>
                      <span className="text-sm font-bold text-slate-800 text-right max-w-[150px] truncate">{selectedHotel.name}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</span>
                      <span className="text-sm font-bold text-slate-800">{selectedHotel.location}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booking ID</span>
                      <span className="text-sm font-mono font-bold text-indigo-600">{bookingId}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Your luxury stay at <strong>{selectedHotel.name}</strong> is secured.
                  </p>
                </div>
                <button 
                  onClick={closeBookingModal}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-serif font-bold">Book Your Luxury Stay</h3>
                    <p className="text-indigo-100 text-xs opacity-80 uppercase tracking-widest font-bold">{selectedHotel.name}</p>
                  </div>
                  <button onClick={closeBookingModal} className="text-white/60 hover:text-white">✕</button>
                </div>
                <div className="p-8 space-y-6">
                  <form onSubmit={confirmBooking} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check-In</label>
                        <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check-Out</label>
                        <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guest Name</label>
                      <input required type="text" placeholder="Jane Smith" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Email</label>
                      <input required type="email" placeholder="jane@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl transition-all">
                      Reserve Now
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      ` }} />
    </div>
  );
};

export default HotelSearch;
