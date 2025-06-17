self.addEventListener('install', () => {
  console.log('Service Worker Installed');
});

self.addEventListener('activate', () => {
  console.log('Service Worker Activated');
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  clients.openWindow('/');
});

function showNotification(title, options) {
  self.registration.showNotification(title, options);
}

// Periodic Sync for Notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'notify-deadline') {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.forEach(task => {
      if (!task.completed) {
        const now = new Date();
        const deadline = new Date(task.deadline);
        const threeDaysBeforeDeadline = new Date(deadline);
        threeDaysBeforeDeadline.setDate(threeDaysBeforeDeadline.getDate() - 3);

        if (now >= threeDaysBeforeDeadline && now < deadline) {
          showNotification(`Reminder: Task "${task.title}" is due soon!`, {
            body: `Due on ${deadline.toLocaleDateString()}`
          });
        } else if (now >= deadline) {
          showNotification(`Deadline Alert: Task "${task.title}" is overdue!`, {
            body: `This task is past its deadline.`
          });
        }
      }
    });
  }
});