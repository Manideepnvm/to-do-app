document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const taskList = document.getElementById('task-list');
  const addTaskButton = document.getElementById('add-task');
  const searchInput = document.getElementById('search-bar');
  const sortDeadlineButton = document.getElementById('sort-deadline');
  const sortPriorityButton = document.getElementById('sort-priority');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const clearCompletedButton = document.getElementById('clear-completed');
  const exportDataButton = document.getElementById('export-data');
  const emptyState = document.getElementById('empty-state');
  const loadingOverlay = document.getElementById('loading-overlay');
  const toastContainer = document.getElementById('toast-container');
  const confirmationModal = document.getElementById('confirmation-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');

  // Input Elements
  const titleInput = document.getElementById('task-title');
  const descriptionInput = document.getElementById('task-description');
  const deadlineDateInput = document.getElementById('task-deadline-date');
  const deadlineTimeInput = document.getElementById('task-deadline-time');
  const priorityInput = document.getElementById('task-priority');
  const titleFeedback = document.getElementById('title-feedback');
  const descCounter = document.getElementById('desc-counter');

  // Stats Elements
  const totalTasksEl = document.getElementById('total-tasks');
  const pendingTasksEl = document.getElementById('pending-tasks');
  const completedTasksEl = document.getElementById('completed-tasks');

  // State Management
  let tasks = [];
  let currentFilter = 'all';
  let currentSort = 'none';
  let isLoading = false;

  // Initialize Application
  function init() {
    showLoading();
    loadTasks();
    initializeDarkMode();
    setupEventListeners();
    setupInputValidation();
    requestNotificationPermission();
    setMinDate();
    hideLoading();
    renderTasks();
    updateStats();
  }

  // Local Storage Functions
  function loadTasks() {
    try {
      const savedTasks = localStorage.getItem('tasks');
      tasks = savedTasks ? JSON.parse(savedTasks) : [];
      
      // Validate and clean tasks data
      tasks = tasks.filter(task => 
        task.title && task.deadlineDate && task.deadlineTime && task.priority
      );
    } catch (error) {
      console.error('Error loading tasks:', error);
      tasks = [];
      showToast('Error loading tasks. Starting fresh.', 'error');
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
      showToast('Error saving tasks. Please try again.', 'error');
    }
  }

  // Dark Mode Functions
  function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      darkModeToggle.querySelector('.theme-icon').textContent = '☀️';
    }
  }

  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    darkModeToggle.querySelector('.theme-icon').textContent = isDarkMode ? '☀️' : '🌙';
    showToast(`${isDarkMode ? 'Dark' : 'Light'} mode enabled`, 'success');
  }

  // Task Management Functions
  function addTask() {
    if (!validateInputs()) return;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const deadlineDate = deadlineDateInput.value;
    const deadlineTime = deadlineTimeInput.value;
    const priority = priorityInput.value;

    const newTask = {
      id: generateId(),
      title,
      description,
      deadlineDate,
      deadlineTime,
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    updateStats();
    clearInputs();
    scheduleNotification(newTask);
    showToast('Task added successfully!', 'success');
  }

  function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    
    saveTasks();
    renderTasks();
    updateStats();
    
    const message = task.completed ? 'Task completed!' : 'Task marked as pending';
    showToast(message, 'success');
  }

  function deleteTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    showConfirmation(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      () => {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderTasks();
        updateStats();
        showToast('Task deleted successfully', 'success');
      }
    );
  }

  function clearCompletedTasks() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
      showToast('No completed tasks to clear', 'info');
      return;
    }

    showConfirmation(
      'Clear Completed Tasks',
      `Are you sure you want to delete ${completedCount} completed task(s)?`,
      () => {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderTasks();
        updateStats();
        showToast(`${completedCount} completed tasks cleared`, 'success');
      }
    );
  }

  // Rendering Functions
  function renderTasks() {
    let filteredTasks = getFilteredTasks();
    filteredTasks = getSortedTasks(filteredTasks);

    if (filteredTasks.length === 0) {
      taskList.style.display = 'none';
      emptyState.style.display = 'block';
      updateEmptyStateMessage();
    } else {
      taskList.style.display = 'block';
      emptyState.style.display = 'none';
      
      taskList.innerHTML = '';
      filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
      });
    }
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority.toLowerCase()}`;
    li.setAttribute('data-task-id', task.id);

    const isOverdue = !task.completed && isTaskOverdue(task);
    const timeInfo = getTimeInfo(task);

    li.innerHTML = `
      <div class="task-content">
        <div class="task-header">
          <div class="task-checkbox">
            <input type="checkbox" ${task.completed ? 'checked' : ''} class="complete-checkbox">
            <span class="checkmark"></span>
          </div>
          <div class="task-info">
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            <div class="task-meta">
              <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
              <span class="deadline-info ${isOverdue ? 'overdue' : ''}">${timeInfo}</span>
            </div>
          </div>
        </div>
        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
      </div>
      <div class="task-actions">
        <button class="action-btn edit-btn" title="Edit Task">
          <span>✏️</span>
        </button>
        <button class="action-btn delete-btn" title="Delete Task">
          <span>🗑️</span>
        </button>
      </div>
    `;

    // Event Listeners
    const checkbox = li.querySelector('.complete-checkbox');
    const deleteBtn = li.querySelector('.delete-btn');
    const editBtn = li.querySelector('.edit-btn');

    checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    editBtn.addEventListener('click', () => editTask(task.id));

    return li;
  }

  function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    titleInput.value = task.title;
    descriptionInput.value = task.description;
    deadlineDateInput.value = task.deadlineDate;
    deadlineTimeInput.value = task.deadlineTime;
    priorityInput.value = task.priority;

    // Change add button to update button
    addTaskButton.textContent = 'Update Task';
    addTaskButton.setAttribute('data-editing', taskId);
    
    titleInput.focus();
    showToast('Editing task...', 'info');
  }

  function updateTask(taskId) {
    if (!validateInputs()) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.title = titleInput.value.trim();
    task.description = descriptionInput.value.trim();
    task.deadlineDate = deadlineDateInput.value;
    task.deadlineTime = deadlineTimeInput.value;
    task.priority = priorityInput.value;

    saveTasks();
    renderTasks();
    updateStats();
    clearInputs();
    resetAddButton();
    showToast('Task updated successfully!', 'success');
  }

  // Filtering and Sorting Functions
  function getFilteredTasks() {
    const query = searchInput.value.toLowerCase();
    
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(query) || 
                           task.description.toLowerCase().includes(query);
      
      switch (currentFilter) {
        case 'completed':
          return matchesSearch && task.completed;
        case 'pending':
          return matchesSearch && !task.completed;
        default:
          return matchesSearch;
      }
    });

    return filtered;
  }

  function getSortedTasks(tasks) {
    switch (currentSort) {
      case 'deadline':
        return [...tasks].sort((a, b) => {
          const aDate = new Date(`${a.deadlineDate}T${a.deadlineTime}`);
          const bDate = new Date(`${b.deadlineDate}T${b.deadlineTime}`);
          return aDate - bDate;
        });
      case 'priority':
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return [...tasks].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
      default:
        return tasks;
    }
  }

  function setFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderTasks();
  }

  function setSort(sort) {
    currentSort = currentSort === sort ? 'none' : sort;
    renderTasks();
    
    const sortText = currentSort === 'none' ? 'Default' : 
                    currentSort === 'deadline' ? 'Deadline' : 'Priority';
    showToast(`Sorted by ${sortText}`, 'info');
  }

  // Utility Functions
  function validateInputs() {
    const title = titleInput.value.trim();
    const deadlineDate = deadlineDateInput.value;
    const deadlineTime = deadlineTimeInput.value;

    if (!title) {
      showValidationError('title-feedback', 'Task title is required');
      titleInput.focus();
      return false;
    }

    if (!deadlineDate || !deadlineTime) {
      showToast('Please set a deadline date and time', 'error');
      return false;
    }

    const deadlineDateTime = new Date(`${deadlineDate}T${deadlineTime}`);
    if (deadlineDateTime <= new Date()) {
      showToast('Deadline must be in the future', 'error');
      return false;
    }

    clearValidationError('title-feedback');
    return true;
  }

  function showValidationError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
    }
  }

  function clearValidationError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = '';
      element.style.display = 'none';
    }
  }

  function clearInputs() {
    titleInput.value = '';
    descriptionInput.value = '';
    deadlineDateInput.value = '';
    deadlineTimeInput.value = '';
    priorityInput.value = 'Medium';
    updateDescCounter();
    clearValidationError('title-feedback');
  }

  function resetAddButton() {
    addTaskButton.textContent = '+ Add Task';
    addTaskButton.removeAttribute('data-editing');
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function isTaskOverdue(task) {
    const deadline = new Date(`${task.deadlineDate}T${task.deadlineTime}`);
    return deadline < new Date();
  }

  function getTimeInfo(task) {
    const deadline = new Date(`${task.deadlineDate}T${task.deadlineTime}`);
    const now = new Date();
    const diff = deadline - now;

    if (task.completed) {
      return `Completed on ${new Date(task.completedAt).toLocaleDateString()}`;
    }

    if (diff < 0) {
      return `Overdue by ${formatTimeDiff(Math.abs(diff))}`;
    }

    return `Due ${formatTimeDiff(diff)}`;
  }

  function formatTimeDiff(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    return 'soon';
  }

  function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    deadlineDateInput.min = today;
  }

  function updateDescCounter() {
    const count = descriptionInput.value.length;
    descCounter.textContent = `${count}/300`;
    descCounter.style.color = count > 250 ? '#ff6b6b' : '#6c757d';
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    pendingTasksEl.textContent = pending;
  }

  function updateEmptyStateMessage() {
    const emptyIcon = emptyState.querySelector('.empty-icon');
    const emptyTitle = emptyState.querySelector('h3');
    const emptyDesc = emptyState.querySelector('p');

    if (currentFilter === 'completed') {
      emptyIcon.textContent = '✅';
      emptyTitle.textContent = 'No completed tasks';
      emptyDesc.textContent = 'Complete some tasks to see them here!';
    } else if (currentFilter === 'pending') {
      emptyIcon.textContent = '🎉';
      emptyTitle.textContent = 'All tasks completed!';
      emptyDesc.textContent = 'Great job! All your tasks are done.';
    } else {
      emptyIcon.textContent = '📝';
      emptyTitle.textContent = 'No tasks yet';
      emptyDesc.textContent = 'Create your first task to get started!';
    }
  }

  // UI Functions
  function showLoading() {
    isLoading = true;
    loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    isLoading = false;
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
    }, 500);
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      removeToast(toast);
    }, 5000);
  }

  function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  function showConfirmation(title, message, onConfirm) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmationModal.classList.remove('hidden');

    const handleConfirm = () => {
      confirmationModal.classList.add('hidden');
      onConfirm();
      cleanup();
    };

    const handleCancel = () => {
      confirmationModal.classList.add('hidden');
      cleanup();
    };

    const cleanup = () => {
      modalConfirm.removeEventListener('click', handleConfirm);
      modalCancel.removeEventListener('click', handleCancel);
    };

    modalConfirm.addEventListener('click', handleConfirm);
    modalCancel.addEventListener('click', handleCancel);
  }

  // Export/Import Functions
  function exportData() {
    const data = {
      tasks: tasks,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
  }

  // Notification Functions
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Notifications enabled!', 'success');
        }
      });
    }
  }

  function scheduleNotification(task) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const deadline = new Date(`${task.deadlineDate}T${task.deadlineTime}`);
    const now = new Date();
    const timeDiff = deadline - now;

    // Schedule notification 1 hour before deadline
    const oneHourBefore = timeDiff - (60 * 60 * 1000);
    if (oneHourBefore > 0) {
      setTimeout(() => {
        if (!task.completed) {
          new Notification('Task Reminder', {
            body: `"${task.title}" is due in 1 hour!`,
            icon: '/favicon.ico'
          });
        }
      }, oneHourBefore);
    }

    // Schedule notification at deadline
    if (timeDiff > 0) {
      setTimeout(() => {
        if (!task.completed) {
          new Notification('Task Deadline', {
            body: `"${task.title}" is due now!`,
            icon: '/favicon.ico'
          });
        }
      }, timeDiff);
    }
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Add/Update Task
    addTaskButton.addEventListener('click', () => {
      const editingId = addTaskButton.getAttribute('data-editing');
      if (editingId) {
        updateTask(editingId);
      } else {
        addTask();
      }
    });

    // Enter key to add task
    titleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addTaskButton.click();
      }
    });

    // Search
    searchInput.addEventListener('input', renderTasks);

    // Sort buttons
    sortDeadlineButton.addEventListener('click', () => setSort('deadline'));
    sortPriorityButton.addEventListener('click', () => setSort('priority'));

    // Filter buttons
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    // Dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Clear completed tasks
    clearCompletedButton.addEventListener('click', clearCompletedTasks);

    // Export data
    exportDataButton.addEventListener('click', exportData);

    // Modal close on background click
    confirmationModal.addEventListener('click', (e) => {
      if (e.target === confirmationModal) {
        confirmationModal.classList.add('hidden');
      }
    });
  }

  function setupInputValidation() {
    // Title validation
    titleInput.addEventListener('input', () => {
      if (titleInput.value.trim()) {
        clearValidationError('title-feedback');
      }
    });

    // Description character counter
    descriptionInput.addEventListener('input', updateDescCounter);
  }

  // Initialize the application
  init();
});