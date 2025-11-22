
import React from 'react';
import { GameMode, Region } from '../types';
import { Share2, RefreshCw, X, Play, Map, Target } from 'lucide-react';

/* --- Start Modal --- */
interface StartModalProps {
  onStart: (region: Region, mode: GameMode) => void;
  isLoading: boolean;
}

export const StartModal: React.FC<StartModalProps> = ({ onStart, isLoading }) => {
  const [region, setRegion] = React.useState<Region>('World');
  const [mode, setMode] = React.useState<GameMode>('type');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="w-full max-w-md p-6 md:p-8 glass-panel rounded-[2rem] transform transition-all border border-white/10 relative overflow-hidden group">
        
        {/* Décoration d'arrière-plan */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/30 transition-colors duration-1000"></div>
        
        <div className="text-center mb-8 relative">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-1 tracking-tighter drop-shadow-[0_0_15px_rgba(76,201,240,0.5)]">
              WORLDLE
            </h2>
            <div className="inline-block px-3 py-1 rounded-full border border-pink-500/50 bg-pink-500/10">
                <div className="text-[10px] font-black tracking-[0.3em] text-pink-400 uppercase shadow-pink-500/50">Arcade 3D</div>
            </div>
        </div>

        <div className="space-y-6 mb-8 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Zone de mission</label>
            <div className="relative">
                <select 
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="w-full bg-slate-900/60 text-white rounded-2xl border border-white/10 p-4 outline-none focus:border-cyan-400 transition-all appearance-none font-bold text-lg shadow-inner cursor-pointer hover:bg-white/5"
                >
                <option value="World">🌍 Monde Entier</option>
                <option value="Europe">🏰 Europe</option>
                <option value="Asia">⛩️ Asie</option>
                <option value="Africa">🦁 Afrique</option>
                <option value="Americas">🌎 Amériques</option>
                <option value="Oceania">🏝️ Océanie</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400">▼</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Protocole</label>
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => setMode('type')}
                    className={`p-4 rounded-2xl border transition-all font-bold text-sm flex flex-col items-center gap-2 ${mode === 'type' ? 'border-cyan-400 bg-cyan-400/10 text-white shadow-[0_0_20px_rgba(76,201,240,0.2)]' : 'border-white/5 bg-slate-900/50 text-slate-500 hover:bg-white/5'}`}
                >
                    <span className="text-2xl">⌨️</span>
                    <span className="uppercase tracking-wider text-xs">Clavier</span>
                </button>
                <button 
                    onClick={() => setMode('click')}
                    className={`p-4 rounded-2xl border transition-all font-bold text-sm flex flex-col items-center gap-2 ${mode === 'click' ? 'border-cyan-400 bg-cyan-400/10 text-white shadow-[0_0_20px_rgba(76,201,240,0.2)]' : 'border-white/5 bg-slate-900/50 text-slate-500 hover:bg-white/5'}`}
                >
                    <span className="text-2xl">👆</span>
                    <span className="uppercase tracking-wider text-xs">Tactile</span>
                </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => onStart(region, mode)}
          disabled={isLoading}
          className={`w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest transform transition-all active:scale-[0.98] group relative overflow-hidden ${
            isLoading 
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
              : 'bg-white text-black hover:bg-cyan-50 shadow-[0_0_30px_rgba(255,255,255,0.3)]'
          }`}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? 'Chargement...' : <><Play size={24} fill="currentColor" /> START</>}
            </span>
        </button>
      </div>
    </div>
  );
};

/* --- End Modal --- */
interface EndModalProps {
  score: number;
  total: number;
  time: string;
  xp: number;
  onReplay: () => void;
  onMenu: () => void;
}

export const EndModal: React.FC<EndModalProps> = ({ score, total, time, xp, onReplay, onMenu }) => {
  const isWin = score === total;
  const percent = Math.round((score / total) * 100);

  const handleShare = () => {
    const text = `🌍 Worldle Arcade 3D\nScore: ${score}/${total} (${percent}%)\nTemps: ${time}\nXP: +${xp}`;
    navigator.clipboard.writeText(text);
    alert('Copié !');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in-95 duration-300">
      <div className="w-full max-w-sm p-8 glass-panel rounded-[2.5rem] text-center border border-white/10 relative overflow-hidden">
        {/* Glow effects */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 bg-gradient-to-b ${isWin ? 'from-emerald-500/30' : 'from-red-500/30'} to-transparent blur-3xl pointer-events-none`}></div>
        
        <div className="relative z-10">
            <h2 className="text-4xl font-black text-white mb-1 uppercase italic tracking-tighter">{isWin ? 'Mission Accomplie' : 'Terminé'}</h2>
            <div className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-[0.2em]">{isWin ? 'Performance Légendaire' : 'Bien joué !'}</div>
            
            <div className="mb-8 relative inline-block">
                <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 drop-shadow-2xl">
                    {percent}<span className="text-4xl align-top opacity-50">%</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Pays</div>
                    <div className="text-2xl font-bold text-white">{score}<span className="text-slate-600 text-base">/{total}</span></div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Chrono</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono">{time}</div>
                </div>
            </div>

            <div className="space-y-3">
                <button onClick={handleShare} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
                    <Share2 size={18} /> Partager Résultat
                </button>
                <div className="flex gap-3">
                    <button onClick={onMenu} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all active:scale-95">
                        MENU
                    </button>
                    <button onClick={onReplay} className="flex-[2] py-4 bg-white text-black hover:bg-cyan-50 font-black rounded-2xl uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <RefreshCw size={20} /> REJOUER
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

/* --- Hint Modal --- */
interface HintModalProps {
  onSelect: (type: 'capital' | 'flag' | 'both') => void;
  onCancel: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({ onSelect, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm p-6 glass-panel rounded-3xl relative border border-white/10">
        <button onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={18} /></button>
        
        <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Target size={20} />
            </div>
            <div>
                <h3 className="text-lg font-black text-white uppercase">Indices</h3>
                <p className="text-amber-500/80 text-[10px] font-bold uppercase tracking-wider">Coût en temps ajouté</p>
            </div>
        </div>

        <div className="space-y-3">
          {[
            { id: 'capital', label: 'Révéler Capitale', icon: '🏙️', cost: '+20s' },
            { id: 'flag', label: 'Révéler Drapeau', icon: '🏳️', cost: '+20s' },
            { id: 'both', label: 'Pack Renseignement', icon: '💎', cost: '+40s' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id as any)}
              className="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-cyan-400/50 hover:bg-cyan-900/10 transition-all group active:scale-98"
            >
              <div className="flex items-center gap-3">
                  <span className="text-2xl filter grayscale group-hover:grayscale-0 transition-all">{opt.icon}</span>
                  <span className="font-bold text-slate-300 group-hover:text-white">{opt.label}</span>
              </div>
              <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded-md text-xs font-black border border-red-500/10">{opt.cost}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* --- Reveal Modal --- */
interface RevealModalProps {
  data: { capital?: string; flag?: string };
  onClose: () => void;
}

export const RevealModal: React.FC<RevealModalProps> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95">
      <div className="w-full max-w-xs p-8 glass-panel rounded-3xl text-center border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mb-4">
            <Target size={24} />
        </div>
        <h3 className="text-sm font-black text-amber-500 uppercase tracking-[0.2em] mb-8">Données Tactiques</h3>
        
        <div className="space-y-8 mb-8">
            {data.capital && (
                <div className="relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a1020] px-2 text-[9px] text-slate-500 uppercase font-black tracking-widest">Capitale</div>
                    <div className="text-2xl font-black text-white border border-white/10 rounded-xl py-4 bg-white/5">{data.capital}</div>
                </div>
            )}
            {data.flag && (
                <div className="relative">
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a1020] px-2 text-[9px] text-slate-500 uppercase font-black tracking-widest">Drapeau</div>
                     <div className="inline-block p-3 bg-white/5 rounded-xl border border-white/10">
                        <img src={data.flag} alt="Flag" className="h-24 w-auto rounded-lg shadow-lg" />
                     </div>
                </div>
            )}
        </div>
        <button onClick={onClose} className="w-full py-3 bg-white text-black font-bold rounded-xl transition-colors hover:bg-slate-200 active:scale-95">
          Fermer
        </button>
      </div>
    </div>
  );
};
