
export interface Flight {
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  price: string;
  duration: string;
  link: string;
}

export interface Hotel {
  name: string;
  location: string;
  pricePerNight: string;
  rating: string;
  amenities: string[];
  link: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
  isThinking?: boolean;
}

export interface BookingRecord {
  id: string;
  type: 'flight' | 'hotel' | 'itinerary';
  details: any;
  date: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
}

export enum AppTab {
  Flights = 'flights',
  Hotels = 'hotels',
  Planner = 'planner',
  Bookings = 'bookings'
}
