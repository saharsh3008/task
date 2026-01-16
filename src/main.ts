import './style.css';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

// State
let tasks: Task[] = [];
let filter: 'all' | 'active' | 'completed' = 'all';

// DOM Elements
const taskList = document.getElementById('taskList') as HTMLUListElement;
const taskInput = document.getElementById('taskInput') as HTMLInputElement;
const addTaskBtn = document.getElementById('addTaskBtn') as HTMLButtonElement;
const itemsLeft = document.getElementById('itemsLeft') as HTMLSpanElement;
const dateDisplay = document.getElementById('dateDisplay') as HTMLParagraphElement;
const filterBtns = document.querySelectorAll('.filter-btn');

// Initialization
const init = () => {
  loadTasks();
  updateDate();
  render();
  setupEventListeners();
};

const updateDate = () => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  if (dateDisplay) {
    dateDisplay.textContent = date.toLocaleDateString('en-US', options);
  }
};

const setupEventListeners = () => {
  addTaskBtn.addEventListener('click', handleAddTask);
  
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLButtonElement;
      filter = target.dataset.filter as 'all' | 'active' | 'completed';
      
      // Update active class
      filterBtns.forEach(b => b.classList.remove('active'));
      target.classList.add('active');
      
      render();
    });
  });
};

const handleAddTask = () => {
  const text = taskInput.value.trim();
  if (text) {
    addTask(text);
    taskInput.value = '';
    taskInput.focus();
  }
};

const addTask = (text: string) => {
  const task: Task = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now()
  };
  tasks.unshift(task); // Add to top
  saveTasks();
  render();
};

const toggleTask = (id: string) => {
  tasks = tasks.map(t => 
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  saveTasks();
  render();
};

const deleteTask = (id: string) => {
  // Add fade-out animation logic if desired, but for simplicity we just remove
  // To animate removal propery, we'd need to delay the state update.
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.classList.add('removing'); // We can add a class for removal animation
    // But since we confirm simplicity, we'll just remove.
  }
  
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
};

const saveTasks = () => {
  localStorage.setItem('premium-todo-tasks', JSON.stringify(tasks));
};

const loadTasks = () => {
  const stored = localStorage.getItem('premium-todo-tasks');
  if (stored) {
    try {
      tasks = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse tasks', e);
      tasks = [];
    }
  }
};

const render = () => {
  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  // Clear list
  taskList.innerHTML = '';

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `<li class="empty-state">No ${filter === 'all' ? '' : filter} tasks found</li>`;
  } else {
    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleTask(task.id));

      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = task.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      deleteBtn.ariaLabel = 'Delete task';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      });

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });
  }

  // Update stats
  const activeCount = tasks.filter(t => !t.completed).length;
  itemsLeft.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
};

// Start
init();
