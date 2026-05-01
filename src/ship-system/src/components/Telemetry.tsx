import React from 'react';
import { Activity, Compass, Wind, Gauge, AlertTriangle, MapPin, Cpu } from 'lucide-react';
import { toGeo } from './Map';

export default function Telemetry({ state }: { state: any }) {
  const { x, y, psi, r, delta, delta_c, U, collision_warning, ddpg_active } = state;
  const [lat, lng] = toGeo(x, y);

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
    <div className={`backdrop-blur-2xl bg-black/40 border ${collision_warning ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/10'} rounded-[2rem] p-6 shadow-2xl transition-all duration-500`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white tracking-wide">实时遥测数据</h2>
        </div>
      </div>

      {/* Status Banners */}
      {(ddpg_active || collision_warning) && (
        <div className="flex flex-col gap-3 mb-5">
          {collision_warning && (
            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/40 rounded-2xl p-3 shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-md transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-xl animate-pulse border border-red-500/30">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="text-red-400 font-bold text-sm tracking-widest uppercase">碰撞预警 / Collision Warning</div>
                  <div className="text-red-300/70 text-xs mt-0.5">船舶正在接近浅水区或陆地边界</div>
                </div>
              </div>
            </div>
          )}
          {ddpg_active && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-md transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl relative border border-emerald-500/30">
                  <div className="absolute inset-0 rounded-xl border border-emerald-400/50 animate-ping opacity-50"></div>
                  <Cpu className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-emerald-400 font-bold text-sm tracking-widest uppercase">DDPG Agent Active</div>
                  <div className="text-emerald-300/70 text-xs mt-0.5">AI 正在接管控制以规避障碍物</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5 font-medium"><Compass className="w-3.5 h-3.5"/> 真航向 (TH)</div>
          <div className="text-2xl font-mono text-white font-light tracking-tight">{formatAngle(psi)}</div>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5 font-medium"><Wind className="w-3.5 h-3.5"/> 偏航角速度 (r)</div>
          <div className="text-2xl font-mono text-white font-light tracking-tight">{(r * 180 / Math.PI).toFixed(2)}<span className="text-sm text-slate-500 ml-1">°/s</span></div>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5 font-medium"><Gauge className="w-3.5 h-3.5"/> 实际舵角 (δ)</div>
          <div className="text-2xl font-mono text-sky-400 font-light tracking-tight">{formatRudder(delta)}</div>
          <div className="text-[11px] text-slate-400 mt-2 font-medium bg-black/20 px-2 py-1 rounded-md inline-block">指令: {formatRudder(delta_c)}</div>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5 font-medium"><MapPin className="w-3.5 h-3.5"/> 当前坐标 (Lat, Lng)</div>
          <div className="text-sm font-mono text-slate-200 mt-1">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-medium bg-black/20 px-2 py-1 rounded-md inline-block">
            航速: {knots.toFixed(1)} kn
          </div>
        </div>
      </div>
    </div>
  );
}
