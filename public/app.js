// from browser JS
async function loadCauldrons() {
  const res = await fetch('/proxy/data');
  if (!res.ok) throw new Error('Failed to load');
  const data = await res.json();
  return data;
}