export interface CountryData {
  id: string; // ISO 3 letter code (CCA3)
  name: string; // Common name
  frName: string; // French name
  region: string;
  capital: string;
  coords: { lat: number; lng: number };
  flag: string;
  geoJson: any; // The polygon feature
}

export type GameMode = 'type' | 'click';
export type Region = 'World' | 'Europe' | 'Asia' | 'Africa' | 'Americas' | 'Oceania';

export interface GameState {
  status: 'loading' | 'menu' | 'playing' | 'paused' | 'finished';
  score: number;
  total: number;
  timer: number;
  foundIds: Set<string>;
  targetCountry: CountryData | null;
  mode: GameMode;
  region: Region;
}

export interface UserStats {
  xp: number;
  level: number;
  combo: number;
  lastGuessTime: number;
}
