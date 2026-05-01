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

      {/* Glass UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col md:flex-row justify-between p-6 gap-6">
        
        {/* Left/Top Header Area */}
        <div className="flex flex-col gap-6 items-start">
          <header className="pointer-events-auto backdrop-blur-2xl bg-black/40 border border-white/10 shadow-2xl rounded-3xl p-5 flex items-center gap-4 transition-all hover:bg-black/50">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Ship className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">船舶自主导航系统</h1>
              <p className="text-sm text-slate-300 font-medium tracking-wide">Liquid Glass Edition</p>
            </div>
          </header>
          
          {/* Map Hint */}
          <div className="pointer-events-auto backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-slate-200 shadow-xl flex items-center gap-3">
            <Navigation className="w-5 h-5 text-blue-400" />
            <span className="font-medium">
              {state.mode === 'auto' ? '在海图上点击以设定目标航点' : '手动模式下无法设定航点'}
            </span>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="pointer-events-auto w-full md:w-[420px] flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-20 md:pb-0 h-full">
          <Telemetry state={state} />
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
  );
}
