import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap, useMapEvents, Marker, Polygon, Circle } from 'react-leaflet';
import { Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Base coordinates (San Francisco Bay area)
const BASE_LAT = 37.8267;
const BASE_LNG = -122.4230;
const R = 6378137;

export function toGeo(x: number, y: number): [number, number] {
  const refX = BASE_LNG * R * Math.PI / 180;
  const refY = R * Math.log(Math.tan(Math.PI / 4 + BASE_LAT * Math.PI / 360));
  const absX = x + refX;
  const absY = y + refY;
  const lng = absX / (R * Math.PI / 180);
  const lat = (2 * Math.atan(Math.exp(absY / R)) - Math.PI / 2) * 180 / Math.PI;
  return [lat, lng];
}

export function toLocal(lat: number, lng: number): {x: number, y: number} {
  const x = lng * R * Math.PI / 180;
  const y = R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const refX = BASE_LNG * R * Math.PI / 180;
  const refY = R * Math.log(Math.tan(Math.PI / 4 + BASE_LAT * Math.PI / 360));
  return { x: x - refX, y: y - refY };
}

function LandLayer() {
  const map = useMap();
  const [features, setFeatures] = useState<any[]>([]);

  useEffect(() => {
    let timeout: any;
    const fetchLand = async () => {
      const zoom = map.getZoom();
      if (zoom < 12) {
        setFeatures([]);
        return;
      }
      
      const bounds = map.getBounds();
      const minLng = bounds.getWest();
      const minLat = bounds.getSouth();
      const maxLng = bounds.getEast();
      const maxLat = bounds.getNorth();
      
      try {
        const res = await fetch(`/api/land?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`);
        const data = await res.json();
        setFeatures(data.features || []);
      } catch (e: any) {
        if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
          // ignore benign fetch errors during server restarts
        } else {
          console.error(e);
        }
      }
    };

    const onMoveEnd = () => {
      clearTimeout(timeout);
      timeout = setTimeout(fetchLand, 300);
    };

    map.on('moveend', onMoveEnd);
    fetchLand();

    return () => {
      map.off('moveend', onMoveEnd);
      clearTimeout(timeout);
    };
  }, [map]);

  return (
    <>
      {features.filter(f => f.geometry.type === 'LineString').map((f, i) => (
        <Polyline 
          key={`line-${i}`}
          positions={f.geometry.coordinates.map((p: number[]) => [p[1], p[0]])}
          pathOptions={{ color: '#ef4444', weight: 2 }} 
        />
      ))}
      {features.filter(f => f.geometry.type !== 'LineString').map((f, i) => {
        const positions = f.geometry.coordinates.map((ring: any[]) => 
          ring.map((p: number[]) => [p[1], p[0]])
        );
        return (
          <Polygon 
            key={`poly-${i}`} 
            positions={positions} 
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, weight: 2 }} 
          />
        );
      })}
    </>
  );
}

// Component to handle map clicks
function MapEvents({ onMapClick, onDragStart }: { onMapClick: (x: number, y: number) => void, onDragStart: () => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      let normLng = lng;
      while (normLng > 180) normLng -= 360;
      while (normLng < -180) normLng += 360;
      const local = toLocal(lat, normLng);
      onMapClick(local.x, local.y);
    },
    dragstart() {
      onDragStart();
    }
  });
  return null;
}

// Component to track ship
function MapTracker({ center, isFollowing }: { center: [number, number], isFollowing: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (isFollowing) {
      // Use setView with animate: false for high-frequency updates to prevent stuttering
      map.setView(center, map.getZoom(), { animate: false });
    }
  }, [center, map, isFollowing]);
  return null;
}

export default function Map({ state, obstacles, buoys, onMapClick }: { state: any, obstacles: any[], buoys: any[], onMapClick: (x: number, y: number) => void }) {
  const { x, y, psi, waypoints, currentWaypointIndex, history, collision_warning, predicted, ddpg_active, perception_radius } = state;
  const [isFollowing, setIsFollowing] = useState(true);

  const shipGeo = toGeo(x, y);
  const historyGeo = history.map((p: any) => toGeo(p.x, p.y));
  const waypointsGeo = waypoints.map((p: any) => toGeo(p.x, p.y));
  const predictedGeo = predicted ? predicted.map((p: any) => toGeo(p.x, p.y)) : [];
  
  // Create a continuous path from the ship to the remaining waypoints
  const activeWaypoints = waypointsGeo.length > 0 && currentWaypointIndex < waypointsGeo.length 
    ? [shipGeo, ...waypointsGeo.slice(currentWaypointIndex)] 
    : [];

  // Create custom ship icon
  const shipLength = 30;
  const shipWidth = 12;
  const shipPoints = `
    ${shipLength/2},0
    ${shipLength/4},${shipWidth/2}
    ${-shipLength/2},${shipWidth/2}
    ${-shipLength/2},${-shipWidth/2}
    ${shipLength/4},${-shipWidth/2}
  `;

  // psi is in radians. 0 is East, pi/2 is North.
  // In CSS, rotate(0deg) points right. rotate(-90deg) points up.
  const rotationDeg = -psi * 180 / Math.PI;

  const shipHtml = `
    <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; transform: rotate(${rotationDeg}deg); transition: transform 0.15s linear;">
      <svg width="60" height="60" viewBox="-30 -30 60 60" style="overflow: visible;">
        ${collision_warning ? '<circle cx="0" cy="0" r="40" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" stroke-width="2" class="animate-ping" />' : ''}
        <polygon points="${shipPoints}" fill="${collision_warning ? '#ef4444' : '#38bdf8'}" stroke="${collision_warning ? '#991b1b' : '#0284c7'}" stroke-width="2" />
        <line x1="0" y1="0" x2="${shipLength}" y2="0" stroke="rgba(255,255,255,0.5)" stroke-width="1" stroke-dasharray="2 2" />
      </svg>
    </div>
  `;

  const shipIcon = L.divIcon({
    html: shipHtml,
    className: 'ship-marker-transition',
    iconSize: [60, 60],
    iconAnchor: [30, 30],
  });

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-800/50 relative z-0">
      <MapContainer 
        center={shipGeo} 
        zoom={16} 
        style={{ width: '100%', height: '100%', background: '#0c4a6e' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        
        <MapEvents 
          onMapClick={(lx, ly) => { setIsFollowing(false); onMapClick(lx, ly); }} 
          onDragStart={() => setIsFollowing(false)}
        />
        <MapTracker center={shipGeo} isFollowing={isFollowing} />

        {/* Land Polygons (Dynamic) */}
        <LandLayer />

        {/* Buoys (Channel Markers) */}
        {buoys?.map((buoy: any, i: number) => {
          const geo = toGeo(buoy.x, buoy.y);
          const isRed = buoy.type === 'red';
          return (
            <CircleMarker 
              key={`buoy-${i}`} 
              center={geo} 
              radius={6}
              pathOptions={{ 
                color: isRed ? '#ef4444' : '#22c55e', 
                fillColor: isRed ? '#ef4444' : '#22c55e', 
                fillOpacity: 0.8, 
                weight: 2 
              }} 
            />
          );
        })}

        {/* History */}
        {historyGeo.length > 1 && (
          <Polyline 
            positions={historyGeo} 
            pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.8 }} 
          />
        )}

        {/* Predicted Trajectory */}
        {predictedGeo.length > 1 && (
          <Polyline 
            positions={[shipGeo, ...predictedGeo]} 
            pathOptions={{ color: '#10b981', weight: 3, dashArray: '5 5', opacity: 0.9 }} 
          />
        )}

        {/* Waypoints Line */}
        {activeWaypoints.length > 1 && (
          <Polyline 
            positions={activeWaypoints} 
            pathOptions={{ color: '#0ea5e9', weight: 4, dashArray: '8 8', opacity: 0.9 }} 
          />
        )}

        {/* Waypoint Markers */}
        {waypointsGeo.map((wp: any, i: number) => {
          const isPassed = i < currentWaypointIndex;
          const isLast = i === waypointsGeo.length - 1;
          const isCurrent = i === currentWaypointIndex;
          return (
            <CircleMarker 
              key={i} 
              center={wp} 
              radius={isPassed ? 3 : (isLast ? 8 : (isCurrent ? 6 : 4))}
              pathOptions={{ 
                color: isPassed ? '#64748b' : (isLast ? '#ef4444' : (isCurrent ? '#60a5fa' : '#3b82f6')),
                fillColor: isPassed ? '#64748b' : (isLast ? '#ef4444' : (isCurrent ? '#60a5fa' : '#3b82f6')),
                fillOpacity: isPassed ? 0.3 : (isCurrent ? 1 : 0.8),
                weight: isCurrent ? 2 : 0
              }} 
            />
          );
        })}

        {/* Target Ping */}
        {waypointsGeo.length > 0 && currentWaypointIndex < waypointsGeo.length && (
          <Marker 
            position={waypointsGeo[waypointsGeo.length - 1]}
            icon={L.divIcon({
              html: '<div class="w-6 h-6 rounded-full border-2 border-red-500 animate-ping"></div>',
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          />
        )}

        {/* Ship */}
        {/* DDPG Perception Radius */}
        {ddpg_active && (
          <Circle 
            center={shipGeo} 
            radius={perception_radius} 
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.05, weight: 1, dashArray: '5, 5' }} 
          />
        )}

        <Marker position={shipGeo} icon={shipIcon} zIndexOffset={1000} />

      </MapContainer>

      <button
        onClick={() => setIsFollowing(true)}
        className={`absolute bottom-8 left-8 z-[1000] p-4 rounded-2xl shadow-2xl transition-all backdrop-blur-xl border ${
          isFollowing 
            ? 'bg-blue-500/80 text-white border-blue-400/50' 
            : 'bg-black/40 text-slate-300 border-white/10 hover:bg-black/60 hover:text-white'
        }`}
        title="跟随船舶"
      >
        <Crosshair className="w-6 h-6" />
      </button>
    </div>
  );
}
