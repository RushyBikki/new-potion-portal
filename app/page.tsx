"use client";


import React, { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CauldronDetails from "./components/CauldronDetails";
import Navbar from "./components/Navbar";
import bluePotionGif from "./components/Images/bluepotion.gif";


type Cauldron = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  maxVolume: number;
  fillRatePerMin: number; // units per minute
};


type Edge = { from: string; to: string; travelMin: number };


type Ticket = { id: string; date: string; amount: number };


// Drain events type
type DrainEvent = { cauldronId: string; startMin: number; endMin: number; removedVolume: number };


// Utility: build minute-by-minute history for each cauldron across the day (1440 min)
function buildHistory(cauldron: Cauldron, drains: DrainEvent[], initial = 0) {
  const minutes = 24 * 60; // 1440
  const values = new Array(minutes).fill(0);
  let cur = initial;
  for (let m = 0; m < minutes; m++) {
    // fill
    cur += cauldron.fillRatePerMin;
    // check drains that cover this minute
    for (const d of drains) {
      if (d.cauldronId !== cauldron.id) continue;
      if (m >= d.startMin && m <= d.endMin) {
        // remove portion of removedVolume across the drain window proportionally
        const windowLen = d.endMin - d.startMin + 1;
        const perMin = d.removedVolume / windowLen;
        cur -= perMin;
      }
    }
    if (cur < 0) cur = 0;
    if (cur > cauldron.maxVolume) cur = cauldron.maxVolume;
    values[m] = cur;
  }
  return values;
}


export default function Home() 
{
  const [minute, setMinute] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [data, setData] = useState(() => ({
    cauldrons: [] as Cauldron[],
    edges: [] as Edge[],
    drains: [] as DrainEvent[],
    tickets: [] as Ticket[],
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const minutes = 24 * 60;

  // Fetch data from API
  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch cauldrons data
      const response = await fetch('/api?endpoint=Information/cauldrons', {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch cauldrons data: ${errorText}`);
      }
      const cauldronsData = await response.json();
      
      // If the data is wrapped in an object, extract the array
      const cauldronArray = Array.isArray(cauldronsData) ? cauldronsData : 
                          cauldronsData?.cauldrons || 
                          cauldronsData?.data || 
                          [];
      
      console.log('Raw cauldron data:', cauldronsData); // Debug log

      // Normalize coordinates to 0-1 range
      const normalizeCoords = (coords: { latitude: number; longitude: number }[]) => {
        const lats = coords.map(c => c.latitude);
        const lons = coords.map(c => c.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        
        return (coord: { latitude: number; longitude: number }) => ({
          lat: (coord.latitude - minLat) / (maxLat - minLat),
          lon: (coord.longitude - minLon) / (maxLon - minLon)
        });
      };

      // Get the coordinate normalizer function
      const normalize = normalizeCoords(cauldronsData);

      // Transform cauldron data to match our format
      const transformedCauldrons = cauldronsData.map((c: any) => {
        const normalized = normalize(c);
        return {
          id: String(c.id),
          name: c.name,
          lat: normalized.lat,
          lon: normalized.lon,
          maxVolume: c.max_volume,
          fillRatePerMin: 0.5 // We'll calculate this from time series data
        };
      });

      console.log('Transformed cauldrons:', transformedCauldrons); // Debug log

      // Define the market node
      const marketNode: Cauldron = {
        id: "market",
        name: "Enchanted Market",
        lat: 0.5, // Center position
        lon: 0.5, // Center position
        maxVolume: 99999,
        fillRatePerMin: 0
      };

      // Add market to the cauldrons list
      const allCauldrons = [...transformedCauldrons, marketNode];

      // Create edges connecting all cauldrons to the market
      const marketEdges = transformedCauldrons.map((c: Cauldron) => ({
        from: c.id,
        to: "market",
        travelMin: Math.floor(Math.random() * 15) + 5 // Random travel time between 5-20 minutes
      }));

      console.log('All cauldrons:', allCauldrons); // Debug log
      console.log('Market edges:', marketEdges); // Debug log

      // Update state with the transformed data
      setData(prev => ({
        ...prev,
        cauldrons: allCauldrons,
        edges: marketEdges,
        drains: [], // Clear sample drains
        tickets: []  // Clear sample tickets
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Load API data on component mount
  useEffect(() => {
    fetchData();
  }, []);


  // Build history once
  const histories = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const c of data.cauldrons) {
      if (c.id === "market") continue; // market not simulated
      map[c.id] = buildHistory(c, data.drains || [], 50); // start at 50 units
    }
    return map;
  }, [data]);


  // Detect drain events from history by detecting sudden drops
  const detectedDrains = useMemo(() => {
    const results: Array<{ cauldronId: string; minute: number; drop: number }> = [];
    for (const c of data.cauldrons) {
      if (c.id === "market") continue;
      const h = histories[c.id];
      for (let i = 1; i < h.length; i++) {
        const delta = h[i - 1] - h[i];
        if (delta > 5) {
          results.push({ cauldronId: c.id, minute: i, drop: Math.round(delta) });
        }
      }
    }
    return results;
  }, [histories]);


  // Ticket matching: For each ticket, find a drain (detected or known) on that day that best matches amount
  const matches = useMemo(() => {
    const matchResults: Array<{ ticket: Ticket; matchedDrain?: DrainEvent; difference?: number; suspicious?: boolean }> = [];
    for (const t of data.tickets) {
      // candidate drains: those with same date (we use single date) => all SAMPLE_DRAINS
      let best: DrainEvent | undefined;
      let bestDiff = Infinity;
      for (const d of data.drains) {
        const diff = Math.abs(d.removedVolume - t.amount);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = d;
        }
      }
      const suspicious = bestDiff > Math.max(20, (best ? best.removedVolume * 0.1 : 0));
      matchResults.push({ ticket: t, matchedDrain: best, difference: Math.round(bestDiff), suspicious });
    }
    return matchResults;
  }, [data]);


  // playback timer (compressed) — play 24h across 90s (so ~0.66s per minute)
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setMinute((m) => (m + 1) % minutes);
    }, 66); // ~66ms per minute => 1440*0.066 = ~95s
    return () => clearInterval(interval);
  }, [playing]);


  function renderSVGMap() {
    const w = 800;
    const h = 600;
    const pad = 20;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto border rounded bg-purple-900">
          <rect x="0" y="0" width={w} height={h} rx={18} ry={18} fill="#1b0b2f" />
        {/* edges */}
        {data.edges.map((e, i) => {
          const a = data.cauldrons.find((c) => c.id === e.from)!;
          const b = data.cauldrons.find((c) => c.id === e.to)!;
          const x1 = pad + a.lon * (w - pad * 2);
          const y1 = pad + a.lat * (h - pad * 2);
          const x2 = pad + b.lon * (w - pad * 2);
          const y2 = pad + b.lat * (h - pad * 2);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#16a34a" strokeWidth={2} opacity={0.9} />;
        })}
        {/* nodes */}
          {data.cauldrons.map((c) => {
          const x = pad + c.lon * (w - pad * 2);
          const y = pad + c.lat * (h - pad * 2);
          const value = c.id === "market" ? undefined : histories[c.id][minute];
          const radius = c.id === "market" ? 36 : 28;
          const selected = selectedId === c.id;
          return (
            <g
              key={c.id}
              transform={`translate(${x},${y})`}
              onClick={() => {
                if (c.id === "market") return;
                selectCauldron(selectedId === c.id ? null : c.id);
              }}
              style={{ cursor: c.id === "market" ? "default" : "pointer" }}
              role="button"
              aria-label={`Select ${c.name}`}>
              {/* render the potion GIF via foreignObject+img so animation displays reliably */}
              {
                (() => {
                  // asset import may be a string URL or an object with `src`
                  const gifSrc = (bluePotionGif as any)?.src ?? (bluePotionGif as unknown as string) ?? "/components/Images/bluepotion.gif";
                  return (
                    <foreignObject x={-radius} y={-radius} width={radius * 2} height={radius * 2} style={{ overflow: "visible" }}>
                      <img src={gifSrc} width={radius * 2} height={radius * 2} style={{ width: "100%", height: "100%", borderRadius: "50%", display: "block" }} alt="potion" />
                    </foreignObject>
                  );
                })()
              }
              <text x={radius + 8} y={4} fontSize={12} fill="#ffffff" fontWeight={600}>
                {c.name}
              </text>
              {c.id !== "market" && (
                <text x={-10} y={radius + 16} fontSize={11} textAnchor="middle" fill="#ffffff">
                  {Math.round(value || 0)}u
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }


  function handleRefresh() {
    fetchData();
    setSelectedId(null);
    setMinute(0);
  }


  // Sync selection from URL -> state on load / when params change (client-side)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const param = sp.get("cauldron");
    if (param && data.cauldrons.some((c) => c.id === param)) {
      setSelectedId(param);
    } else if (!param) {
      setSelectedId(null);
    }
    // run when cauldrons list changes
  }, [data.cauldrons]);


  // Helper to select and update URL (replace, not push)
  function selectCauldron(id: string | null) {
    setSelectedId(id);
    // build new search params from current URL (client-side)
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (id) {
      sp.set("cauldron", id);
    } else {
      sp.delete("cauldron");
    }
    const q = sp.toString();
    router.replace(`${pathname}${q ? `?${q}` : ""}`);
  }


  // Keyboard navigation: left/right to cycle, Escape to clear
  useEffect(() => {
    const ids = data.cauldrons.filter((c) => c.id !== "market").map((c) => c.id);
    if (ids.length === 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        selectCauldron(null);
        return;
      }
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const current = selectedId ? ids.indexOf(selectedId) : -1;
      let nextIdx = 0;
      if (e.key === "ArrowRight") {
        nextIdx = current === -1 ? 0 : (current + 1) % ids.length;
      } else {
        nextIdx = current === -1 ? ids.length - 1 : (current - 1 + ids.length) % ids.length;
      }
      selectCauldron(ids[nextIdx]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data.cauldrons, selectedId, pathname, router]);


  return (
  <div className="min-h-screen p-6 bg-purple-900 text-white">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-black">Poyo's Potion Portal</h1>
        <p className="text-sm text-black">HackUTD2025</p>
      </header>


  <div className="flex gap-0">
    {/* Left sidebar */}
  <div className="flex-none min-w-[200px] bg-green-900 border border-green-800 p-4 rounded-lg overflow-hidden">
          <div className="mb-4 p-3 border rounded bg-purple-900/60 border-purple-900">
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className="px-3 py-1 bg-purple-800 text-white rounded font-semibold">
                Refresh Data
              </button>
            </div>
            {loading && <p className="mt-2 text-xs text-white">Loading data...</p>}
            {error && <p className="mt-2 text-xs text-red-400">Error: {error}</p>}
          </div>
          <div className="mt-4">
            <div className="mb-4 flex items-center gap-2">
              <button onClick={() => setPlaying((p) => !p)} className="px-3 py-1 bg-purple-800 text-white rounded font-semibold">
                {playing ? "Pause" : "Play"}
              </button>
              <button onClick={() => setMinute(0)} className="px-3 py-1 border border-purple-900 text-white rounded">
                Reset
              </button>
            </div>
            <div className="text-sm text-white mb-2">Tick: {minute}</div>
            <input
              type="range"
              min={0}
              max={minutes - 1}
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="w-full accent-purple-800"
            />
          </div>
        </div>


        {/* Center map (fills remaining space) */}
        <div className="flex-1 flex justify-center items-start">
          <div className="p-6 bg-purple-900 border-4 border-purple-900 rounded-lg shadow-lg overflow-hidden w-full max-w-full">{renderSVGMap()}</div>
        </div>


  {/* Right sidebar */}
  <div className="flex-none min-w-[280px] bg-green-900 border border-green-800 p-4 rounded-lg overflow-hidden">


          {/* details panel when a cauldron is selected */}
          {selectedId && data.cauldrons.find((c) => c.id === selectedId) && histories[selectedId] && (
            <div className="mt-4 p-3 border rounded bg-transparent">
              <CauldronDetails
                cauldron={data.cauldrons.find((c) => c.id === selectedId)!}
                history={histories[selectedId]}
                minute={minute}
                onClose={() => selectCauldron(null)}
              />
            </div>
          )}


          <section className="mt-4">
            <h2 className="font-semibold text-green-300">Cauldron snapshots</h2>
            <ul>
              {data.cauldrons.filter((c) => c.id !== "market").map((c) => {
                const v = Math.round(histories[c.id][minute] || 0);
                return (
                  <li key={c.id} className="py-2 border-b border-zinc-800">
                    <div className="flex justify-between">
                      <div>
                        <strong className="text-green-200">{c.name}</strong>
                        <div className="text-xs text-green-400">max {c.maxVolume}u • fill {c.fillRatePerMin}/min</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg text-green-200">{v}u</div>
                        <div className="text-xs text-green-400">{Math.round((v / c.maxVolume) * 100)}%</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>


          <section className="mt-4">
            <h2 className="font-semibold">Detected drain events</h2>
            <ul>
              {detectedDrains.slice(0, 10).map((d, i) => (
                <li key={i} className="text-sm">
                  {d.cauldronId} @ minute {d.minute} dropped {d.drop}u
                </li>
              ))}
            </ul>
          </section>


          <section className="mt-4">
            <h2 className="font-semibold">Ticket matching</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left">Ticket</th>
                  <th>Amount</th>
                  <th>Matched Drain</th>
                  <th>Diff</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.ticket.id} className={m.suspicious ? "bg-red-400" : ""}>
                    <td>{m.ticket.id}</td>
                    <td className="text-center">{m.ticket.amount}</td>
                    <td className="text-center">{m.matchedDrain ? `${m.matchedDrain.cauldronId} (${m.matchedDrain.removedVolume}u)` : "-"}</td>
                    <td className="text-center">{m.difference}</td>
                    <td className="text-center">{m.suspicious ? "SUSPICIOUS" : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}


