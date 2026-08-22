// Retirement worker for the legacy ProjTrack notification/cache worker.
// It intentionally has no fetch or push handlers.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('projtrack-'))
        .map(name => caches.delete(name))
    )
    await self.registration.unregister()
    await self.clients.claim()
    const windows = await self.clients.matchAll({ type: 'window' })
    await Promise.all(windows.map(client => client.navigate(client.url)))
  })())
})
