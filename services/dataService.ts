import { API_GEO, API_META } from '../constants';
import { CountryData } from '../types';

export const fetchData = async (): Promise<CountryData[]> => {
  try {
    const [geoRes, metaRes] = await Promise.all([
      fetch(API_GEO),
      fetch(API_META)
    ]);

    if (!geoRes.ok || !metaRes.ok) throw new Error("API Error");

    const geoData = await geoRes.json();
    const metaData = await metaRes.json();

    const countries: CountryData[] = geoData.features
      .map((feature: any) => {
        const meta = metaData.find((c: any) => c.cca3 === feature.id);
        if (!meta) return null;

        return {
          id: feature.id,
          name: meta.name.common,
          frName: meta.translations.fra?.common || meta.name.common,
          region: meta.region,
          capital: meta.capital ? meta.capital[0] : 'N/A',
          coords: { lat: meta.latlng[0], lng: meta.latlng[1] },
          flag: meta.flags.svg,
          geoJson: feature
        };
      })
      .filter((c: CountryData | null): c is CountryData => c !== null);

    return countries;
  } catch (err) {
    console.error("Failed to load data", err);
    throw err;
  }
};

export const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-']/g, " ")
    .trim();
};