import express from 'express';
import { createServer as createViteServer } from 'vite';
import RBush from 'rbush';
import fs from 'fs';

const BASE_LAT = 37.8267;
const BASE_LNG = -122.4230;
const R = 6378137; // Earth radius in meters

function toLocal(lat: number, lng: number) {
  const x = lng * R * Math.PI / 180;
  const y = R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const refX = BASE_LNG * R * Math.PI / 180;
  const refY = R * Math.log(Math.tan(Math.PI / 4 + BASE_LAT * Math.PI / 360));
  return { x: x - refX, y: y - refY };
}

function toGeo(x: number, y: number) {
  const refX = BASE_LNG * R * Math.PI / 180;
  const refY = R * Math.log(Math.tan(Math.PI / 4 + BASE_LAT * Math.PI / 360));
  const absX = x + refX;
  const absY = y + refY;
  const lng = absX / (R * Math.PI / 180);
  const lat = (2 * Math.atan(Math.exp(absY / R)) - Math.PI / 2) * 180 / Math.PI;
  return { lat, lng };
}


const segmentTree = new RBush();
const polygonTree = new RBush();

function initGlobalLand() {
  let segments: any[] = [];
  let polygons: any[] = [];
  
  try {
    const geojson = JSON.parse(fs.readFileSync('land.geojson', 'utf8'));
    function processPolygon(coords: any[]) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      const ringBboxes = [];
      for (const ring of coords) {
        let rMinLng = Infinity, rMinLat = Infinity, rMaxLng = -Infinity, rMaxLat = -Infinity;
        for (const p of ring) {
          if (p[0] < minLng) minLng = p[0];
          if (p[0] > maxLng) maxLng = p[0];
          if (p[1] < minLat) minLat = p[1];
          if (p[1] > maxLat) maxLat = p[1];
          
          if (p[0] < rMinLng) rMinLng = p[0];
          if (p[0] > rMaxLng) rMaxLng = p[0];
          if (p[1] < rMinLat) rMinLat = p[1];
          if (p[1] > rMaxLat) rMaxLat = p[1];
        }
        ringBboxes.push({ minLng: rMinLng, minLat: rMinLat, maxLng: rMaxLng, maxLat: rMaxLat });
        for (let i = 0; i < ring.length - 1; i++) {
          const p1 = toLocal(ring[i][1], ring[i][0]);
          const p2 = toLocal(ring[i+1][1], ring[i+1][0]);
          segments.push({
            minX: Math.min(p1.x, p2.x), minY: Math.min(p1.y, p2.y),
            maxX: Math.max(p1.x, p2.x), maxY: Math.max(p1.y, p2.y),
            p1, p2
          });
        }
      }
      polygons.push({ minX: minLng, minY: minLat, maxX: maxLng, maxY: maxLat, coords, ringBboxes });
    }

    for (const feature of geojson.features) {
      if (feature.geometry.type === 'Polygon') {
        processPolygon(feature.geometry.coordinates);
      } else if (feature.geometry.type === 'MultiPolygon') {
        for (const poly of feature.geometry.coordinates) {
          processPolygon(poly);
        }
      }
    }
  } catch (e) {
    console.error('Could not load land_10m.geojson', e);
  }

  segmentTree.load(segments);
  polygonTree.load(polygons);
  console.log('Loaded global land data. Segments:', segments.length, 'Polygons:', polygons.length);
}

initGlobalLand();

function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function isPointInGeoJSONPolygon(lng: number, lat: number, coords: any[], ringBboxes?: any[]) {
  let inside = false;
  // coords is an array of rings. The first is the exterior ring, others are holes.
  for (let i = 0; i < coords.length; i++) {
    if (ringBboxes && ringBboxes[i]) {
      const bbox = ringBboxes[i];
      if (lng < bbox.minLng || lng > bbox.maxLng || lat < bbox.minLat || lat > bbox.maxLat) {
        continue;
      }
    }
    const ring = coords[i];
    let ringInside = false;
    for (let j = 0, k = ring.length - 1; j < ring.length; k = j++) {
      const p1lng = ring[j][0];
      const p1lat = ring[j][1];
      const p2lng = ring[k][0];
      const p2lat = ring[k][1];
      const intersect = ((p1lat > lat) !== (p2lat > lat)) &&
          (lng < (p2lng - p1lng) * (lat - p1lat) / (p2lat - p1lat) + p1lng);
      if (intersect) ringInside = !ringInside;
    }
    if (i === 0) {
      inside = ringInside;
    } else if (ringInside) {
      // If inside a hole, then it's outside the polygon
      inside = false;
    }
  }
  return inside;
}

const distanceCache = new Map<string, number>();

function getDistanceToPolygons(px: number, py: number, _ignored?: any[]) {
  const cx = Math.round(px / 10) * 10;
  const cy = Math.round(py / 10) * 10;
  const key = `${cx},${cy}`;
  if (distanceCache.has(key)) {
    return distanceCache.get(key)!;
  }

  try {
    // First check if point is inside any polygon
    const geo = toGeo(px, py);
    const polys = polygonTree.search({
      minX: geo.lng, minY: geo.lat,
      maxX: geo.lng, maxY: geo.lat
    });
    for (const poly of polys as any[]) {
      if (isPointInGeoJSONPolygon(geo.lng, geo.lat, poly.coords, poly.ringBboxes)) {
        distanceCache.set(key, 0);
        return 0; // Inside land
      }
    }

    const searchRadius = 1000;
    const results = segmentTree.search({
      minX: px - searchRadius, minY: py - searchRadius,
      maxX: px + searchRadius, maxY: py + searchRadius
    });
    
    if (results.length === 0) {
      distanceCache.set(key, searchRadius);
      return searchRadius;
    }
    
    let minDist = Infinity;
    for (const seg of results as any[]) {
      const dist = pointToSegmentDistance(px, py, seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);
      if (dist < minDist) minDist = dist;
    }
    
    if (distanceCache.size > 50000) {
      distanceCache.clear();
    }
    distanceCache.set(key, minDist);
    return minDist;
  } catch (e) {
    console.error('Error in getDistanceToPolygons:', e);
    return 1000;
  }
}

const landPolygons: any[] = []; // Dummy for compatibility


const app = express();
app.use(express.json());

// --- Simulation Logic ---
class ShipSimulation {
  K = 0.5;
  T1 = 20.0;
  T2 = 2.0;
  T3 = 5.0;
  TE = 0.5;
  U = 5.0;

  x = -4000;
  y = -500;
  psi = 0;
  r = 0;
  r_dot = 0;
  delta = 0;
  delta_c = 0;

  mode: 'auto' | 'manual' = 'auto';
  manual_delta_c = 0;
  collision_warning = false;
  ddpg_active = false;
  perception_radius = 800;

  waypoints: {x: number, y: number}[] = [];
  currentWaypointIndex = 0;
  history: {x: number, y: number}[] = [];

  Kp = 5.0;
  Kd = 15.0;

  obstacles = landPolygons;

  update(dt: number) {
    if (!isFinite(this.x) || !isFinite(this.y) || !isFinite(this.psi) || !isFinite(this.r)) {
      console.error('State corrupted with NaN or Infinity. Resetting ship.');
      this.x = -4000;
      this.y = -500;
      this.psi = 0;
      this.r = 0;
      this.r_dot = 0;
      this.delta = 0;
      this.delta_c = 0;
      this.waypoints = [];
      this.history = [];
    }

    // Rudder dynamics
    const delta_dot = (this.delta_c - this.delta) / this.TE;
    this.delta += delta_dot * dt;

    // Nomoto 2nd order
    const r_ddot = (this.K * (this.delta + this.T3 * delta_dot) - (this.T1 + this.T2) * this.r_dot - this.r) / (this.T1 * this.T2);

    this.r_dot += r_ddot * dt;
    this.r += this.r_dot * dt;
    this.psi += this.r * dt;

    // Normalize psi safely
    if (isFinite(this.psi)) {
      this.psi = Math.atan2(Math.sin(this.psi), Math.cos(this.psi));
    } else {
      this.psi = 0;
    }

    this.x += this.U * Math.cos(this.psi) * dt;
    this.y += this.U * Math.sin(this.psi) * dt;

    // Save history (throttle to avoid huge arrays)
    if (Math.random() < 0.1) {
      this.history.push({ x: this.x, y: this.y });
      if (this.history.length > 500) this.history.shift();
    }

    // Collision detection
    this.collision_warning = false;
    this.ddpg_active = false;
    const distToLand = getDistanceToPolygons(this.x, this.y, this.obstacles);
    if (distToLand < 100) { // 100m warning
      this.collision_warning = true;
    }
    
    // Hard collision: stop the ship
    if (distToLand < 20) {
      this.x -= this.U * Math.cos(this.psi) * dt;
      this.y -= this.U * Math.sin(this.psi) * dt;
      // We don't set U to 0 so it can turn and escape
    }

    if (this.mode === 'auto') {
      if (this.currentWaypointIndex < this.waypoints.length) {
        const target = this.waypoints[this.currentWaypointIndex];
        const distToTarget = Math.hypot(target.x - this.x, target.y - this.y);

        if (distToTarget < 50) {
          this.currentWaypointIndex++;
        } else if (distToLand < this.perception_radius) {
          // DDPG Local Planner (Simulated via DWA / Potential Field)
          this.ddpg_active = true;
          
          let best_delta_c = 0;
          let max_reward = -Infinity;
          
          const prevTarget = this.currentWaypointIndex > 0 
            ? this.waypoints[this.currentWaypointIndex - 1] 
            : { x: this.history.length > 0 ? this.history[this.history.length-1].x : this.x, 
                y: this.history.length > 0 ? this.history[this.history.length-1].y : this.y };

          const path_dx = target.x - prevTarget.x;
          const path_dy = target.y - prevTarget.y;
          const path_len = Math.hypot(path_dx, path_dy);

          let path_heading = 0;
          if (path_len > 0) {
            const path_angle = Math.atan2(path_dy, path_dx);
            const cross_track_error = -Math.sin(path_angle) * (this.x - prevTarget.x) + Math.cos(path_angle) * (this.y - prevTarget.y);
            const lookahead = 150;
            path_heading = path_angle + Math.atan(-cross_track_error / lookahead);
          } else {
            path_heading = Math.atan2(target.y - this.y, target.x - this.x);
          }
          
          // Action space: -35 to 35 degrees rudder
          for (let a = -35; a <= 35; a += 5) {
            const test_delta = a * Math.PI / 180;
            
            // Predict future state (simulate for 40 seconds to see 200m ahead)
            const T_pred = 40;
            const future_psi = this.psi + this.r * T_pred + (this.K * test_delta) * T_pred;
            const future_x = this.x + this.U * Math.cos(future_psi) * T_pred;
            const future_y = this.y + this.U * Math.sin(future_psi) * T_pred;
            
            const future_dist_land = getDistanceToPolygons(future_x, future_y, this.obstacles);
            
            let heading_diff = future_psi - path_heading;
            heading_diff = Math.atan2(Math.sin(heading_diff), Math.cos(heading_diff));
            
            // Reward Function (DDPG Critic Network Simulation):
            // + Alignment with path
            // - Penalty for being close to land
            let reward = -Math.abs(heading_diff) * 1000;
            
            if (future_dist_land < 200) {
               reward -= 100000; // Severe penalty (Collision)
            } else if (future_dist_land < 600) {
               reward -= 10000 * Math.exp(-(future_dist_land - 200) / 100); // Soft penalty (Keep distance)
            }
            
            reward -= Math.abs(a) * 2; // Small fuel efficiency penalty
            
            if (reward > max_reward) {
              max_reward = reward;
              best_delta_c = test_delta;
            }
          }
          
          // Apply DDPG action with smoothing
          this.delta_c = this.delta_c * 0.8 + best_delta_c * 0.2;
        } else {
          // Open water: use standard LOS guidance
          this.navigate();
        }
      }
    } else {
      this.delta_c = this.manual_delta_c;
    }
  }

  navigate() {
    if (this.currentWaypointIndex < this.waypoints.length) {
      const target = this.waypoints[this.currentWaypointIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 50) {
        this.currentWaypointIndex++;
      } else {
        // Line-of-Sight (LOS) Guidance Law
        const prevTarget = this.currentWaypointIndex > 0 
          ? this.waypoints[this.currentWaypointIndex - 1] 
          : { x: this.history.length > 0 ? this.history[this.history.length-1].x : this.x, 
              y: this.history.length > 0 ? this.history[this.history.length-1].y : this.y };

        const path_dx = target.x - prevTarget.x;
        const path_dy = target.y - prevTarget.y;
        const path_len = Math.hypot(path_dx, path_dy);

        let psi_d = 0;

        if (path_len < 1) {
          psi_d = Math.atan2(dy, dx);
        } else {
          const alpha_k = Math.atan2(path_dy, path_dx);
          // Cross-track error
          const ex = this.x - prevTarget.x;
          const ey = this.y - prevTarget.y;
          const ye = -ex * Math.sin(alpha_k) + ey * Math.cos(alpha_k);

          const Delta = 150.0; // Lookahead distance
          psi_d = alpha_k + Math.atan(-ye / Delta);
        }

        let error = psi_d - this.psi;
        error = Math.atan2(Math.sin(error), Math.cos(error));

        this.delta_c = this.Kp * error - this.Kd * this.r;
        const max_delta = 35 * Math.PI / 180;
        if (this.delta_c > max_delta) this.delta_c = max_delta;
        if (this.delta_c < -max_delta) this.delta_c = -max_delta;
      }
    } else {
      this.delta_c = 0;
    }
  }

  setTarget(endX: number, endY: number) {
    this.waypoints = aStar(this.x, this.y, endX, endY, this.obstacles);
    this.currentWaypointIndex = 0;
  }
}

function heuristic(a: any, b: any) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getNeighbors(node: any, obstacles: any[], step: number) {
  const neighbors = [];
  const dirs = [
    [0, step], [0, -step], [step, 0], [-step, 0],
    [step, step], [step, -step], [-step, step], [-step, -step]
  ];
  for (const dir of dirs) {
    const nx = node.x + dir[0];
    const ny = node.y + dir[1];
    const dist = getDistanceToPolygons(nx, ny, obstacles);
    if (dist > 150) { // Keep at least 150m away to avoid 100m collision warning
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

function lineOfSight(p1: any, p2: any, obstacles: any[]) {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const steps = Math.max(1, Math.ceil(dist / 50));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p1.x + t * (p2.x - p1.x);
    const y = p1.y + t * (p2.y - p1.y);
    if (getDistanceToPolygons(x, y, obstacles) < 150) return false;
  }
  return true;
}

class MinHeap {
  heap: any[] = [];
  push(node: any) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.sinkDown(0);
    return top;
  }
  bubbleUp(index: number) {
    const node = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (node.f >= parent.f) break;
      this.heap[parentIndex] = node;
      this.heap[index] = parent;
      index = parentIndex;
    }
  }
  sinkDown(index: number) {
    const length = this.heap.length;
    const node = this.heap[index];
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (leftChild.f < node.f) swap = leftChildIndex;
      }
      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if ((swap === null && rightChild.f < node.f) || (swap !== null && rightChild.f < leftChild.f)) {
          swap = rightChildIndex;
        }
      }
      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      this.heap[swap] = node;
      index = swap;
    }
  }
  isEmpty() {
    return this.heap.length === 0;
  }
}

function smoothPath(path: any[], obstacles: any[]) {
  if (path.length <= 2) return path;
  
  // 1. Greedy line-of-sight smoothing with limited lookahead
  const greedy = [path[0]];
  let currentIdx = 0;
  
  while (currentIdx < path.length - 1) {
    let nextIdx = Math.min(currentIdx + 20, path.length - 1);
    while (nextIdx > currentIdx + 1) {
      if (lineOfSight(path[currentIdx], path[nextIdx], obstacles)) {
        break;
      }
      nextIdx--;
    }
    greedy.push(path[nextIdx]);
    currentIdx = nextIdx;
  }

  // 2. Safe Corner Cutting (Chaikin's algorithm variant) to save fuel by smoothing sharp turns
  let smoothed = greedy;
  for (let iter = 0; iter < 2; iter++) {
    if (smoothed.length <= 2) break;
    const nextSmoothed = [smoothed[0]];
    for (let j = 1; j < smoothed.length - 1; j++) {
      const prev = smoothed[j - 1];
      const curr = smoothed[j];
      const next = smoothed[j + 1];
      
      // Calculate points at 25% and 75% along the segments
      const q = { x: 0.25 * prev.x + 0.75 * curr.x, y: 0.25 * prev.y + 0.75 * curr.y };
      const r = { x: 0.75 * curr.x + 0.25 * next.x, y: 0.75 * curr.y + 0.25 * next.y };
      
      // Only cut the corner if the new shortcut is safe from obstacles
      if (lineOfSight(q, r, obstacles)) {
        nextSmoothed.push(q);
        nextSmoothed.push(r);
      } else {
        nextSmoothed.push(curr);
      }
    }
    nextSmoothed.push(smoothed[smoothed.length - 1]);
    smoothed = nextSmoothed;
  }
  
  return smoothed;
}

function aStar(startX: number, startY: number, endX: number, endY: number, obstacles: any[]) {
  // First, check if there's a direct line of sight
  if (lineOfSight({x: startX, y: startY}, {x: endX, y: endY}, obstacles)) {
    return [{x: endX, y: endY}];
  }

  const step = 200; // Increased step size for faster pathfinding
  const sx = Math.round(startX / step) * step;
  const sy = Math.round(startY / step) * step;
  const ex = Math.round(endX / step) * step;
  const ey = Math.round(endY / step) * step;

  const openSet = new MinHeap();
  openSet.push({ x: sx, y: sy, g: 0, f: 0, parent: null as any });
  const closedSet = new Set();
  const openMap = new Map();
  openMap.set(`${sx},${sy}`, 0);
  
  let iterations = 0;
  let closestNode = openSet.heap[0];
  let minH = heuristic({x: sx, y: sy}, {x: ex, y: ey});

  while (!openSet.isEmpty() && iterations < 2000) {
    iterations++;
    
    const current = openSet.pop();
    const key = `${current.x},${current.y}`;
    
    if (closedSet.has(key)) continue;
    closedSet.add(key);

    const h = heuristic(current, { x: ex, y: ey });
    if (h < minH) {
      minH = h;
      closestNode = current;
    }

    if (Math.hypot(current.x - ex, current.y - ey) < step * 1.5) {
      const path = [];
      let curr = current;
      while (curr) {
        path.unshift({ x: curr.x, y: curr.y });
        curr = curr.parent;
      }
      path.push({ x: endX, y: endY });
      return smoothPath(path, obstacles);
    }

    const neighbors = getNeighbors(current, obstacles, step);
    for (const n of neighbors) {
      const nKey = `${n.x},${n.y}`;
      if (closedSet.has(nKey)) continue;

      let parent = current;
      let g = current.g + Math.hypot(n.x - current.x, n.y - current.y);

      // Proactive Obstacle Avoidance: Add penalty for being close to land
      const distToLand = getDistanceToPolygons(n.x, n.y, obstacles);
      if (distToLand < 400) {
        g += (400 - distToLand) * 1.5; // Soft penalty to keep ship in deep water
      }

      // COLREGs Rule 9: Keep to the starboard (right) side of the channel
      const cross = (ex - sx) * (n.y - sy) - (ey - sy) * (n.x - sx);
      if (cross > 0) {
         g += 20; // Soft penalty for being on the port (left) side of the direct route
      }

      // Theta* Line-of-Sight optimization
      if (current.parent && lineOfSight(current.parent, n, obstacles)) {
        const g_los = current.parent.g + Math.hypot(n.x - current.parent.x, n.y - current.parent.y);
        // Apply the same penalties to LOS path
        let los_penalty = 0;
        if (distToLand < 400) los_penalty += (400 - distToLand) * 1.5;
        if (cross > 0) los_penalty += 20;
        
        if (g_los + los_penalty < g) {
          parent = current.parent;
          g = g_los + los_penalty;
        }
      }

      const f = g + heuristic(n, { x: ex, y: ey });
      
      const existingG = openMap.get(nKey);
      if (existingG === undefined || g < existingG) {
        openMap.set(nKey, g);
        openSet.push({ x: n.x, y: n.y, g, f, parent });
      }
    }
  }
  
  // If no path found or iterations exceeded, return path to closest valid node
  if (closestNode) {
    const path = [];
    let curr = closestNode;
    while (curr) {
      path.unshift({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }
    // Only append the exact target if we actually reached the grid target
    if (closestNode.x === ex && closestNode.y === ey) {
      path.push({ x: endX, y: endY });
    }
    return smoothPath(path, obstacles);
  }

  return [];
}

const ship = new ShipSimulation();

setInterval(() => {
  ship.update(0.05);
}, 50);

app.get('/api/state', (req, res) => {
  const predicted = [];
  let px = ship.x, py = ship.y, ppsi = ship.psi, pr = ship.r, pr_dot = ship.r_dot, pdelta = ship.delta;
  for(let i=0; i<15; i++) {
    const dt = 1.0;
    const delta_dot = (ship.delta_c - pdelta) / ship.TE;
    pdelta += delta_dot * dt;
    const r_ddot = (ship.K * (pdelta + ship.T3 * delta_dot) - (ship.T1 + ship.T2) * pr_dot - pr) / (ship.T1 * ship.T2);
    pr_dot += r_ddot * dt;
    pr += pr_dot * dt;
    ppsi += pr * dt;
    px += ship.U * Math.cos(ppsi) * dt;
    py += ship.U * Math.sin(ppsi) * dt;
    predicted.push({x: px, y: py});
  }

  res.json({
    x: ship.x,
    y: ship.y,
    psi: ship.psi,
    r: ship.r,
    delta: ship.delta,
    delta_c: ship.delta_c,
    U: ship.U,
    mode: ship.mode,
    collision_warning: ship.collision_warning,
    waypoints: ship.waypoints,
    currentWaypointIndex: ship.currentWaypointIndex,
    history: ship.history,
    ddpg_active: ship.ddpg_active,
    perception_radius: ship.perception_radius,
    predicted: predicted,
    params: {
      K: ship.K,
      T1: ship.T1,
      T2: ship.T2,
      T3: ship.T3,
      Kp: ship.Kp,
      Kd: ship.Kd,
      U: ship.U
    }
  });
});

app.get('/api/land', (req, res) => {
  try {
    const { minLng, minLat, maxLng, maxLat } = req.query;
    if (!minLng || !minLat || !maxLng || !maxLat) return res.json({ type: 'FeatureCollection', features: [] });
    
    const minX = Number(minLng);
    const minY = Number(minLat);
    const maxX = Number(maxLng);
    const maxY = Number(maxLat);

    const startWorld = Math.floor((minX + 180) / 360);
    const endWorld = Math.floor((maxX + 180) / 360);

    const features = [];
    for (let w = startWorld; w <= endWorld; w++) {
      const offset = w * 360;
      const wMinX = Math.max(-180, minX - offset);
      const wMaxX = Math.min(180, maxX - offset);
      
      if (wMinX <= wMaxX) {
        const pMin = toLocal(minY, wMinX);
        const pMax = toLocal(maxY, wMaxX);
        const localMinX = Math.min(pMin.x, pMax.x);
        const localMaxX = Math.max(pMin.x, pMax.x);
        const localMinY = Math.min(pMin.y, pMax.y);
        const localMaxY = Math.max(pMin.y, pMax.y);

        const results = segmentTree.search({
          minX: localMinX, minY: localMinY,
          maxX: localMaxX, maxY: localMaxY
        });
        
        for (const seg of results as any[]) {
          if (features.length > 10000) break; // Increased limit to 10000 segments for better coverage
          const p1Geo = toGeo(seg.p1.x, seg.p1.y);
          const p2Geo = toGeo(seg.p2.x, seg.p2.y);
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [p1Geo.lng + offset, p1Geo.lat],
                [p2Geo.lng + offset, p2Geo.lat]
              ]
            },
            properties: {}
          });
        }
      }
    }
    
    res.json({ type: 'FeatureCollection', features });
  } catch (e) {
    console.error('Error in /api/land:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const buoys: any[] = [];

app.get('/api/obstacles', (req, res) => {
  res.json({ polygons: ship.obstacles, buoys });
});

app.post('/api/target', (req, res) => {
  const { x, y } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  ship.setTarget(x, y);
  res.json({ success: true });
});

app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'auto' || mode === 'manual') {
    ship.mode = mode;
  }
  res.json({ success: true });
});

app.post('/api/manual_control', (req, res) => {
  const { delta_c } = req.body;
  if (typeof delta_c === 'number' && isFinite(delta_c)) {
    ship.manual_delta_c = delta_c;
  }
  res.json({ success: true });
});

app.post('/api/params', (req, res) => {
  const p = req.body;
  if (typeof p.K === 'number' && isFinite(p.K)) ship.K = p.K;
  if (typeof p.T1 === 'number' && isFinite(p.T1)) ship.T1 = p.T1;
  if (typeof p.T2 === 'number' && isFinite(p.T2)) ship.T2 = p.T2;
  if (typeof p.T3 === 'number' && isFinite(p.T3)) ship.T3 = p.T3;
  if (typeof p.Kp === 'number' && isFinite(p.Kp)) ship.Kp = p.Kp;
  if (typeof p.Kd === 'number' && isFinite(p.Kd)) ship.Kd = p.Kd;
  if (typeof p.U === 'number' && isFinite(p.U)) ship.U = p.U;
  res.json({ success: true });
});

app.post('/api/reset', (req, res) => {
  ship.x = -4000;
  ship.y = -500;
  ship.psi = 0;
  ship.r = 0;
  ship.r_dot = 0;
  ship.delta = 0;
  ship.delta_c = 0;
  ship.waypoints = [];
  ship.currentWaypointIndex = 0;
  ship.history = [];
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
  });
}

startServer();
