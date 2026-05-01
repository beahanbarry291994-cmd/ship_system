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
    <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-[2rem] p-6 shadow-2xl flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
            <Settings2 className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white tracking-wide">控制参数与模式</h2>
        </div>
        <button
          onClick={onReset}
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all shadow-sm"
          title="重置模拟"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-8 flex-1">
        {/* Mode Switch */}
        <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/10 shadow-inner">
          <button
            onClick={() => onModeChange('auto')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
              mode === 'auto' ? 'bg-white/20 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            自动导航
          </button>
          <button
            onClick={() => onModeChange('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
              mode === 'manual' ? 'bg-white/20 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            手动遥控
          </button>
        </div>

        {mode === 'manual' && (
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
            <div className="flex justify-between text-xs text-slate-400 mb-4 font-medium">
              <span>左满舵</span>
              <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${manualRudder === 0 ? 'text-slate-300 bg-white/10' : manualRudder > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                {manualRudder > 0 ? `右 ${manualRudder.toFixed(1)}°` : manualRudder < 0 ? `左 ${Math.abs(manualRudder).toFixed(1)}°` : '0.0°'}
              </span>
              <span>右满舵</span>
            </div>
            <div className="relative w-full h-2 bg-black/50 rounded-lg mt-2 mb-2">
              {/* Center fill indicator */}
              {manualRudder > 0 && (
                <div 
                  className="absolute h-full bg-emerald-500 rounded-r-lg" 
                  style={{ left: '50%', width: `${(manualRudder / 35) * 50}%` }}
                />
              )}
              {manualRudder < 0 && (
                <div 
                  className="absolute h-full bg-rose-500 rounded-l-lg" 
                  style={{ right: '50%', width: `${(-manualRudder / 35) * 50}%` }}
                />
              )}
              {/* Custom Thumb */}
              <div 
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none transition-colors ${manualRudder > 0 ? 'bg-emerald-400' : manualRudder < 0 ? 'bg-rose-400' : 'bg-slate-300'}`}
                style={{ left: `calc(${((manualRudder + 35) / 70) * 100}% - 8px)`, zIndex: 5 }}
              />
              {/* The actual input */}
              <input 
                type="range" 
                min="-35" 
                max="35" 
                step="0.5"
                value={manualRudder}
                onChange={handleRudderChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ zIndex: 10 }}
              />
            </div>
            <div className="flex justify-center mt-5">
              <button 
                onClick={() => { setManualRudder(0); onManualControl(0); }}
                className="text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 py-2 rounded-xl transition-all shadow-sm"
              >
                回正 (0°)
              </button>
            </div>
          </div>
        )}

        {mode === 'auto' && (
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              手动设定航点 (Lat, Lng)
            </h3>
            <form onSubmit={handleTargetSubmit} className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">Lat</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={targetLat}
                    onChange={(e) => setTargetLat(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">Lng</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={targetLng}
                    onChange={(e) => setTargetLng(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600/80 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                设定并导航
              </button>
            </form>
          </div>
        )}

        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500/50"></span>
            Nomoto 模型 (二阶)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ParamInput label="增益系数 (K)" value={params.K} onChange={(v) => handleChange('K', v)} step="0.01" />
            <ParamInput label="时间常数 T1" value={params.T1} onChange={(v) => handleChange('T1', v)} step="1" />
            <ParamInput label="时间常数 T2" value={params.T2} onChange={(v) => handleChange('T2', v)} step="0.1" />
            <ParamInput label="时间常数 T3" value={params.T3} onChange={(v) => handleChange('T3', v)} step="0.1" />
          </div>
        </div>

        <div className="h-px bg-white/10 w-full"></div>

        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500/50"></span>
            导航与 PID 控制
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ParamInput label="航速 (U)" value={params.U} onChange={(v) => handleChange('U', v)} step="0.5" />
            <div className="col-span-1"></div>
            <ParamInput label="比例增益 (Kp)" value={params.Kp} onChange={(v) => handleChange('Kp', v)} step="0.1" />
            <ParamInput label="微分增益 (Kd)" value={params.Kd} onChange={(v) => handleChange('Kd', v)} step="0.5" />
          </div>
        </div>
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
