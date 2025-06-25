// Service Worker for Smart To-Do List
const CACHE_NAME = 'smart-todo-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

// Install Event - Cache Resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('Service Worker: Activation failed', error);
      })
  );
});

// Fetch Event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch((error) => {
        console.error('Service Worker: Fetch failed', error);
        // Return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.notification.tag);
  
  event.notification.close();
  
  // Handle different notification actions
  if (event.action === 'complete-task') {
    // Handle task completion from notification
    handleTaskCompletion(event.notification.data.taskId);
  } else if (event.action === 'snooze-task') {
    // Handle task snoozing from notification
    handleTaskSnooze(event.notification.data.taskId);
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If app is already open, focus on it
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              return client.focus();
            }
          }
          // Otherwise, open new window
          return clients.openWindow('/');
        })
    );
  }
});

// Background Sync Event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'task-reminder-sync') {
    event.waitUntil(checkTaskDeadlines());
  } else if (event.tag === 'task-backup-sync') {
    event.waitUntil(backupTasks());
  }
});

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync triggered', event.tag);
  
  if (event.tag === 'task-deadline-check') {
    event.waitUntil(performPeriodicTaskCheck());
  }
});

// Push Event for future push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push message received');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('Service Worker: Error parsing push data', error);
      notificationData = {
        title: 'Smart To-Do List',
        body: event.data.text() || 'You have a notification',
        icon: '/icon-192.png',
        badge: '/badge-72.png'
      };
    }
  }
  
  const notificationOptions = {
    body: notificationData.body || 'You have a task reminder',
    icon: notificationData.icon || '/icon-192.png',
    badge: notificationData.badge || '/badge-72.png',
    tag: notificationData.tag || 'general',
    data: notificationData.data || {},
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'View Tasks',
        icon: '/icon-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-dismiss.png'
      }
    ],
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    vibrate: notificationData.vibrate || [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Smart To-Do List',
      notificationOptions
    )
  );
});

// Helper Functions
function checkTaskDeadlines() {
  return new Promise((resolve, reject) => {
    try {
      // Get tasks from IndexedDB or localStorage
      getStoredTasks()
        .then((tasks) => {
          const now = new Date();
          const notifications = [];
          
          tasks.forEach((task) => {
            if (!task.completed) {
              const deadline = new Date(`${task.deadlineDate}T${task.deadlineTime}`);
              const timeDiff = deadline - now;
              const hoursDiff = timeDiff / (1000 * 60 * 60);
              
              // Check for upcoming deadlines
              if (hoursDiff > 0 && hoursDiff <= 24 && !task.notified24h) {
                notifications.push({
                  title: 'Task Due Tomorrow',
                  body: `"${task.title}" is due tomorrow at ${task.deadlineTime}`,
                  tag: `task-${task.id}-24h`,
                  data: { taskId: task.id, type: '24h-reminder' },
                  actions: [
                    { action: 'complete-task', title: 'Mark Complete' },
                    { action: 'snooze-task', title: 'Snooze 1h' }
                  ]
                });
                task.notified24h = true;
              }
              
              // Check for overdue tasks
              if (timeDiff < 0 && !task.notifiedOverdue) {
                const overdueDays = Math.ceil(Math.abs(timeDiff) / (1000 * 60 * 60 * 24));
                notifications.push({
                  title: 'Overdue Task',
                  body: `"${task.title}" is ${overdueDays} day(s) overdue`,
                  tag: `task-${task.id}-overdue`,
                  data: { taskId: task.id, type: 'overdue' },
                  requireInteraction: true,
                  actions: [
                    { action: 'complete-task', title: 'Mark Complete' },
                    { action: 'view', title: 'View Task' }
                  ]
                });
                task.notifiedOverdue = true;
              }
            }
          });
          
          // Send all notifications
          return Promise.all(
            notifications.map(notification => 
              self.registration.showNotification(notification.title, notification)
            )
          );
        })
        .then(() => {
          console.log('Service Worker: Task deadline check completed');
          resolve();
        })
        .catch(reject);
    } catch (error) {
      console.error('Service Worker: Error checking task deadlines', error);
      reject(error);
    }
  });
}

function performPeriodicTaskCheck() {
  return new Promise((resolve) => {
    console.log('Service Worker: Performing periodic task check');
    
    // This would run periodically to check for task deadlines
    checkTaskDeadlines()
      .then(() => {
        console.log('Service Worker: Periodic task check completed');
        resolve();
      })
      .catch((error) => {
        console.error('Service Worker: Periodic task check failed', error);
        resolve(); // Don't reject to avoid breaking the periodic sync
      });
  });
}

function getStoredTasks() {
  return new Promise((resolve) => {
    // Since service workers can't access localStorage directly,
    // we'll use postMessage to get tasks from the main thread
    self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        clients[0].postMessage({
          type: 'GET_TASKS_REQUEST'
        });
        
        // Listen for response
        const messageHandler = (event) => {
          if (event.data.type === 'GET_TASKS_RESPONSE') {
            self.removeEventListener('message', messageHandler);
            resolve(event.data.tasks || []);
          }
        };
        
        self.addEventListener('message', messageHandler);
        
        // Timeout fallback
        setTimeout(() => {
          self.removeEventListener('message', messageHandler);
          resolve([]);
        }, 5000);
      } else {
        resolve([]);
      }
    });
  });
}

function handleTaskCompletion(taskId) {
  return self.clients.matchAll().then((clients) => {
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'COMPLETE_TASK',
        taskId: taskId
      });
    }
  });
}

function handleTaskSnooze(taskId) {
  return self.clients.matchAll().then((clients) => {
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'SNOOZE_TASK',
        taskId: taskId,
        snoozeMinutes: 60
      });
    }
  });
}

function backupTasks() {
  return new Promise((resolve) => {
    console.log('Service Worker: Backing up tasks');
    
    getStoredTasks()
      .then((tasks) => {
        // Here you could implement cloud backup
        // For now, just log the backup operation
        console.log(`Service Worker: Backed up ${tasks.length} tasks`);
        resolve();
      })
      .catch((error) => {
        console.error('Service Worker: Backup failed', error);
        resolve();
      });
  });
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'SCHEDULE_NOTIFICATION':
      scheduleTaskNotification(event.data.task);
      break;
      
    case 'CANCEL_NOTIFICATION':
      cancelTaskNotification(event.data.taskId);
      break;
      
    default:
      console.log('Service Worker: Unknown message type', event.data.type);
  }
});

function scheduleTaskNotification(task) {
  console.log('Service Worker: Scheduling notification for task', task.id);
  
  // Register background sync for this task
  self.registration.sync.register(`task-reminder-${task.id}`)
    .then(() => {
      console.log('Service Worker: Background sync registered for task', task.id);
    })
    .catch((error) => {
      console.error('Service Worker: Failed to register background sync', error);
    });
}

function cancelTaskNotification(taskId) {
  console.log('Service Worker: Cancelling notification for task', taskId);
  
  // Close any existing notifications for this task
  self.registration.getNotifications({ tag: `task-${taskId}` })
    .then((notifications) => {
      notifications.forEach(notification => notification.close());
    })
    .catch((error) => {
      console.error('Service Worker: Failed to cancel notifications', error);
    });
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker: Global error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection', event.reason);
  event.preventDefault();
});

console.log('Service Worker: Script loaded successfully');