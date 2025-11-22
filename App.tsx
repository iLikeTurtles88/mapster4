import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, Lightbulb, Home, List as ListIcon, X, CheckCircle2 } from 'lucide-react';

import Globe3D from './components/Globe3D';
import { StartModal, EndModal, HintModal, RevealModal } from './components/Modals';
import { FloatingText } from './components/FloatingText';
import { fetchData, normalizeString } from './services/dataService';
import { audioService } from './services/audioService';
import { ALIASES, REGION_CAMERAS } from './constants';
import { CountryData, GameMode, Region, GameState, UserStats } from './types';

function App() {
  // --- Window Dimensions & Input Focus Logic ---
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isInputFocused, setIsInputFocused] = useState(false); 
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce resize to avoid globe jitter
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timeoutId);
    };
  }, []);

  // --- Data State ---
  const [allCountries, setAllCountries] = useState<CountryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // --- Game State ---
  const [gameState, setGameState] = useState<GameState>({
    status: 'loading',
    score: 0,
    total: 0,
    timer: 0,
    foundIds: new Set(),
    targetCountry: null,
    mode: 'type',
    region: 'World',
  });

  const [subset, setSubset] = useState<CountryData[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ xp: 0, level: 1, combo: 1, lastGuessTime: 0 });
  
  // --- UI State ---
  const [inputValue, setInputValue] = useState('');
  const [hintIds, setHintIds] = useState<Set<string>>(new Set()); // Visual feedback while typing
  
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintReveal, setHintReveal] = useState<{ capital?: string; flag?: string } | null>(null);
  const [floaters, setFloaters] = useState<Array<{ id: number; text: string; x: number; y: number; color: string }>>([]);
  
  const [soundEnabled, setSoundEnabledState] = useState(() => {
      return localStorage.getItem('wa_sound') !== 'false';
  });
  const setSoundEnabled = (val: boolean) => {
      setSoundEnabledState(val);
      localStorage.setItem('wa_sound', val.toString());
      audioService.setEnabled(val);
  };

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [foundList, setFoundList] = useState<CountryData[]>([]);
  const [penaltyFlash, setPenaltyFlash] = useState(false);
  
  // Camera logic
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number; altitude: number } | null>(null);
  const [rings, setRings] = useState<any[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Init ---
  useEffect(() => {
    fetchData().then(data => {
      setAllCountries(data);
      setGameState(prev => ({ ...prev, status: 'menu' }));
      setIsLoading(false);
      
      const loader = document.getElementById('app-loader');
      if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.style.display = 'none', 500);
      }

      const savedXP = localStorage.getItem('wa_xp');
      const savedLvl = localStorage.getItem('wa_lvl');
      if (savedXP && savedLvl) {
        setUserStats(prev => ({ ...prev, xp: parseInt(savedXP), level: parseInt(savedLvl) }));
      }
    }).catch(e => {
        console.error(e);
        setLoadingError("Impossible de charger les données géographiques.");
        setIsLoading(false);
        const loader = document.getElementById('app-loader');
        if (loader) loader.style.display = 'none';
    });
  }, []);

  // --- Game Loop ---
  useEffect(() => {
    if (gameState.status === 'playing') {
      timerRef.current = setInterval(() => {
        setGameState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.status]);

  useEffect(() => {
    audioService.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // --- Helpers ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const addFloater = (text: string, x?: number, y?: number, color = '#ffffff') => {
    const id = Date.now();
    setFloaters(prev => [...prev, { 
      id, 
      text, 
      x: x || window.innerWidth / 2, 
      y: y || window.innerHeight / 2, 
      color 
    }]);
  };

  const triggerRing = (coords: { lat: number, lng: number }) => {
      const newRing = { lat: coords.lat, lng: coords.lng };
      setRings(prev => [...prev, newRing]);
      setTimeout(() => {
          setRings(prev => prev.filter(r => r !== newRing));
      }, 2000);
  };

  const getDistanceAndBearing = (from: CountryData, to: CountryData) => {
      const R = 6371; 
      const dLat = (to.coords.lat - from.coords.lat) * Math.PI / 180;
      const dLon = (to.coords.lng - from.coords.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(from.coords.lat * Math.PI / 180) * Math.cos(to.coords.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = Math.round(R * c);

      const y = Math.sin(dLon) * Math.cos(to.coords.lat * Math.PI / 180);
      const x = Math.cos(from.coords.lat * Math.PI / 180) * Math.sin(to.coords.lat * Math.PI / 180) -
                Math.sin(from.coords.lat * Math.PI / 180) * Math.cos(to.coords.lat * Math.PI / 180) * Math.cos(dLon);
      const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      
      let arrow = '⬆️';
      if (brng >= 22.5 && brng < 67.5) arrow = '↗️';
      else if (brng >= 67.5 && brng < 112.5) arrow = '➡️';
      else if (brng >= 112.5 && brng < 157.5) arrow = '↘️';
      else if (brng >= 157.5 && brng < 202.5) arrow = '⬇️';
      else if (brng >= 202.5 && brng < 247.5) arrow = '↙️';
      else if (brng >= 247.5 && brng < 292.5) arrow = '⬅️';
      else if (brng >= 292.5 && brng < 337.5) arrow = '↖️';

      return { distance, arrow };
  };

  const gainXP = (amount: number) => {
    setUserStats(prev => {
      let newXP = prev.xp + amount;
      let newLvl = prev.level;
      const needed = newLvl * 100;
      
      if (newXP >= needed) {
        newXP -= needed;
        newLvl++;
        audioService.playLevelUp();
        addFloater("LEVEL UP!", undefined, window.innerHeight/2 - 100, '#f72585');
        
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f72585', '#4cc9f0', '#FFD700']
        });
      }

      localStorage.setItem('wa_xp', newXP.toString());
      localStorage.setItem('wa_lvl', newLvl.toString());
      return { ...prev, xp: newXP, level: newLvl };
    });
  };

  const pickTarget = (currentFound: Set<string>, currentSubset: CountryData[]) => {
    const remaining = currentSubset.filter(c => !currentFound.has(c.id));
    if (remaining.length === 0) return null;
    return remaining[Math.floor(Math.random() * remaining.length)];
  };

  // --- Actions ---
  const startGame = (region: Region, mode: GameMode) => {
    const newSubset = region === 'World' ? allCountries : allCountries.filter(c => c.region === region);
    
    if (newSubset.length === 0) {
        alert("Pas de données pour cette région");
        return;
    }

    setSubset(newSubset);
    setFoundList([]);
    
    // --- CINEMATIC INTRO ---
    // 1. Start far away in space
    setTargetLocation({ lat: 0, lng: 0, altitude: 3.5 });
    
    // 2. Zoom in to the target region after a brief moment
    const cam = REGION_CAMERAS[region] || REGION_CAMERAS['World'];
    setTimeout(() => {
       setTargetLocation(cam); 
    }, 100);

    setGameState({
      status: 'playing',
      score: 0,
      total: newSubset.length,
      timer: 0,
      foundIds: new Set(),
      targetCountry: null,
      mode,
      region
    });
    
    setUserStats(prev => ({ ...prev, combo: 1 }));
    if(soundEnabled) audioService.startAmbience();
    
    // Show "Get Ready"
    setTimeout(() => {
      addFloater("GO !", window.innerWidth / 2, window.innerHeight / 2, '#4cc9f0');
    }, 1000);
  };

  useEffect(() => {
    if (gameState.status === 'playing' && !gameState.targetCountry && subset.length > 0) {
        const t = pickTarget(gameState.foundIds, subset);
        setGameState(prev => ({ ...prev, targetCountry: t }));
    }
  }, [gameState.status, subset]);


  const handleSuccess = (country: CountryData) => {
    const newFound = new Set(gameState.foundIds);
    newFound.add(country.id);

    const now = Date.now();
    let newCombo = 1;
    if (now - userStats.lastGuessTime < 10000) {
        newCombo = userStats.combo + 1;
    }
    
    audioService.playCorrect();
    triggerRing(country.coords);
    
    confetti({ 
        particleCount: 30, 
        spread: 50, 
        origin: { y: 0.8 }, 
        colors: ['#4cc9f0', '#f72585', '#ffffff'],
        scalar: 0.8,
        disableForReducedMotion: true
    });
    
    addFloater(newCombo > 1 ? `COMBO x${newCombo}!` : "BIEN JOUÉ !", undefined, undefined, '#4cc9f0');
    gainXP(10 * newCombo);

    setFoundList(prev => [country, ...prev]);
    setUserStats(prev => ({ ...prev, combo: newCombo, lastGuessTime: now }));
    
    // Center camera on found country
    setTargetLocation({ lat: country.coords.lat, lng: country.coords.lng, altitude: 1.5 });
    
    setInputValue('');
    setHintIds(new Set()); // Clear visual hints

    const isWin = newFound.size === gameState.total;

    setGameState(prev => ({
        ...prev,
        score: prev.score + 1,
        foundIds: newFound,
        targetCountry: isWin ? null : pickTarget(newFound, subset),
        status: isWin ? 'finished' : 'playing'
    }));
  };

  const handleFailure = () => {
    audioService.playWrong();
    setUserStats(prev => ({ ...prev, combo: 1 }));
    document.body.classList.add('animate-shake');
    setTimeout(() => document.body.classList.remove('animate-shake'), 400);
  };

  const applyPenalty = (seconds: number) => {
     setGameState(prev => ({ ...prev, timer: prev.timer + seconds }));
     setPenaltyFlash(true);
     setTimeout(() => setPenaltyFlash(false), 500);
     addFloater(`+${seconds}s`, undefined, undefined, '#f48c06');
     audioService.playPenalty();
  };

  // --- Input Handlers ---
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState.status !== 'playing') return;
    const rawVal = e.target.value;
    setInputValue(rawVal);
    const val = normalizeString(rawVal);

    // --- VISUAL HINTS LOGIC ---
    // If the user types 2 chars or more, find matching countries
    // and illuminate them on the globe
    if (val.length >= 2) {
        const potentialMatches = subset.filter(c => {
            // Ignore already found
            if (gameState.foundIds.has(c.id)) return false;
            const name = normalizeString(c.frName);
            return name.startsWith(val);
        });
        // Update the Set of IDs to highlight
        setHintIds(new Set(potentialMatches.map(c => c.id)));
    } else {
        setHintIds(new Set());
    }

    // Exact match check
    let matchId = ALIASES[val];
    let matchedCountry = null;

    if (matchId) {
        matchedCountry = subset.find(c => c.id === matchId && !gameState.foundIds.has(c.id));
    } else {
        matchedCountry = subset.find(c => !gameState.foundIds.has(c.id) && normalizeString(c.frName) === val);
    }

    if (matchedCountry) {
        handleSuccess(matchedCountry);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim().length > 2 && gameState.targetCountry) {
          const val = normalizeString(inputValue);
          let guessedCountry = allCountries.find(c => normalizeString(c.frName) === val || c.id === ALIASES[val]);
          
          if (guessedCountry && guessedCountry.id !== gameState.targetCountry.id) {
             const { distance, arrow } = getDistanceAndBearing(guessedCountry, gameState.targetCountry);
             addFloater(`${guessedCountry.frName}: ${distance}km ${arrow}`, undefined, window.innerHeight / 2 - 100, '#fbbf24');
             audioService.playRadarPing();
             setInputValue('');
             setHintIds(new Set()); // Clear hints on error
             applyPenalty(5);
          } else if (!guessedCountry) {
             document.body.classList.add('animate-shake');
             setTimeout(() => document.body.classList.remove('animate-shake'), 400);
          }
      }
  };

  const handlePolygonClick = useCallback((country: CountryData) => {
    if (gameState.status !== 'playing') return;
    
    if (gameState.mode === 'click') {
        if (gameState.targetCountry && country.id === gameState.targetCountry.id) {
            handleSuccess(country);
        } else {
            handleFailure();
            applyPenalty(5);
            addFloater(`Non, c'est ${country.frName}`, undefined, undefined, '#ef4444');
        }
    } else {
        // En mode "Type", cliquer focalise l'input
        inputRef.current?.focus();
    }
  }, [gameState.status, gameState.mode, gameState.targetCountry, gameState.foundIds, subset]); 

  const revealHint = (type: 'capital' | 'flag' | 'both') => {
    if (!gameState.targetCountry) {
        const remaining = subset.filter(c => !gameState.foundIds.has(c.id));
        if (remaining.length === 0) return;
        const randomTarget = remaining[Math.floor(Math.random() * remaining.length)];
        
        let cost = 20;
        if (type === 'both') cost = 40;
        
        applyPenalty(cost);
        setHintReveal({
            capital: (type === 'capital' || type === 'both') ? randomTarget.capital : undefined,
            flag: (type === 'flag' || type === 'both') ? randomTarget.flag : undefined
        });
    } else {
        let cost = 20;
        if (type === 'both') cost = 40;
        
        applyPenalty(cost);
        setHintReveal({
            capital: (type === 'capital' || type === 'both') ? gameState.targetCountry.capital : undefined,
            flag: (type === 'flag' || type === 'both') ? gameState.targetCountry.flag : undefined
        });
    }
    setShowHintModal(false);
  };

  const groupedFoundCountries = useMemo(() => {
    const groups: Record<string, CountryData[]> = {};
    foundList.forEach(country => {
       const reg = country.region; 
       if (!groups[reg]) groups[reg] = [];
       groups[reg].push(country);
    });
    return groups;
  }, [foundList]);

  const handleMenuReturn = () => {
      setGameState(prev => ({...prev, status: 'menu'}));
      setTargetLocation(REGION_CAMERAS['World']);
  };

  return (
    <div className="w-full h-full text-white overflow-hidden relative" ref={containerRef}>
      
      {/* 3D Scene Layer */}
      <div className={`absolute inset-0 z-0 transition-all duration-500 ${isSidebarOpen ? 'blur-sm opacity-30' : 'opacity-100'}`}>
        <Globe3D 
          countries={allCountries} 
          foundIds={gameState.foundIds}
          hintIds={hintIds} // Passed to Globe for highlighting
          gameStatus={gameState.status}
          onPolygonClick={handlePolygonClick}
          width={dimensions.width}
          height={dimensions.height}
          targetLocation={targetLocation}
          rings={rings}
        />
      </div>

      {/* Loading Error */}
      {loadingError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90">
              <div className="text-center max-w-md border border-red-500/30 p-8 rounded-3xl bg-red-500/5 backdrop-blur-xl">
                  <div className="text-red-500 text-5xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold text-white mb-2">Erreur Système</h2>
                  <p className="text-slate-400 mb-6">{loadingError}</p>
                  <button onClick={() => window.location.reload()} className="px-8 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-all">Relancer</button>
              </div>
          </div>
      )}

      {/* HUD Layer */}
      {!loadingError && (
          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-4 pb-safe safe-area transition-all duration-300">
            
            {/* Top Bar */}
            <div className={`flex justify-between items-start pt-safe transition-all duration-500 ${isInputFocused ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                
                {/* Stats Card */}
                <div 
                    onClick={() => setSidebarOpen(true)}
                    className="glass-panel px-4 py-3 rounded-2xl flex flex-col gap-1 min-w-[140px] pointer-events-auto cursor-pointer hover:bg-white/10 transition-colors group shadow-2xl border-t border-white/20"
                >
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">
                        <span>Lvl {userStats.level}</span>
                        <span className={`font-mono transition-colors duration-300 ${penaltyFlash ? 'text-orange-500' : 'text-white'}`}>
                            {formatTime(gameState.timer)}
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_#22d3ee]"
                            style={{ width: `${(userStats.xp / (userStats.level * 100)) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <span className="text-3xl font-black text-white leading-none">{gameState.score}<span className="text-sm text-slate-500 ml-1">/{gameState.total}</span></span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    {userStats.combo > 1 && (
                         <div className="glass-panel px-3 py-1 rounded-xl mr-2 animate-in slide-in-from-right-4 flex flex-col items-center border-pink-500/30 shadow-[0_0_15px_rgba(247,37,133,0.2)] bg-pink-500/10">
                            <span className="text-[8px] font-bold uppercase text-pink-500 tracking-widest">Combo</span>
                            <span className="text-xl font-black text-white italic">x{userStats.combo}</span>
                        </div>
                    )}

                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-cyan-400 hover:text-white border-white/10">
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <button onClick={() => setSidebarOpen(true)} className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all relative text-cyan-400 hover:text-white border-white/10">
                        <ListIcon size={20} />
                        {foundList.length > 0 && <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_5px_#22d3ee]"></span>}
                    </button>
                    <button onClick={handleMenuReturn} className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all text-slate-400 hover:text-white border-white/10">
                        <Home size={20} />
                    </button>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className={`flex flex-col items-center gap-4 pointer-events-auto w-full max-w-xl mx-auto mb-safe transition-all duration-300 ${isInputFocused ? 'translate-y-0' : 'translate-y-0'}`}>
                
                {/* Click Mode Prompt */}
                {gameState.status === 'playing' && gameState.mode === 'click' && gameState.targetCountry && (
                    <div className="glass-panel px-6 py-4 rounded-full animate-in slide-in-from-bottom-4 flex items-center gap-4 shadow-2xl border border-cyan-500/30 backdrop-blur-xl">
                        <span className="text-cyan-400 text-[10px] uppercase font-black tracking-[0.2em] hidden xs:block">Cible</span>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-white drop-shadow-lg">
                                {gameState.targetCountry.frName}
                            </span>
                            {gameState.targetCountry.flag && <img src={gameState.targetCountry.flag} className="h-6 w-auto rounded border border-white/20 shadow-sm" alt="flag" />}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                {gameState.status === 'playing' && (
                    <div className="w-full flex gap-3 items-stretch px-2 md:px-0">
                        {gameState.mode === 'type' && (
                            <div className={`flex-1 glass-panel rounded-2xl p-1 pl-5 flex items-center ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-cyan-400 transition-all shadow-2xl relative bg-slate-900/80`}>
                                <input 
                                    ref={inputRef}
                                    type="text" 
                                    value={inputValue}
                                    onChange={handleTyping}
                                    onKeyDown={handleInputKeyDown}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                    placeholder={isInputFocused ? "" : "Entrez un pays..."}
                                    className="w-full bg-transparent border-none outline-none text-white font-bold h-12 placeholder:text-slate-600 placeholder:font-bold text-lg uppercase tracking-wide"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                />
                                {inputValue && (
                                    <button 
                                        onClick={() => { setInputValue(''); setHintIds(new Set()); inputRef.current?.focus(); }}
                                        className="p-3 text-slate-500 hover:text-white transition-colors mr-1"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Hint Button */}
                        <button 
                            onClick={() => setShowHintModal(true)}
                            className="w-14 glass-panel rounded-2xl flex items-center justify-center text-amber-400 hover:bg-amber-500/20 border-amber-500/30 active:scale-95 transition-all shadow-lg flex-shrink-0"
                        >
                            <Lightbulb size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </div>
          </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-[#02040a]/95 backdrop-blur-xl border-l border-white/10 transform transition-transform duration-300 z-40 flex flex-col p-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} shadow-[0_0_100px_rgba(0,0,0,0.8)]`}>
        <div className="flex justify-between items-center p-6 border-b border-white/5 pt-safe">
            <div>
                <h3 className="font-black text-2xl text-white tracking-tight">JOURNAL DE BORD</h3>
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">{foundList.length} / {gameState.total} SÉCURISÉS</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-3 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"><X size={24}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pb-20 custom-scrollbar">
            {foundList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-600 text-center px-6 gap-4 opacity-50">
                    <div className="p-6 rounded-full bg-slate-900/50 border border-white/5">
                        <Home size={32} />
                    </div>
                    <p className="text-sm font-medium uppercase tracking-widest">Aucune donnée</p>
                </div>
            ) : (
                Object.keys(groupedFoundCountries).sort().map(region => (
                    <div key={region} className="mb-8 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="flex items-center gap-3 mb-3 px-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{region}</span>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                        </div>
                        <div className="space-y-2">
                            {groupedFoundCountries[region].sort((a, b) => a.frName.localeCompare(b.frName)).map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => { setTargetLocation({ lat: c.coords.lat, lng: c.coords.lng, altitude: 1.5 }); setSidebarOpen(false); }} 
                                    className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all cursor-pointer active:scale-98 group"
                                >
                                    <img src={c.flag} alt={c.name} className="w-10 h-auto rounded shadow-sm group-hover:scale-105 transition-transform opacity-80 group-hover:opacity-100" loading="lazy" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-300 truncate group-hover:text-cyan-400 transition-colors">{c.frName}</div>
                                    </div>
                                    <CheckCircle2 size={16} className="text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Modals */}
      {(gameState.status === 'menu' || gameState.status === 'loading') && !loadingError && (
          <StartModal onStart={startGame} isLoading={isLoading} />
      )}
      
      {gameState.status === 'finished' && (
        <EndModal 
            score={gameState.score} 
            total={gameState.total} 
            time={formatTime(gameState.timer)}
            xp={gameState.foundIds.size * 10}
            onReplay={() => setGameState(prev => ({ ...prev, status: 'menu' }))}
            onMenu={() => setGameState(prev => ({ ...prev, status: 'menu' }))}
        />
      )}
      {showHintModal && <HintModal onSelect={revealHint} onCancel={() => setShowHintModal(false)} />}
      {hintReveal && <RevealModal data={hintReveal} onClose={() => setHintReveal(null)} />}

      <FloatingText floaters={floaters} onRemove={(id) => setFloaters(prev => prev.filter(f => f.id !== id))} />
      
      <style>{`
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 
            10%, 90% { transform: translate3d(-1px, 0, 0); } 
            20%, 80% { transform: translate3d(2px, 0, 0); } 
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 
            40%, 60% { transform: translate3d(4px, 0, 0); } 
        }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .pt-safe { padding-top: env(safe-area-inset-top); }
        .mb-safe { margin-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
}

export default App;