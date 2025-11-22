import React from 'react';
import { GameMode, Region } from '../types';
import { COLORS } from '../constants';
import { Volume2, VolumeX, Share2, RefreshCw, Play, Home } from 'lucide-react';

/* --- Start Modal --- */
interface StartModalProps {
  onStart: (region: Region, mode: GameMode) => void;
  isLoading: boolean;
}

export const StartModal: React.FC<StartModalProps> = ({ onStart, isLoading }) => {
  const [region, setRegion] = React.useState<Region>('World');
  const [mode, setMode] = React.useState<GameMode>('type');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl transform transition-all scale-100">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-2">
          Worldle Arcade
        </h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Le défi géographique ultime en 3D.<br />Rapidité, précision et exploration.
        </p>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Région</label>
            <select 
              value={region}
              onChange={(e) => setRegion(e.target.value as Region)}
              className="w-full bg-slate-900 text-white rounded-xl border border-slate-700 p-4 outline-none focus:border-cyan-400 transition-colors appearance-none font-bold"
            >
              <option value="World">Monde Entier 🌍</option>
              <option value="Europe">Europe 🏰</option>
              <option value="Asia">Asie ⛩️</option>
              <option value="Africa">Afrique 🦁</option>
              <option value="Americas">Amériques 🌎</option>
              <option value="Oceania">Océanie 🏝️</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mode de Jeu</label>
            <select 
              value={mode}
              onChange={(e) => setMode(e.target.value as GameMode)}
              className="w-full bg-slate-900 text-white rounded-xl border border-slate-700 p-4 outline-none focus:border-cyan-400 transition-colors appearance-none font-bold"
            >
              <option value="type">Saisie (Clavier) ⌨️</option>
              <option value="click">Localisation (Clic) 🖱️</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => onStart(region, mode)}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg shadow-cyan-500/20 transform transition-all active:scale-95 ${
            isLoading 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:brightness-110'
          }`}
        >
          {isLoading ? 'Chargement...' : 'Lancer l\'Aventure'}
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

  const handleShare = () => {
    const text = `🌍 Worldle Arcade 3D\n🏆 Score: ${score}/${total}\n⏱️ Temps: ${time}\n✨ XP: +${xp}`;
    navigator.clipboard.writeText(text);
    alert('Score copié dans le presse-papier !');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl text-center">
        <h2 className="text-3xl font-black text-white mb-2">{isWin ? 'Mission Accomplie' : 'Partie Terminée'}</h2>
        <div className="text-7xl my-4 animate-bounce">{isWin ? '🏆' : '🏁'}</div>
        <p className="text-slate-400 mb-6">{isWin ? 'Tous les pays ont été localisés.' : `Vous avez trouvé ${score} pays sur ${total}.`}</p>

        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 mb-6">
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">Temps</div>
            <div className="text-2xl font-mono font-black text-white">{time}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">XP Gagné</div>
            <div className="text-2xl font-black text-emerald-400">+{xp}</div>
          </div>
        </div>

        <div className="space-y-3">
            <button onClick={handleShare} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                <Share2 size={18} /> Partager Score
            </button>
            <button onClick={onReplay} className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-black rounded-xl uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
                <RefreshCw size={20} /> Rejouer
            </button>
            <button onClick={onMenu} className="w-full py-3 text-slate-400 hover:text-white font-bold transition-colors">
                Retour au Menu
            </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm p-6 glass-panel rounded-3xl">
        <h3 className="text-2xl font-bold text-white mb-1">Centre d'Indices</h3>
        <p className="text-slate-400 text-sm mb-6">Échangez du temps contre des infos.</p>

        <div className="space-y-3 mb-6">
          {[
            { id: 'capital', label: '🏙️ Capitale', cost: '+20s' },
            { id: 'flag', label: '🏳️ Drapeau', cost: '+20s' },
            { id: 'both', label: '✨ Les Deux', cost: '+40s' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id as any)}
              className="w-full flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500 transition-all group"
            >
              <span className="font-bold text-slate-200">{opt.label}</span>
              <span className="bg-pink-500/20 text-pink-500 px-2 py-1 rounded-lg text-xs font-black group-hover:bg-pink-500 group-hover:text-white transition-colors">{opt.cost}</span>
            </button>
          ))}
        </div>

        <button onClick={onCancel} className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl">
          Annuler
        </button>
      </div>
    </div>
  );
};

/* --- Reveal Modal (Showing the hint) --- */
interface RevealModalProps {
  data: { capital?: string; flag?: string };
  onClose: () => void;
}

export const RevealModal: React.FC<RevealModalProps> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-sm p-6 glass-panel rounded-3xl text-center">
        <h3 className="text-xl font-black text-amber-500 mb-4">Renseignement</h3>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-6 space-y-4">
            {data.capital && (
                <div>
                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Capitale</div>
                    <div className="text-2xl font-bold text-cyan-400">{data.capital}</div>
                </div>
            )}
            {data.flag && (
                <div>
                     <div className="text-xs text-slate-400 uppercase font-bold mb-2">Drapeau</div>
                     <img src={data.flag} alt="Flag" className="h-24 mx-auto rounded-lg shadow-lg border border-white/10" />
                </div>
            )}
        </div>
        <button onClick={onClose} className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-xl shadow-lg">
          Compris !
        </button>
      </div>
    </div>
  );
};