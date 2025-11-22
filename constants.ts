
export const API_GEO = 'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json';
export const API_META = 'https://restcountries.com/v3.1/all?fields=cca3,name,translations,capital,region,latlng,population,flags';

export const COLORS = {
  primary: '#4cc9f0',
  accent: '#f72585',
  success: '#00b894',
  warning: '#f48c06',
  bgDark: '#02040a',
  landDefault: 'rgba(30, 41, 59, 0.6)',
  landFound: '#4cc9f0',
  landTarget: 'rgba(255, 255, 255, 0.1)', // Hint visual
  hover: '#f72585',
  stroke: 'rgba(255, 255, 255, 0.2)',
};

export const REGION_CAMERAS: Record<string, { lat: number; lng: number; altitude: number }> = {
  'World': { lat: 20, lng: 0, altitude: 2.5 },
  'Europe': { lat: 50, lng: 15, altitude: 0.7 },
  'Asia': { lat: 30, lng: 90, altitude: 1.6 },
  'Africa': { lat: 0, lng: 20, altitude: 1.6 },
  'Americas': { lat: 15, lng: -85, altitude: 1.7 },
  'Oceania': { lat: -25, lng: 135, altitude: 1.3 }
};

export const ALIASES: Record<string, string> = {
  'rdc': 'COD',
  'congo': 'COG',
  'republique democratique du congo': 'COD',
  'usa': 'USA',
  'etats unis': 'USA',
  'etats unis damerique': 'USA',
  'uk': 'GBR',
  'angleterre': 'GBR',
  'grande bretagne': 'GBR',
  'royaume uni': 'GBR',
  'uae': 'ARE',
  'emirats': 'ARE',
  'emirats arabes unis': 'ARE',
  'rsa': 'ZAF',
  'afrique du sud': 'ZAF',
  'hollande': 'NLD',
  'pays bas': 'NLD',
  'russie': 'RUS',
  'chine': 'CHN',
  'coree du sud': 'KOR',
  'coree du nord': 'PRK',
  'tchequie': 'CZE',
  'turkiye': 'TUR'
};
