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


type Ticket = { 
  id: string;
  date: string;
  amount: number;
  cauldronId: string;
  courierId: string;
};


// Drain events type
type DrainEvent = { cauldronId: string; startMin: number; endMin: number; removedVolume: number };


// Time series data for calculating fill rates
type TimeSeriesEntry = {
  timestamp: string;
  cauldron_levels: Record<string, number>;
};

const timeSeriesData: TimeSeriesEntry[] = [
  {
    "timestamp": "2025-10-30T00:00:00+00:00",
    "cauldron_levels": {
      "cauldron_001": 226.98, "cauldron_002": 240.22, "cauldron_003": 276.49,
      "cauldron_004": 181.53, "cauldron_005": 293.94, "cauldron_006": 160.36,
      "cauldron_007": 339.56, "cauldron_008": 192.62, "cauldron_009": 2.41,
      "cauldron_010": 203.81, "cauldron_011": 410.88, "cauldron_012": 174.48
    }
  },
  {
    "timestamp": "2025-10-30T00:01:00+00:00",
    "cauldron_levels": {
      "cauldron_001": 227.03, "cauldron_002": 240.29, "cauldron_003": 276.62,
      "cauldron_004": 181.67, "cauldron_005": 293.96, "cauldron_006": 160.39,
      "cauldron_007": 339.49, "cauldron_008": 192.68, "cauldron_009": 2.59,
      "cauldron_010": 203.89, "cauldron_011": 410.77, "cauldron_012": 174.62
    }
  }
];

// Calculate fill rates and initial volumes
const initialVolumes = timeSeriesData[0].cauldron_levels;

// Calculate fill rates by looking at the difference between consecutive readings
const fillRates = Object.fromEntries(
  Object.entries(timeSeriesData[1].cauldron_levels).map(([id, value]) => [
    id,
    value - timeSeriesData[0].cauldron_levels[id]
  ])
);

// Utility: build minute-by-minute history for each cauldron across the day (1440 min)
function buildHistory(cauldron: Cauldron, drains: DrainEvent[], initial = 0) {
  const minutes = 24 * 60; // 1440
  const values = new Array(minutes).fill(0);
  let cur = initial || initialVolumes[cauldron.id] || cauldron.maxVolume * 0.5;
  
  for (let m = 0; m < minutes; m++) {
    // fill at the calculated rate
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
    cauldrons: [
      { id: "cauldron_001", name: "Crimson Brew Cauldron", lat: 33.2148, lon: -97.1331, maxVolume: 1000, fillRatePerMin: fillRates["cauldron_001"] },
      { id: "cauldron_002", name: "Sapphire Mist Cauldron", lat: 33.2155, lon: -97.1325, maxVolume: 800, fillRatePerMin: fillRates["cauldron_002"] },
      { id: "cauldron_003", name: "Golden Elixir Cauldron", lat: 33.2142, lon: -97.1338, maxVolume: 1200, fillRatePerMin: fillRates["cauldron_003"] },
      { id: "cauldron_004", name: "Emerald Dreams Cauldron", lat: 33.216, lon: -97.1318, maxVolume: 750, fillRatePerMin: fillRates["cauldron_004"] },
      { id: "cauldron_005", name: "Violet Vapors Cauldron", lat: 33.2135, lon: -97.1345, maxVolume: 900, fillRatePerMin: fillRates["cauldron_005"] },
      { id: "cauldron_006", name: "Crystal Clear Cauldron", lat: 33.2165, lon: -97.131, maxVolume: 650, fillRatePerMin: fillRates["cauldron_006"] },
      { id: "cauldron_007", name: "Ruby Radiance Cauldron", lat: 33.2128, lon: -97.1352, maxVolume: 1100, fillRatePerMin: fillRates["cauldron_007"] },
      { id: "cauldron_008", name: "Azure Breeze Cauldron", lat: 33.217, lon: -97.1305, maxVolume: 700, fillRatePerMin: fillRates["cauldron_008"] },
      { id: "cauldron_009", name: "Amber Glow Cauldron", lat: 33.212, lon: -97.136, maxVolume: 950, fillRatePerMin: fillRates["cauldron_009"] },
      { id: "cauldron_010", name: "Pearl Shimmer Cauldron", lat: 33.2175, lon: -97.13, maxVolume: 850, fillRatePerMin: fillRates["cauldron_010"] },
      { id: "cauldron_011", name: "Onyx Shadow Cauldron", lat: 33.2115, lon: -97.1368, maxVolume: 1050, fillRatePerMin: fillRates["cauldron_011"] },
      { id: "cauldron_012", name: "Jade Serenity Cauldron", lat: 33.218, lon: -97.1295, maxVolume: 600, fillRatePerMin: fillRates["cauldron_012"] }
    ] as Cauldron[],
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

      // Fetch tickets from API
      const ticketsResponse = await fetch('/api/route?endpoint=tickets');
      if (!ticketsResponse.ok) {
        throw new Error('Failed to fetch tickets');
      }
      const ticketData = await ticketsResponse.json();

      // Process tickets and create drain events
      const drainEvents: DrainEvent[] = ticketData.map((ticket: any) => {
        // Parse the ticket date and add random minutes (0-1440) for the drain time
        const ticketDate = new Date(ticket.date);
        const startMin = Math.floor(Math.random() * 1440); // Random start time in the day
        
        return {
          cauldronId: ticket.cauldron_id,
          startMin: startMin,
          endMin: startMin + 15, // 15 minutes to drain
          removedVolume: ticket.amount
        };
      });

      // Define the market node with centered coordinates
      const marketNode: Cauldron = {
        id: "market",
        name: "Enchanted Market",
        lat: (33.2180 + 33.2115) / 2, // Center between min and max lat
        lon: (-97.1368 + -97.1295) / 2, // Center between min and max lon
        maxVolume: 99999,
        fillRatePerMin: 0
      };

      // Create edges connecting all cauldrons to the market
      const marketEdges: Edge[] = [];
      for (const c of data.cauldrons) {
        if (c.id !== "market") {
          marketEdges.push({
            from: c.id,
            to: "market",
            travelMin: 15 // Fixed 15 minute travel time
          });
        }
      }

      // Format tickets for our state
      const formattedTickets: Ticket[] = ticketData.map((t: any) => ({
        id: t.ticket_id,
        date: t.date,
        amount: t.amount,
        cauldronId: t.cauldron_id,
        courierId: t.courier_id
      }));

      // Update state with market edges and tickets
      setData(prev => ({
        ...prev,
        cauldrons: [...prev.cauldrons.filter(c => c.id !== "market"), marketNode],
        edges: marketEdges,
        tickets: formattedTickets,
        drains: drainEvents
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
        // Significant drop threshold: more than 5 units per minute or 1% of max volume, whichever is larger
        const threshold = Math.max(5, c.maxVolume * 0.01);
        if (delta > threshold) {
          results.push({ 
            cauldronId: c.id, 
            minute: i, 
            drop: Math.round(delta * 100) / 100 
          });
        }
      }
    }
    // Sort by minute to show chronological order
    return results.sort((a, b) => a.minute - b.minute);
  }, [histories, data.cauldrons]);


  // Ticket matching: For each ticket, find a drain (detected or known) on that day that best matches amount
  const matches = useMemo(() => {
    const matchResults: Array<{ ticket: Ticket; matchedDrain?: DrainEvent | { cauldronId: string; minute: number; drop: number }; difference?: number; suspicious?: boolean }> = [];
    for (const t of data.tickets) {
      // Consider both recorded drains and detected drains as candidates
      const candidates = [
        ...data.drains.map(d => ({ ...d, drop: d.removedVolume })),
        ...detectedDrains
      ];
      
      let best: (DrainEvent | { cauldronId: string; minute: number; drop: number }) | undefined;
      let bestDiff = Infinity;
      
      for (const d of candidates) {
        const diff = Math.abs(d.drop - t.amount);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = d;
        }
      }

      // Flag as suspicious if difference is >20 units or >10% of drain amount
      const drainAmount = best ? ('removedVolume' in best ? best.removedVolume : best.drop) : 0;
      const suspicious = bestDiff > Math.max(20, drainAmount * 0.1);
      matchResults.push({ 
        ticket: t, 
        matchedDrain: best, 
        difference: Math.round(bestDiff * 100) / 100, 
        suspicious 
      });
    }
    return matchResults;
  }, [data, detectedDrains]);


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
    const pad = 40;

    // Calculate viewport size maintaining aspect ratio of the geographical area
    const cauldrons = data.cauldrons.map(c => {
      const lat = c.lat;
      const lon = c.lon;
      const lats = data.cauldrons.filter(c => c.id !== "market").map(c => c.lat);
      const lons = data.cauldrons.filter(c => c.id !== "market").map(c => c.lon);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      
      // Calculate aspect ratio of the geographical area
      const latSpan = maxLat - minLat;
      const lonSpan = maxLon - minLon;
      
      if (c.id === "market") {
        return {
          ...c,
          normalizedLon: 0.5,
          normalizedLat: 0.5
        };
      }
      
      // Preserve aspect ratio by scaling both dimensions to the same unit scale
      const scale = Math.max(latSpan, lonSpan);
      const normalizedLon = (lon - minLon) / scale;
      const normalizedLat = (lat - minLat) / scale;
      
      return {
        ...c,
        normalizedLon,
        normalizedLat
      };
    });

    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto border rounded bg-purple-900">
          <rect x="0" y="0" width={w} height={h} rx={18} ry={18} fill="#1b0b2f" />
        {/* edges */}
        {data.edges.map((e, i) => {
          const fromCauldron = cauldrons.find((c) => c.id === e.from)!;
          const toCauldron = cauldrons.find((c) => c.id === e.to)!;
          const x1 = pad + fromCauldron.normalizedLon * (w - pad * 2);
          const y1 = pad + fromCauldron.normalizedLat * (h - pad * 2);
          const x2 = pad + toCauldron.normalizedLon * (w - pad * 2);
          const y2 = pad + toCauldron.normalizedLat * (h - pad * 2);
          return <line 
            key={i} 
            x1={x1} 
            y1={y1} 
            x2={x2} 
            y2={y2} 
            stroke="#16a34a" 
            strokeWidth={2} 
            opacity={0.9} 
          />;
        })}
        {/* nodes */}
          {cauldrons.map((c) => {
          const x = pad + c.normalizedLon * (w - pad * 2);
          const y = pad + c.normalizedLat * (h - pad * 2);
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
                <text x={-10} y={radius + 16} fontSize={11} textAnchor="middle" fill={value === c.maxVolume ? "#ff0000" : "#ffffff"}>
                  {Math.round((value || 0) * 100) / 100}L
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
                        <div className="text-xs text-green-400">max {c.maxVolume}L • fill {Math.round(c.fillRatePerMin * 100) / 100}L/min</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg ${v === c.maxVolume ? "text-red-500" : "text-green-200"}`}>{Math.round(v * 100) / 100}L</div>
                        <div className="text-xs text-green-400">{Math.round((v / c.maxVolume) * 100)}%</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>


          <section className="mt-4">
            <h2 className="font-semibold text-green-300">Detected Drain Events</h2>
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Cauldron</th>
                    <th className="text-right">Time</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedDrains.slice(0, 10).map((d, i) => {
                    const cauldron = data.cauldrons.find(c => c.id === d.cauldronId);
                    const hours = Math.floor(d.minute / 60);
                    const mins = d.minute % 60;
                    return (
                      <tr key={i} className="border-t border-zinc-800">
                        <td className="py-1">{cauldron?.name.split(' ')[0] || d.cauldronId}</td>
                        <td className="text-right">{hours}:{mins.toString().padStart(2, '0')}</td>
                        <td className="text-right text-red-400">-{d.drop}L</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>


          <section className="mt-4">
            <h2 className="font-semibold text-green-300">Tickets</h2>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-green-200 border-b border-green-800">
                    <th className="py-2 text-left">Ticket</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Details</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tickets.map((ticket) => {
                    const match = matches.find(m => m.ticket.id === ticket.id);
                    return (
                      <tr key={ticket.id} className={`border-b border-zinc-800 ${match?.suspicious ? "bg-red-900/50" : ""}`}>
                        <td className="py-3">
                          <div className="font-medium">{ticket.id}</div>
                          <div className="text-xs text-green-400">Date: {new Date(ticket.date).toLocaleDateString()}</div>
                        </td>
                        <td className="text-right">
                          <div>{Math.round(ticket.amount * 100) / 100}L</div>
                        </td>
                        <td className="text-center">
                          <div className="text-sm">{ticket.cauldronId}</div>
                          <div className="text-xs text-green-400">Courier: {ticket.courierId}</div>
                        </td>
                        <td className="text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${match?.suspicious ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"}`}>
                            {match?.suspicious ? "SUSPICIOUS" : "INNOCENT"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


