// public/app.js
(async function () {
  // Create a Leaflet map without adding any tile layer (no world map).
  // Map still provides coordinate handling and layers for markers/polylines.
  
    const map = L.map('map', { preferCanvas: true, attributionControl: false, zoomControl: false }).setView([0, 0], 2);
  
    // Icons using your GIFs
  const marketIcon = L.icon({
    iconUrl: '/images/market.gif',
    iconSize: [64, 64],
    iconAnchor: [32, 64]
  });

  const cauldronIcon = L.icon({
    iconUrl: '/images/greepotion.gif',
    iconSize: [48, 48],
    iconAnchor: [24, 48]
  });

  // Fetch cauldrons from your existing proxy endpoint
  async function loadCauldrons() {
    const res = await fetch('/proxy/data');
    if (!res.ok) throw new Error('/proxy/data returned ' + res.status);
    return res.json();
  }

  try {
    const data = await loadCauldrons();

    // Place market at 0,0 (non-interactive)
    const marketMarker = L.marker([0, 0], { icon: marketIcon, interactive: false }).addTo(map);

    const markers = [marketMarker];

    // Place cauldrons and draw dotted lines to market
    for (const item of data) {
      // adapt these extractions if your API uses different keys or nested objects
      const lat = item.latitude ?? item.lat ?? item.y ?? item.location?.lat ?? item.position?.lat;
      const lon = item.longitude ?? item.lon ?? item.x ?? item.location?.lon ?? item.position?.lon ?? item.location?.lng ?? item.coords?.lng;
      if (lat == null || lon == null) continue;

      const marker = L.marker([lat, lon], { icon: cauldronIcon }).addTo(map);

      // Popup HTML with a button so the GIF remains the marker itself
      const id = item.id ?? Math.random().toString(36).slice(2, 9);
      const name = item.name ?? item.id ?? 'Cauldron';
      const popupHtml = `
        <div style="text-align:center">
          <button class="cauldron-btn" data-id="${id}" style="
            display:inline-flex;align-items:center;gap:8px;
            padding:6px 10px;border-radius:8px;border:1px solid #444;
            background:rgba(255,255,255,0.95);cursor:pointer;
          ">
            <img src="/images/greepotion.gif" style="width:20px;height:20px;object-fit:contain" />
            <span style="font-size:14px">${name}</span>
          </button>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const popupEl = marker.getPopup().getElement();
        if (!popupEl) return;
        const btn = popupEl.querySelector('button.cauldron-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
          console.log('Cauldron clicked', item);
          marker.closePopup();
          // your action here
        }, { once: true });
      });

      markers.push(marker);

      // dotted line to market
      L.polyline([[lat, lon], [0, 0]], {
        color: '#2d2d2d',
        weight: 2,
        dashArray: '6 6',
        opacity: 0.95,
        interactive: false
      }).addTo(map);
    }

    // Fit map to show market plus cauldrons; fallback to 0,0 view if none
    if (markers.length > 1) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    } else {
      map.setView([0, 0], 2);
    }
  } catch (err) {
    console.error('Error loading/placing cauldrons:', err);
  }

  // Logbook button behavior (unchanged)
  const logbookBtn = document.getElementById('logbook-btn');
  if (logbookBtn) {
    logbookBtn.addEventListener('click', () => {
      const overlayId = 'logbook-overlay';
      if (document.getElementById(overlayId)) return;

      const overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.style.position = 'fixed';
      overlay.style.top = '12px';
      overlay.style.left = '12px';
      overlay.style.width = 'min(80vw,600px)';
      overlay.style.maxHeight = '80vh';
      overlay.style.overflow = 'auto';
      overlay.style.background = 'rgba(255,255,255,0.98)';
      overlay.style.border = '1px solid #444';
      overlay.style.borderRadius = '8px';
      overlay.style.padding = '12px';
      overlay.style.zIndex = 1300;

      overlay.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>Logbook</strong>
          <button id="logbook-close" style="padding:4px 8px;cursor:pointer">Close</button>
        </div>
        <div id="logbook-contents">No entries yet.</div>
      `;
      document.body.appendChild(overlay);
      document.getElementById('logbook-close').addEventListener('click', () => overlay.remove());
    });
  }
})();