import React from 'react';
import { Activity, Compass, Wind, Gauge, AlertTriangle, MapPin, Cpu } from 'lucide-react';
import { toGeo } from './Map';

export default function Telemetry({ 
  x, y, psi, r, delta, delta_c, U, collision_warning, ddpg_active 
}: { 
  x: number, y: number, psi: number, r: number, delta: number, 
  delta_c: number, U: number, collision_warning: boolean, ddpg_active: boolean 
}) {
  const [lat, lng] = toGeo(x, y);

  // Simulated Engine Data
  const engineRpm = 1200 + Math.sin(Date.now() / 1000) * 50;
  const fuelLevel = 85.4 - (Date.now() % 1000000) / 100000;

  const formatAngle = (rad: number) => {
    let deg = rad * 180 / Math.PI;
    let trueHeading = (450 - deg) % 360;
    return trueHeading.toFixed(1) + '°';
  };

  const formatRudder = (rad: number) => {
    const deg = rad * 180 / Math.PI;
    if (Math.abs(deg) < 0.1) return '0.0°';
    return deg > 0 ? `左 ${deg.toFixed(1)}°` : `右 ${Math.abs(deg).toFixed(1)}°`;
  };

  const knots = U * 1.94384;

  return (
    <div className="flex flex-col gap-4 max-w-[320px]">
      {/* Status Banners */}
      {(ddpg_active || collision_warning) && (
        <div className="flex flex-col gap-2">
          {collision_warning && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-3 shadow-lg backdrop-blur-xl animate-pulse">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div className="text-red-400 font-bold text-xs tracking-widest uppercase">碰撞预警</div>
              </div>
            </div>
          )}
          {ddpg_active && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-3 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <div className="text-emerald-400 font-bold text-xs tracking-widest uppercase">DDPG 避障中</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Telemetry Card */}
      <div className={`backdrop-blur-3xl bg-slate-900/60 border ${collision_warning ? 'border-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'border-white/20'} rounded-[2rem] p-6 shadow-2xl transition-all duration-500`}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          <div className="col-span-2 flex items-center justify-between mb-2">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">实时遥测 / Telemetry</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[11px] text-emerald-500 font-black uppercase tracking-widest">Live</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-300 mb-1.5 flex items-center gap-1.5 font-black uppercase tracking-wider"><Compass className="w-3.5 h-3.5 text-blue-400"/> 航向</div>
            <div className="text-3xl font-mono text-white font-black tracking-tighter drop-shadow-md">{formatAngle(psi)}</div>
          </div>
          
          <div>
            <div className="text-[10px] text-slate-300 mb-1.5 flex items-center gap-1.5 font-black uppercase tracking-wider"><Gauge className="w-3.5 h-3.5 text-blue-400"/> 航速</div>
            <div className="text-3xl font-mono text-white font-black tracking-tighter drop-shadow-md">{knots.toFixed(1)}<span className="text-xs text-slate-500 ml-1 uppercase font-bold">kn</span></div>
          </div>

          <div>
            <div className="text-[10px] text-slate-300 mb-1.5 flex items-center gap-1.5 font-black uppercase tracking-wider"><Wind className="w-3.5 h-3.5 text-blue-400"/> 舵角</div>
            <div className="text-lg font-mono text-sky-400 font-black drop-shadow-sm">{formatRudder(delta)}</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-300 mb-1.5 flex items-center gap-1.5 font-black uppercase tracking-wider"><Activity className="w-3.5 h-3.5 text-blue-400"/> 偏航率</div>
            <div className="text-lg font-mono text-white font-black drop-shadow-sm">{(r * 180 / Math.PI).toFixed(2)}<span className="text-[10px] text-slate-500 ml-1 font-bold">°/s</span></div>
          </div>

          <div className="col-span-2 h-px bg-white/10 my-1"></div>

          <div className="col-span-2">
            <div className="text-[10px] text-slate-300 mb-2.5 flex items-center gap-1.5 font-black uppercase tracking-wider"><MapPin className="w-3.5 h-3.5 text-blue-400"/> 坐标</div>
            <div className="text-sm font-mono text-white font-black bg-black/60 px-4 py-3 rounded-2xl border border-white/10 shadow-inner tracking-tight">
              {lat.toFixed(5)}N, {lng.toFixed(5)}W
            </div>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-4 mt-1">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 shadow-inner">
              <div className="text-[9px] text-slate-300 font-black uppercase mb-1 tracking-widest">Engine RPM</div>
              <div className="text-base font-mono text-white font-black">{engineRpm.toFixed(0)}</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 shadow-inner">
              <div className="text-[9px] text-slate-300 font-black uppercase mb-1 tracking-widest">Fuel Level</div>
              <div className="text-base font-mono text-white font-black">{fuelLevel.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
