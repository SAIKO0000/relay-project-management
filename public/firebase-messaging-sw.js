// Demo deployments do not register this worker. It intentionally contains no
// Firebase project credentials and only preserves safe notification navigation.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const urlToOpen = data.type === 'task_deadline' && data.taskId
    ? `/?task=${encodeURIComponent(data.taskId)}`
    : '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => client.url.includes(self.location.origin))
      return existingClient ? existingClient.focus() : clients.openWindow(urlToOpen)
    })
  )
})
