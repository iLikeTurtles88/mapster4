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
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintReveal, setHintReveal] = useState<{ capital?: string; flag?: string } | null>(null);
  const [floaters, setFloaters] = useState<Array<{ id: number; text: string; x: number; y: number; color: string }>>([]);
  
  // Sound persistence
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

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Init ---
  useEffect(() => {
    fetchData().then(data => {
      setAllCountries(data);
      setGameState(prev => ({ ...prev, status: 'menu' }));
      setIsLoading(false);
      
      // Load stats
      const savedXP = localStorage.getItem('wa_xp');
      const savedLvl = localStorage.getItem('wa_lvl');
      if (savedXP && savedLvl) {
        setUserStats(prev => ({ ...prev, xp: parseInt(savedXP), level: parseInt(savedLvl) }));
      }
    }).catch(e => {
        console.error(e);
        setLoadingError("Erreur de connexion à l'API géographique. Vérifiez votre connexion internet.");
        setIsLoading(false);
    });
  }, []);

  // --- Game Loop (Timer) ---
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

  // --- Audio Ambience Effect ---
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
      const newRing = { lat: coords.lat, lng: coords.lng, maxR: 15, propagationSpeed: 5, repeatPeriod: 0 };
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
        addFloater("NIVEAU SUPÉRIEUR !", undefined, window.innerHeight/3, '#f72585');
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
    
    // Set Camera Focus to Region IMMEDIATELY
    const cam = REGION_CAMERAS[region] || REGION_CAMERAS['World'];
    setTargetLocation(cam);

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
    
    // Intro text
    addFloater(mode === 'type' ? "ÉCRIVEZ LE NOM !" : "CLIQUEZ SUR LE PAYS !", window.innerWidth / 2, window.innerHeight / 2, '#4cc9f0');
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
    if (now - userStats.lastGuessTime < 7000) {
        newCombo = userStats.combo + 1;
    }
    
    audioService.playCorrect();
    triggerRing(country.coords);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#4cc9f0', '#f72585'] });
    addFloater(`+${10 * newCombo} XP`);
    gainXP(10 * newCombo);

    setFoundList(prev => [country, ...prev]);
    setUserStats(prev => ({ ...prev, combo: newCombo, lastGuessTime: now }));
    
    // Focus camera on found country
    setTargetLocation({ lat: country.coords.lat, lng: country.coords.lng, altitude: 1.5 });
    
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

    let matchId = ALIASES[val];
    let matchedCountry = null;

    if (matchId) {
        matchedCountry = subset.find(c => c.id === matchId && !gameState.foundIds.has(c.id));
    } else {
        matchedCountry = subset.find(c => !gameState.foundIds.has(c.id) && normalizeString(c.frName) === val);
    }

    if (matchedCountry) {
        handleSuccess(matchedCountry);
        setInputValue('');
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim().length > 2 && gameState.targetCountry) {
          const val = normalizeString(inputValue);
          let guessedCountry = allCountries.find(c => normalizeString(c.frName) === val || c.id === ALIASES[val]);
          
          if (guessedCountry && guessedCountry.id !== gameState.targetCountry.id) {
             const { distance, arrow } = getDistanceAndBearing(guessedCountry, gameState.targetCountry);
             addFloater(`${guessedCountry.frName}: ${distance}km ${arrow}`, undefined, window.innerHeight / 2 - 150, '#fbbf24');
             audioService.playRadarPing();
             setInputValue('');
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
            const x = window.innerWidth / 2;
            const y = window.innerHeight / 2;
            addFloater(`Non, c'est ${country.frName}`, x, y - 100, '#ef4444');
        }
    } else {
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
    const regionMap: Record<string, string> = {
      'Africa': 'Afrique',
      'Americas': 'Amériques',
      'Asia': 'Asie',
      'Europe': 'Europe',
      'Oceania': 'Océanie',
      'Antarctic': 'Antarctique'
    };

    foundList.forEach(country => {
       const reg = regionMap[country.region] || country.region;
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
    <div className="w-full h-[100dvh] bg-gradient-to-b from-slate-950 to-[#050a14] text-white overflow-hidden relative" ref={containerRef}>
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Globe3D 
          countries={allCountries} 
          foundIds={gameState.foundIds}
          gameStatus={gameState.status}
          onPolygonClick={handlePolygonClick}
          width={window.innerWidth}
          height={window.innerHeight}
          targetLocation={targetLocation}
          rings={rings}
        />
      </div>

      {/* Loading Error */}
      {loadingError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90">
              <div className="text-center max-w-md">
                  <div className="text-red-500 text-5xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold text-white mb-2">Erreur de Chargement</h2>
                  <p className="text-slate-400 mb-6">{loadingError}</p>
                  <button onClick={() => window.location.reload()} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl">Réessayer</button>
              </div>
          </div>
      )}

      {/* HUD Layer */}
      {!loadingError && (
          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 pb-safe safe-area">
            
            {/* Top Bar */}
            <div className="flex justify-between items-start">
                {/* Stats Card */}
                <div 
                    onClick={() => setSidebarOpen(true)}
                    className="glass-panel px-5 py-3 rounded-2xl flex flex-col gap-1 min-w-[160px] pointer-events-auto cursor-pointer hover:bg-white/10 transition-colors group shadow-lg"
                >
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-white transition-colors">
                        <span>Niveau {userStats.level}</span>
                        <span className={`font-mono transition-colors duration-300 ${penaltyFlash ? 'text-orange-500 scale-110' : 'text-white'}`}>
                            {formatTime(gameState.timer)}
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                        <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-500"
                            style={{ width: `${(userStats.xp / (userStats.level * 100)) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                        <span className="text-2xl font-black">{gameState.score}<span className="text-sm text-slate-500">/{gameState.total}</span></span>
                    </div>
                </div>

                {/* Top Right Controls */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className={`transition-all duration-300 transform ${userStats.combo > 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                        <div className="text-right mr-2">
                            <div className="text-3xl font-black text-pink-500 leading-none drop-shadow-glow">x{userStats.combo}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest">Combo</div>
                        </div>
                    </div>

                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all relative">
                        <ListIcon size={20} />
                        {foundList.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></span>}
                    </button>
                    <button onClick={handleMenuReturn} className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                        <Home size={20} />
                    </button>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex flex-col items-center gap-4 pointer-events-auto w-full max-w-lg mx-auto mb-safe">
                
                {/* Click Mode Prompt */}
                {gameState.status === 'playing' && gameState.mode === 'click' && gameState.targetCountry && (
                    <div className="glass-panel px-8 py-4 rounded-full animate-in slide-in-from-bottom-4 flex items-center gap-4 shadow-2xl border border-cyan-500/30 backdrop-blur-xl">
                        <span className="text-slate-400 text-xs uppercase font-bold tracking-widest">Cible</span>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                {gameState.targetCountry.frName}
                            </span>
                            {gameState.targetCountry.flag && <img src={gameState.targetCountry.flag} className="h-6 w-auto rounded shadow-sm" alt="flag hint" />}
                        </div>
                    </div>
                )}

                {/* Input & Hints */}
                {gameState.status === 'playing' && (
                    <div className="w-full flex gap-3 items-stretch">
                        {gameState.mode === 'type' && (
                            <div className="flex-1 glass-panel rounded-2xl p-1 pl-5 flex items-center focus-within:ring-2 ring-cyan-400/50 transition-all shadow-2xl relative">
                                <input 
                                    ref={inputRef}
                                    type="text" 
                                    value={inputValue}
                                    onChange={handleTyping}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder="Nom du pays..." 
                                    className="w-full bg-transparent border-none outline-none text-white font-bold h-12 placeholder:text-slate-500 placeholder:font-normal text-lg"
                                    autoFocus
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                />
                                {/* Clear Button */}
                                {inputValue && (
                                    <button 
                                        onClick={() => { setInputValue(''); inputRef.current?.focus(); }}
                                        className="p-2 text-slate-500 hover:text-white transition-colors mr-2"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                                <div className="absolute right-4 text-[10px] text-slate-500 font-mono hidden sm:block pointer-events-none border border-white/10 px-2 py-1 rounded">
                                    {inputValue.length > 0 ? "ENTRÉE : Radar" : "Saisie"}
                                </div>
                            </div>
                        )}

                        {/* Hint Button */}
                        <button 
                            onClick={() => setShowHintModal(true)}
                            className="w-14 glass-panel rounded-2xl flex items-center justify-center text-amber-500 hover:bg-amber-500/10 border-amber-500/30 active:scale-95 transition-all shadow-lg"
                            title="Indices"
                        >
                            <Lightbulb size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </div>
          </div>
      )}

      {/* Sidebar List */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-slate-950/95 backdrop-blur-xl border-l border-white/10 transform transition-transform duration-300 z-40 flex flex-col p-6 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} shadow-2xl`}>
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <div>
                <h3 className="font-bold text-xl text-white">Exploration</h3>
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">{foundList.length} pays découverts</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar">
            {foundList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center italic px-6">
                    <div className="mb-4 text-5xl opacity-20 grayscale">🌍</div>
                    <p className="text-sm">Votre carnet de voyage est vide.<br/>Partez à l'aventure !</p>
                </div>
            ) : (
                Object.keys(groupedFoundCountries).sort().map(region => (
                    <div key={region} className="mb-6 animate-in fade-in slide-in-from-right-4">
                        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-md z-10 py-2 px-1 mb-2 border-b border-white/5 flex items-center gap-2">
                            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">{region}</span>
                            <span className="text-[10px] bg-white/10 px-1.5 rounded text-slate-400 font-mono">{groupedFoundCountries[region].length}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {groupedFoundCountries[region].sort((a, b) => a.frName.localeCompare(b.frName)).map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => setTargetLocation({ lat: c.coords.lat, lng: c.coords.lng, altitude: 1.5 })} 
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-400/50 hover:bg-white/10 transition-all cursor-pointer active:scale-98 group"
                                >
                                    <img src={c.flag} alt={c.name} className="w-8 h-auto rounded shadow-sm group-hover:scale-110 transition-transform" loading="lazy" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-slate-200 truncate group-hover:text-white">{c.frName}</div>
                                    </div>
                                    <CheckCircle2 size={14} className="text-emerald-500/50" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Modals */}
      {/* SHOW START MODAL IF LOADING OR MENU */}
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

      {/* Effects */}
      <FloatingText floaters={floaters} onRemove={(id) => setFloaters(prev => prev.filter(f => f.id !== id))} />
      
      <style>{`
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 
            10%, 90% { transform: translate3d(-1px, 0, 0); } 
            20%, 80% { transform: translate3d(2px, 0, 0); } 
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 
            40%, 60% { transform: translate3d(4px, 0, 0); } 
        }
        .drop-shadow-glow { filter: drop-shadow(0 0 8px rgba(247, 37, 133, 0.5)); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        /* Safe area spacing for mobile */
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .mb-safe { margin-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
}

export default App;