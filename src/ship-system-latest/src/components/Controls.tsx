import React, { useState, useEffect } from 'react';
import { Settings2, RefreshCw, Gamepad2, Cpu, MapPin, Navigation } from 'lucide-react';
import { toLocal } from './Map';

export default function Controls({ 
  params, 
  mode,
  onParamChange, 
  onReset,
  onModeChange,
  onManualControl,
  onSetTarget
}: { 
  params: any, 
  mode: 'auto' | 'manual',
  onParamChange: (p: any) => void, 
  onReset: () => void,
  onModeChange: (mode: 'auto' | 'manual') => void,
  onManualControl: (delta_c: number) => void,
  onSetTarget: (x: number, y: number) => void
}) {
  const [manualRudder, setManualRudder] = useState(0);
  const [targetLat, setTargetLat] = useState('');
  const [targetLng, setTargetLng] = useState('');

  // Knots conversion: 1 m/s = 1.94384 knots
  const knots = params.U * 1.94384;

  // Reset manual rudder when switching to auto
  useEffect(() => {
    if (mode === 'auto') {
      setManualRudder(0);
    }
  }, [mode]);

  const handleRudderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setManualRudder(val);
    // Invert the sign: Right rudder (positive val) should send negative delta_c to turn right
    onManualControl(-val * Math.PI / 180);
  };

  const handleSpeedChange = (value: string) => {
    const valKnots = parseFloat(value);
    if (!isNaN(valKnots)) {
      // Convert knots back to m/s for the backend
      onParamChange({ U: valKnots / 1.94384 });
    }
  };

  const handleChange = (key: string, value: string) => {
    const val = parseFloat(value);
    if (!isNaN(val)) {
      onParamChange({ [key]: val });
    }
  };

  const handleTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(targetLat);
    const lng = parseFloat(targetLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const local = toLocal(lat, lng);
      onSetTarget(local.x, local.y);
      setTargetLat('');
      setTargetLng('');
    }
  };

  return (
    <div className="backdrop-blur-3xl bg-slate-900/60 border border-white/20 rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between gap-4 w-full max-w-6xl mx-auto">
      {/* Left: Mode Switch */}
      <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner shrink-0">
        <button
          onClick={() => onModeChange('auto')}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
            mode === 'auto' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          自动
        </button>
        <button
          onClick={() => onModeChange('manual')}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
            mode === 'manual' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          手动
        </button>
      </div>

      <div className="h-12 w-px bg-white/10"></div>

      {/* Center: Contextual Controls */}
      <div className="flex-1">
        {mode === 'manual' ? (
          <div className="flex items-center gap-8">
            <div className="flex-1 relative h-4 bg-black/60 rounded-full border border-white/10 overflow-hidden shadow-inner">
              {/* Rudder Fill Indicators - More vibrant colors */}
              <div 
                className="absolute top-0 bottom-0 right-1/2 bg-rose-500/60 transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                style={{ width: manualRudder < 0 ? `${Math.abs(manualRudder) / 70 * 100}%` : '0%' }}
              />
              <div 
                className="absolute top-0 bottom-0 left-1/2 bg-emerald-500/60 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                style={{ width: manualRudder > 0 ? `${manualRudder / 70 * 100}%` : '0%' }}
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/40 z-10" />
              
              <div 
                className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-none transition-all border-2 border-white ${manualRudder > 0 ? 'bg-emerald-400 scale-110' : manualRudder < 0 ? 'bg-rose-400 scale-110' : 'bg-white'}`}
                style={{ left: `calc(${((manualRudder + 35) / 70) * 100}% - 12px)`, zIndex: 20 }}
              />
              <input 
                type="range" 
                min="-35" 
                max="35" 
                step="0.5"
                value={manualRudder}
                onChange={handleRudderChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
              />
            </div>
            <div className="min-w-[110px] text-center">
              <span className={`font-mono font-black text-base px-5 py-2 rounded-2xl shadow-xl border border-white/10 ${manualRudder === 0 ? 'text-slate-400 bg-white/5' : manualRudder > 0 ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' : 'text-rose-400 bg-rose-500/20 border-rose-500/30'}`}>
                {manualRudder > 0 ? `右 ${manualRudder.toFixed(1)}°` : manualRudder < 0 ? `左 ${Math.abs(manualRudder).toFixed(1)}°` : '0.0°'}
              </span>
            </div>
            <button 
              onClick={() => { setManualRudder(0); onManualControl(0); }}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all shadow-lg active:scale-95"
              title="回正"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleTargetSubmit} className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase">Lat</span>
                <input
                  type="number" step="any" required value={targetLat}
                  onChange={(e) => setTargetLat(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white font-black focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase">Lng</span>
                <input
                  type="number" step="any" required value={targetLng}
                  onChange={(e) => setTargetLng(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white font-black focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Navigation className="w-3.5 h-3.5" />
              设定航点
            </button>
          </form>
        )}
      </div>

      <div className="h-12 w-px bg-white/10"></div>

      {/* Right: Quick Params & Reset */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
          <span className="text-[9px] font-black text-slate-500 uppercase">航速</span>
          <input 
            type="number" step="0.1" value={knots.toFixed(1)} 
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="w-12 bg-transparent text-base text-white font-black focus:outline-none font-mono"
          />
          <span className="text-[9px] text-slate-500 font-black uppercase">kn</span>
        </div>
        <button
          onClick={onReset}
          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 transition-all shadow-lg active:scale-95 flex items-center justify-center"
          title="重置模拟"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ParamInput({ label, value, onChange, step }: { label: string, value: number, onChange: (v: string) => void, step: string }) {
  return (
    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/20 transition-colors">
      <label className="block text-[11px] font-medium text-slate-400 mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
      />
    </div>
  );
}
