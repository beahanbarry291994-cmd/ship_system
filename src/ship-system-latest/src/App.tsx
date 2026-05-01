/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Map from './components/Map';
import Controls from './components/Controls';
import Telemetry from './components/Telemetry';
import { Ship, Navigation } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<any>(null);
  const [obstacles, setObstacles] = useState<any[]>([]);
  const [buoys, setBuoys] = useState<any[]>([]);

  useEffect(() => {
    // Fetch static obstacles with retry
    const fetchObstacles = () => {
      fetch('/api/obstacles')
        .then(res => res.json())
        .then(data => {
          setObstacles(data.polygons);
          setBuoys(data.buoys);
        })
        .catch(err => {
          if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
            // Retry after a short delay if server is restarting
            setTimeout(fetchObstacles, 1000);
          } else {
            console.error('Failed to fetch obstacles:', err);
          }
        });
    };
    fetchObstacles();

    let isMounted = true;
    let timeoutId: any;

    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        if (isMounted) setState(data);
      } catch (err: any) {
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          // ignore
        } else if (err.message && err.message.includes('Network response')) {
          // ignore
        } else {
          console.error('State fetch error:', err);
        }
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(fetchState, 50); // 20Hz update for ultra-smooth UI
        }
      }
    };

    fetchState();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleMapClick = (x: number, y: number) => {
    fetch('/api/target', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y })
    }).catch(() => {});
  };

  const handleParamChange = (params: any) => {
    fetch('/api/params', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).catch(() => {});
  };

  const handleModeChange = (mode: 'auto' | 'manual') => {
    fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    }).catch(() => {});
  };

  const handleManualControl = (delta_c: number) => {
    fetch('/api/manual_control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta_c })
    }).catch(() => {});
  };

  const handleReset = () => {
    fetch('/api/reset', { method: 'POST' }).catch(() => {});
  };

  if (!state) return <div className="flex items-center justify-center h-screen w-screen bg-[#0a1128] text-white font-sans">加载模拟中...</div>;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a1128] font-sans text-slate-200">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <Map state={state} obstacles={obstacles} buoys={buoys} onMapClick={handleMapClick} />
      </div>

      {/* HUD Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
        
        {/* Top Section: Title & Compact Telemetry */}
        <div className="flex justify-between items-start">
          <header className="pointer-events-auto backdrop-blur-3xl bg-black/30 border border-white/20 shadow-2xl rounded-3xl p-4 flex items-center gap-4 transition-all hover:bg-black/40">
            <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              <Ship className="w-6 h-6 text-blue-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black text-white tracking-tight uppercase">船舶自主导航系统</h1>
              <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Liquid Glass HUD v2.0</p>
            </div>
          </header>

          <div className="pointer-events-auto flex flex-col gap-4 items-end">
            <Telemetry {...state} />
          </div>
        </div>

        {/* Bottom Section: Controls & Status */}
        <div className="flex flex-col gap-4 items-center">
          {/* Map Hint */}
          <div className="pointer-events-auto backdrop-blur-3xl bg-black/30 border border-white/20 rounded-full px-8 py-2.5 text-xs text-white font-black shadow-2xl flex items-center gap-3 uppercase tracking-widest">
            <Navigation className="w-4 h-4 text-blue-400" />
            <span>
              {state.mode === 'auto' ? '点击海图设定目标航点' : '手动模式控制中'}
            </span>
          </div>

          <div className="pointer-events-auto w-full max-w-6xl">
            <Controls 
              params={state.params} 
              mode={state.mode}
              onParamChange={handleParamChange} 
              onReset={handleReset} 
              onModeChange={handleModeChange}
              onManualControl={handleManualControl}
              onSetTarget={handleMapClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
