"use client";

import React from "react";

type Cauldron = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  maxVolume: number;
  fillRatePerMin: number;
};

export default function CauldronDetails({
  cauldron,
  history,
  minute,
  onClose,
}: {
  cauldron: Cauldron;
  history: number[];
  minute: number;
  onClose: () => void;
}) {
  const current = Math.round(history[minute] || 0);
  const pct = Math.round((current / cauldron.maxVolume) * 100);

  return (
    <div className="text-white">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold text-white">{cauldron.name}</div>
          <div className="text-xs text-white">id: {cauldron.id}</div>
        </div>
        <div>
          <button onClick={onClose} className="px-2 py-1 border border-purple-900 rounded text-sm text-white">Close</button>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-extrabold text-white">{current}u</div>
        <div className="text-sm text-white">({pct}% of {cauldron.maxVolume}u)</div>
        <div className="text-xs text-white mt-1">fill rate {cauldron.fillRatePerMin}/min</div>
      </div>
    </div>
  );
}
