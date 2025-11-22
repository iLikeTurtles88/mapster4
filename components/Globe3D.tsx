import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { CountryData, GameState } from '../types';
import { COLORS } from '../constants';

interface Globe3DProps {
  countries: CountryData[];
  foundIds: Set<string>;
  hintIds?: Set<string>; // IDs à mettre en surbrillance légère
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
  const starsRef = useRef<THREE.Points | null>(null);
  
  const isMobile = width < 768;

  // --- PERFORMANCE & VISUAL CONFIG ---
  const rendererConfig = useMemo(() => ({
    powerPreference: "high-performance" as const,
    antialias: !isMobile, 
    pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, isMobile ? 1.2 : 1.5) : 1,
    stencil: false,
    depth: true,
    alpha: true
  }), [isMobile]);

  // --- STARFIELD GENERATION (3D SCENE) ---
  useEffect(() => {
    if (!globeRef.current) return;
    
    const scene = globeRef.current.scene();
    if (starsRef.current) return; // Déjà créé

    // Création d'un nuage de points pour les étoiles
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3500;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Distribution sphérique aléatoire (loin du centre)
      const r = 300 + Math.random() * 200; // Rayon entre 300 et 500
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      sizes[i] = Math.random() * 1.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false // Les étoiles gardent la même taille quelle que soit la distance (effet Arcade)
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;

    // Cleanup à la désactivation (rare dans ce contexte, mais bonne pratique)
    return () => {
      if (starsRef.current) {
        scene.remove(starsRef.current);
        starGeometry.dispose();
        starMaterial.dispose();
        starsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (targetLocation && globeRef.current) {
      // Transition douce de 1.5s pour la caméra (plus lent pour le cinématique)
      globeRef.current.pointOfView(targetLocation, 1500);
    }
  }, [targetLocation]);

  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = gameStatus === 'menu';
        controls.autoRotateSpeed = 0.6; // Un peu plus rapide pour le dynamisme
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        
        // Configuration des limites de zoom
        controls.minDistance = 120; // Zoom max (près)
        controls.maxDistance = 450; // Zoom min (loin)
        
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

  // --- ARCADE / HOLOGRAM STYLE ---
  const getPolygonColor = useCallback((d: any) => {
    const countryId = d.properties.data.id;
    
    // 1. PAYS TROUVÉ: Cyan brillant (effet néon)
    if (foundIds.has(countryId)) {
        return 'rgba(76, 201, 240, 0.9)'; 
    }

    // 2. INDICE VISUEL (Typing): Blanc fantomatique clignotant
    if (hintIds && hintIds.has(countryId)) {
        return 'rgba(255, 255, 255, 0.3)'; // Plus visible
    }
    
    // 3. DÉFAUT: Très sombre
    return 'rgba(20, 30, 50, 0.3)';
  }, [foundIds, hintIds]);

  const getPolygonLabel = useCallback((d: any) => {
    if (gameStatus === 'menu') {
        return `
            <div style="
                background: rgba(2, 4, 10, 0.8); 
                padding: 4px 8px; 
                border-radius: 4px; 
                border: 1px solid #4cc9f0; 
                font-family: 'Outfit', sans-serif; 
                font-weight: 700; 
                font-size: 10px; 
                letter-spacing: 1px;
                color: #fff; 
                box-shadow: 0 0 10px rgba(76, 201, 240, 0.3);
            ">
                ${d.properties.data.frName.toUpperCase()}
            </div>
        `;
    }
    return "";
  }, [gameStatus]);

  // Frontières fines
  const getPolygonStrokeColor = useCallback(() => 'rgba(76, 201, 240, 0.25)', []);
  const getRingColor = useCallback(() => COLORS.accent, []);

  const handlePolygonClick = useCallback((p: any) => {
      onPolygonClick(p.properties.data);
  }, [onPolygonClick]);

  const handlePolygonHover = useCallback((p: any) => {
      const canvas = globeRef.current?.renderer().domElement;
      if (canvas) {
          canvas.style.cursor = p ? 'crosshair' : 'grab';
      }
  }, []);

  return (
    <Globe
      ref={globeRef}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      
      // TEXTURES HOLOGRAPHIQUES
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg" 
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      
      rendererConfig={rendererConfig}
      
      // ATMOSPHERE GLOW
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
      // Transition rapide pour la réactivité des hints (100ms)
      polygonsTransitionDuration={150}
      polygonLabel={getPolygonLabel}

      // Pings/Rings
      ringsData={rings}
      ringColor={getRingColor}
      ringMaxRadius={10}
      ringPropagationSpeed={8}
      ringRepeatPeriod={0}
    />
  );
};

export default React.memo(Globe3D);