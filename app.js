document.addEventListener('DOMContentLoaded', () => {
  const taskList = document.getElementById('task-list');
  const addTaskButton = document.getElementById('add-task');
  const sortDeadlineButton = document.getElementById('sort-deadline');
  const filterCompletedButton = document.getElementById('filter-completed');
  const filterPendingButton = document.getElementById('filter-pending');
  const searchBar = document.getElementById('search-bar');
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function renderTasks(filteredTasks = tasks) {
    taskList.innerHTML = '';
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
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;
    const recurring = document.getElementById('recurring-task').checked;

    if (!title || !deadline) return alert('Please fill in all fields.');

    tasks.push({ title, description, deadline, priority, completed: false, recurring });
    saveTasks();
    renderTasks();
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
  });

  sortDeadlineButton.addEventListener('click', () => {
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    renderTasks(sortedTasks);
  });

  filterCompletedButton.addEventListener('click', () => {
    const completedTasks = tasks.filter(task => task.completed);
    renderTasks(completedTasks);
  });

  filterPendingButton.addEventListener('click', () => {
    const pendingTasks = tasks.filter(task => !task.completed);
    renderTasks(pendingTasks);
  });

  searchBar.addEventListener('input', () => {
    const query = searchBar.value.toLowerCase();
    const filteredTasks = tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    );
    renderTasks(filteredTasks);
  });

  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  });

  // Initialize dark mode from localStorage
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }

  renderTasks();
});