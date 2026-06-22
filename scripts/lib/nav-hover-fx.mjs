// Hover "dark→bright" effect for the 3 nav buttons via CSS filter (no image swap).
// Smoothly brightens the button on hover. Non-destructive injected <style>.

const KEYS = ['store', 'exchange', 'index'];
const SEL = KEYS.map((k) => `.star-site-fab-kv-link_box-${k}`).join(',');

export const NAVFX_HTML =
  `<style data-mirror-navfx>` +
  `${SEL}{transition:filter .22s ease,transform .22s ease;will-change:filter;}` +
  `${KEYS.map((k) => `.star-site-fab-kv-link_box-${k}:hover`).join(',')}` +
  `{filter:brightness(1.28) saturate(1.05);transform:translateY(-1px);cursor:pointer;}` +
  `</style>`;
