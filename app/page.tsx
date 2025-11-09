"use client";


import React, { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CauldronDetails from "./CauldronDetails";
import bluePotionGif from "./components/bluepotion.gif";


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


// Scaled-down demo data for one day (1440 minutes); we'll compress playback for convenience
const SAMPLE_CAULDRONS: Cauldron[] = [
  { id: "c1", name: "North Cauldron", lat: 0.8, lon: 0.2, maxVolume: 1000, fillRatePerMin: 0.6 },
  { id: "c2", name: "East Cauldron", lat: 0.6, lon: 0.7, maxVolume: 800, fillRatePerMin: 0.9 },
  { id: "c3", name: "South Cauldron", lat: 0.2, lon: 0.4, maxVolume: 1200, fillRatePerMin: 0.4 },
  { id: "market", name: "Enchanted Market", lat: 0.5, lon: 0.5, maxVolume: 99999, fillRatePerMin: 0 },
];


const SAMPLE_EDGES: Edge[] = [
  { from: "c1", to: "c2", travelMin: 10 },
  { from: "c2", to: "c3", travelMin: 8 },
  { from: "c3", to: "c1", travelMin: 12 },
  { from: "c1", to: "market", travelMin: 7 },
  { from: "c2", to: "market", travelMin: 9 },
  { from: "c3", to: "market", travelMin: 6 },
];


// Small set of drain events (minute index 0..1439). For demo, we pick a few drain windows.
type DrainEvent = { cauldronId: string; startMin: number; endMin: number; removedVolume: number };


const SAMPLE_DRAINS: DrainEvent[] = [
  { cauldronId: "c1", startMin: 180, endMin: 185, removedVolume: 150 },
  { cauldronId: "c2", startMin: 480, endMin: 485, removedVolume: 300 },
  { cauldronId: "c3", startMin: 900, endMin: 905, removedVolume: 250 },
];


// Tickets that arrive with only a date (we're modelling a single-day run; use same date for simplicity)
const SAMPLE_TICKETS: Ticket[] = [
  { id: "t1", date: "2025-11-08", amount: 150 },
  { id: "t2", date: "2025-11-08", amount: 285 }, // slightly different
  { id: "t3", date: "2025-11-08", amount: 400 }, // bogus / suspicious
];


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
  const [data, setData] =
  useState(() => ({
    cauldrons: SAMPLE_CAULDRONS,
    edges: SAMPLE_EDGES,
    drains: SAMPLE_DRAINS,
    tickets: SAMPLE_TICKETS,
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const minutes = 24 * 60;


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


  function handleLoad(parsed: any) {
    // expect parsed to have optional arrays
    setData((prev) => ({
      cauldrons: parsed.cauldrons ?? prev.cauldrons,
      edges: parsed.edges ?? prev.edges,
      drains: parsed.drains ?? prev.drains,
      tickets: parsed.tickets ?? prev.tickets,
    }));
    setSelectedId(null);
    setMinute(0);
  }


  function handleResetSample() {
    setData({ cauldrons: SAMPLE_CAULDRONS, edges: SAMPLE_EDGES, drains: SAMPLE_DRAINS, tickets: SAMPLE_TICKETS });
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
        <h1 className="text-3xl font-extrabold text-black">Peter's Potion Portal</h1>
        <p className="text-sm text-black">HackUTD2025</p>
      </header>


  <div className="flex gap-0">
    {/* Left sidebar */}
  <div className="flex-none min-w-[200px] bg-green-900 border border-green-800 p-4 rounded-lg overflow-hidden">
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