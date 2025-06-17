self.addEventListener('install', (event) => {
  console.log('Service Worker Installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker Activated');
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  clients.openWindow('/');
});

function showNotification(title, options) {
  self.registration.showNotification(title, options);
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'notify-deadline') {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.forEach(task => {
      if (!task.completed && new Date(task.deadline) <= new Date()) {
        showNotification('Task Deadline!', {
          body: `Your task "${task.title}" is due now!`,
          icon: '/icons/icon.png'
        });
      }
    });
  }
});