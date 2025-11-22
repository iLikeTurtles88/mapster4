
import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { CountryData, GameState } from '../types';
import { COLORS } from '../constants';

interface Globe3DProps {
  countries: CountryData[];
  foundIds: Set<string>;
  gameStatus: GameState['status'];
  onPolygonClick: (country: CountryData) => void;
  width: number;
  height: number;
  targetLocation?: { lat: number; lng: number; altitude: number } | null;
  rings: any[];
}

const Globe3D: React.FC<Globe3DProps> = ({ 
  countries, 
  foundIds, 
  gameStatus, 
  onPolygonClick, 
  width, 
  height, 
  targetLocation, 
  rings 
}) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  // Handle camera focus (generic target location)
  useEffect(() => {
    if (targetLocation && globeRef.current) {
      globeRef.current.pointOfView(targetLocation, 1500); // 1.5s smooth animation
    }
  }, [targetLocation]);

  // Auto-rotation logic for Menu mode
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = gameStatus === 'menu';
        controls.autoRotateSpeed = 0.5;
        // Enable damping for smoother interaction
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
      }
    }
  }, [gameStatus]);

  // Memoize polygon data structure for performance
  const polygonsData = useMemo(() => {
     return countries.map(c => ({
       ...c.geoJson,
       properties: { ...c.geoJson.properties, data: c } // Embed full data for click handler
     }));
  }, [countries]);

  // Stable callback for coloring
  const getPolygonColor = useCallback((d: any) => {
    const countryId = d.properties.data.id;
    
    // If found
    if (foundIds.has(countryId)) {
        return COLORS.landFound;
    }

    // In 'playing' mode, other countries are dark
    if (gameStatus === 'playing') {
       return COLORS.landDefault;
    }

    // Menu mode
    return COLORS.landDefault;
  }, [foundIds, gameStatus]);

  // Tooltips: Show name only in Menu mode
  const getPolygonLabel = useCallback((d: any) => {
    if (gameStatus === 'menu') {
        return `
            <div style="
                background: rgba(15, 23, 42, 0.9); 
                padding: 8px 12px; 
                border-radius: 8px; 
                border: 1px solid rgba(76, 201, 240, 0.3); 
                font-family: 'Outfit', sans-serif; 
                font-weight: 700; 
                font-size: 14px; 
                color: white; 
                backdrop-filter: blur(4px);
                pointer-events: none;
                transform: translateY(-12px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                text-align: center;
            ">
                ${d.properties.data.frName}
            </div>
        `;
    }
    return "";
  }, [gameStatus]);

  // Fully memoized callbacks
  const getPolygonSideColor = useCallback(() => 'rgba(0,0,0,0)', []);
  const getPolygonStrokeColor = useCallback(() => COLORS.stroke, []);
  const getRingColor = useCallback(() => COLORS.accent, []);

  const handlePolygonClick = useCallback((p: any) => {
      onPolygonClick(p.properties.data);
  }, [onPolygonClick]);

  // Optimized hover handler
  const handlePolygonHover = useCallback((p: any) => {
      const canvas = globeRef.current?.renderer().domElement;
      if (canvas) {
          const cursor = p ? 'pointer' : 'grab';
          if (canvas.style.cursor !== cursor) {
              canvas.style.cursor = cursor;
          }
      }
  }, []);

  return (
    <Globe
      ref={globeRef}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      
      showAtmosphere={true}
      atmosphereColor={COLORS.primary}
      atmosphereAltitude={0.25} // Slightly increased for better visuals
      
      polygonsData={polygonsData}
      polygonAltitude={0.012} // Subtle elevation
      polygonCapColor={getPolygonColor}
      polygonSideColor={getPolygonSideColor}
      polygonStrokeColor={getPolygonStrokeColor}
      onPolygonClick={handlePolygonClick}
      onPolygonHover={handlePolygonHover}
      polygonsTransitionDuration={300}
      polygonLabel={getPolygonLabel}

      ringsData={rings}
      ringColor={getRingColor}
      ringMaxRadius={5}
      ringPropagationSpeed={5}
      ringRepeatPeriod={0}
    />
  );
};

export default React.memo(Globe3D);
