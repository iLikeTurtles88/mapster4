import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { CountryData, GameState } from '../types';
import { COLORS } from '../constants';

interface Globe3DProps {
  countries: CountryData[];
  foundIds: Set<string>;
  hintIds?: Set<string>;
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
  hintIds,
  gameStatus, 
  onPolygonClick, 
  width, 
  height, 
  targetLocation, 
  rings 
}) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const starCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const isMobile = width < 768;

  // --- PERFORMANCE CONFIG ---
  const rendererConfig = useMemo(() => ({
    powerPreference: "high-performance" as const,
    antialias: !isMobile, 
    pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, isMobile ? 1.2 : 1.5) : 1,
    alpha: true
  }), [isMobile]);

  // --- STARFIELD SYNC WITH GLOBE ROTATION ---
  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Init stars
    const starCount = isMobile ? 400 : 1000;
    const stars = Array.from({ length: starCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * (Math.random() > 0.9 ? 2.5 : 1.5),
      alpha: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2
    }));

    let frameId: number;
    let prevAzimuth = 0;
    let prevPolar = 0;
    let isFirstFrame = true;

    const render = () => {
      if (!canvas || !ctx) return;
      
      // Resize if needed (handle canvas buffer size mismatch)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);
      
      // Get Globe Rotation
      let dx = 0.05; // Default subtle drift
      let dy = 0;

      if (globeRef.current) {
        const controls = globeRef.current.controls();
        if (controls) {
            const az = controls.getAzimuthalAngle(); // -PI to PI
            const pol = controls.getPolarAngle(); // 0 to PI
    
            if (!isFirstFrame) {
                // Calculate delta
                let dAz = az - prevAzimuth;
                let dPol = pol - prevPolar;
                
                // Handle wrap-around for azimuth
                if (dAz > Math.PI) dAz -= 2 * Math.PI;
                if (dAz < -Math.PI) dAz += 2 * Math.PI;
    
                // Sensitivity factor (Stars at infinity move slower than foreground)
                const factor = 150; 
                dx = dAz * factor;
                dy = dPol * factor;
            }
    
            prevAzimuth = az;
            prevPolar = pol;
            isFirstFrame = false;
        } else if (gameStatus === 'menu') {
            // Auto rotate effect for menu
            dx = 0.2;
        }
      }

      // Draw Stars
      ctx.fillStyle = '#FFF';
      const time = Date.now() / 1000;

      stars.forEach(star => {
        // Update position based on camera movement
        star.x += dx;
        star.y += dy;

        // Wrap around screen
        if (star.x < 0) star.x += width;
        if (star.x > width) star.x -= width;
        if (star.y < 0) star.y += height;
        if (star.y > height) star.y -= height;

        // Twinkle
        const opacity = star.alpha * (0.7 + 0.3 * Math.sin(time * 2 + star.twinklePhase));
        
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2);
        ctx.fill();
      });

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [width, height, isMobile, gameStatus]);

  // --- CAMERA TRANSITIONS ---
  useEffect(() => {
    if (targetLocation && globeRef.current) {
      globeRef.current.pointOfView(targetLocation, 1200);
    }
  }, [targetLocation]);

  // --- CONTROLS CONFIG ---
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = gameStatus === 'menu';
        controls.autoRotateSpeed = 0.6;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.minDistance = 120;
        controls.maxDistance = 450;
        
        // Fix render quality
        globeRef.current.renderer().setPixelRatio(rendererConfig.pixelRatio);
      }
    }
  }, [gameStatus, rendererConfig]);

  const polygonsData = useMemo(() => {
     return countries.map(c => ({
       ...c.geoJson,
       properties: { ...c.geoJson.properties, data: c }
     }));
  }, [countries]);

  // --- COLORS & LABELS ---
  const getPolygonColor = useCallback((d: any) => {
    const countryId = d.properties.data.id;
    if (foundIds.has(countryId)) return 'rgba(76, 201, 240, 0.9)'; 
    // Illuminated visual hint (Bright Yellow/Gold) - High visibility against dark background
    if (hintIds && hintIds.has(countryId)) return 'rgba(255, 230, 0, 0.9)'; 
    return 'rgba(20, 30, 50, 0.3)';
  }, [foundIds, hintIds]);

  const getPolygonLabel = useCallback((d: any) => {
    if (gameStatus === 'menu') {
        return `
            <div style="background: rgba(2, 4, 10, 0.8); padding: 4px 8px; border-radius: 4px; border: 1px solid #4cc9f0; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 1px; color: #fff; box-shadow: 0 0 10px rgba(76, 201, 240, 0.3);">
                ${d.properties.data.frName.toUpperCase()}
            </div>
        `;
    }
    return "";
  }, [gameStatus]);

  const getPolygonStrokeColor = useCallback(() => 'rgba(76, 201, 240, 0.25)', []);
  const getRingColor = useCallback(() => COLORS.accent, []);

  const handlePolygonClick = useCallback((p: any) => {
      onPolygonClick(p.properties.data);
  }, [onPolygonClick]);

  const handlePolygonHover = useCallback((p: any) => {
      const canvas = globeRef.current?.renderer().domElement;
      if (canvas) canvas.style.cursor = p ? 'crosshair' : 'grab';
  }, []);

  return (
    <div ref={containerRef} style={{ width, height, position: 'relative', background: '#02040a' }}>
        {/* Starfield Layer (Behind Globe) */}
        <canvas 
            ref={starCanvasRef} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
        
        {/* Globe Layer */}
        <Globe
            ref={globeRef}
            width={width}
            height={height}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg" 
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            rendererConfig={rendererConfig}
            showAtmosphere={true}
            atmosphereColor="#4cc9f0" 
            atmosphereAltitude={0.18}
            polygonsData={polygonsData}
            polygonAltitude={0.01}
            polygonCapColor={getPolygonColor}
            polygonSideColor={() => 'rgba(0,0,0,0)'}
            polygonStrokeColor={getPolygonStrokeColor}
            onPolygonClick={handlePolygonClick}
            onPolygonHover={handlePolygonHover}
            polygonsTransitionDuration={300} // Smoother transition for hints
            polygonLabel={getPolygonLabel}
            ringsData={rings}
            ringColor={getRingColor}
            ringMaxRadius={10}
            ringPropagationSpeed={8}
            ringRepeatPeriod={0}
        />
    </div>
  );
};

export default React.memo(Globe3D);