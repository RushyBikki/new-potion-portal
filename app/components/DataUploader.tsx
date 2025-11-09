"use client";


import React from "react";


/**
 * DataUploader
 * - Accepts a JSON file containing: { cauldrons: [], edges: [], drains: [], tickets: [] }
 * - Calls onLoad with parsed partial data
 */
export default function DataUploader({ onLoad, onReset }: { onLoad: (d: any) => void; onReset: () => void }) {
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const text = await f.text();
    try {
      // try JSON first
      const parsed = JSON.parse(text);
      onLoad(parsed);
    } catch (err) {
      // not JSON — simple CSV auto-detect not implemented, show error
      alert("Only JSON uploads supported in this demo. JSON should contain cauldrons, edges, drains, tickets arrays.");
    }
    e.target.value = "";
  }


  return (
  <div className="mb-4 p-3 border rounded bg-purple-900/60 border-purple-900">
      <div className="flex items-center gap-2">
        <label className="text-sm text-white">Upload JSON data</label>
        <div className="relative">
          <input type="file" accept="application/json" onChange={handleFile} className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="cursor-pointer bg-purple-800 hover:bg-purple-900 text-white px-3 py-1 rounded text-sm">
            Upload JSON
          </label>
        </div>
        <button onClick={onReset} className="ml-auto px-3 py-1 border border-purple-900 text-white rounded text-sm hover:bg-purple-900/10">
          Load sample
        </button>
      </div>


      <p className="mt-2 text-xs text-white">Expected JSON shape: {`{ cauldrons: [...], edges: [...], drains: [...], tickets: [...] }`}</p>
    </div>
  );
}
