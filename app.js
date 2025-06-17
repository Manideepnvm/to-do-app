document.addEventListener('DOMContentLoaded', () => {
  const taskList = document.getElementById('task-list');
  const addTaskButton = document.getElementById('add-task');
  const searchInput = document.getElementById('search-bar');
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const sortDeadlineButton = document.getElementById('sort-deadline');
  const filterCompletedButton = document.getElementById('filter-completed');
  const filterPendingButton = document.getElementById('filter-pending');

  // Load tasks from localStorage
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

  // Initialize dark mode
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function renderTasks(filteredTasks = tasks) {
    taskList.innerHTML = ''; // Clear the task list before rendering
    filteredTasks.forEach((task, index) => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div>
          <strong>${task.title}</strong> (${task.priority})
          <p>${task.description}</p>
          <small>Due: ${new Date(task.deadline).toLocaleDateString()}</small>
        </div>
        <div>
          <button onclick="markComplete(${index})">${task.completed ? 'Undo' : 'Complete'}</button>
          <button onclick="deleteTask(${index})">Delete</button>
        </div>
      `;
      li.classList.add(`priority-${task.priority.toLowerCase()}`);
      taskList.appendChild(li);
    });
  }

  window.markComplete = (index) => {
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
    renderTasks();
  };

  window.deleteTask = (index) => {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  };

  addTaskButton.addEventListener('click', () => {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    if (!title || !deadline) return alert('Please fill in all fields.');

    // Add new task
    const newTask = { title, description, deadline, priority, completed: false };
    tasks.push(newTask);
    saveTasks();
    renderTasks();

    // Schedule notifications for the new task
    scheduleNotificationsForTask(newTask);

    // Clear input fields
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
  });

  function scheduleNotificationsForTask(task) {
    const now = new Date();
    const deadline = new Date(task.deadline);

    // Check if the deadline is within 3 days
    const threeDaysBeforeDeadline = new Date(deadline);
    threeDaysBeforeDeadline.setDate(threeDaysBeforeDeadline.getDate() - 3);

    if (now < threeDaysBeforeDeadline) {
      // Schedule a reminder every day starting 3 days before the deadline
      const intervalId = setInterval(() => {
        const today = new Date();
        if (today >= threeDaysBeforeDeadline && today < deadline) {
          showNotification(`Reminder: Task "${task.title}" is due in ${Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))} days!`);
        } else if (today >= deadline) {
          showNotification(`Deadline Alert: Task "${task.title}" is overdue!`);
          clearInterval(intervalId); // Stop reminders after the deadline
        }
      }, 24 * 60 * 60 * 1000); // Check once per day
    } else if (now < deadline) {
      // If less than 3 days left, send a single reminder
      showNotification(`Reminder: Task "${task.title}" is due in ${Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))} days!`);
    }
  }

  function showNotification(message) {
    if (Notification.permission === 'granted') {
      new Notification('Smart To-Do List', { body: message });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Smart To-Do List', { body: message });
        }
      });
    }
  }

  // Periodically check for upcoming deadlines
  setInterval(() => {
    tasks.forEach(task => {
      if (!task.completed) {
        scheduleNotificationsForTask(task);
      }
    });
  }, 60 * 60 * 1000); // Check every hour

  // Search functionality
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filteredTasks = tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    );
    renderTasks(filteredTasks);
  });

  // Sort by Deadline
  sortDeadlineButton.addEventListener('click', () => {
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    renderTasks(sortedTasks);
  });

  // Show Completed Tasks
  filterCompletedButton.addEventListener('click', () => {
    const completedTasks = tasks.filter(task => task.completed);
    renderTasks(completedTasks);
  });

  // Show Pending Tasks
  filterPendingButton.addEventListener('click', () => {
    const pendingTasks = tasks.filter(task => !task.completed);
    renderTasks(pendingTasks);
  });

  // Dark mode toggle
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙'; // Switch icon
  });

  // Initial render of tasks
  renderTasks();
});