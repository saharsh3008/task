
import './style.css';
import { TaskStore } from './store';
import type { Task } from './store';

// Initialize Store
const store = new TaskStore();

// State for UI
let currentView: 'all' | 'today' | 'upcoming' = 'all';
let currentListId: string | undefined = undefined;

// DOM Elements

const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;

const navBtns = document.querySelectorAll('.nav-btn');
const customListsContainer = document.getElementById('customLists') as HTMLDivElement;
const addListBtn = document.getElementById('addListBtn') as HTMLButtonElement;

const currentViewTitle = document.getElementById('currentViewTitle') as HTMLHeadingElement;
const currentDate = document.getElementById('currentDate') as HTMLParagraphElement;
const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement;

const quickTaskInput = document.getElementById('quickTaskInput') as HTMLInputElement;
const quickPriority = document.getElementById('quickPriority') as HTMLSelectElement;
const quickAddBtn = document.getElementById('quickAddBtn') as HTMLButtonElement;

const taskList = document.getElementById('taskList') as HTMLUListElement;

const taskModal = document.getElementById('taskModal') as HTMLDialogElement;
const closeModalBtn = document.getElementById('closeModalBtn') as HTMLButtonElement;
const editTaskForm = document.getElementById('editTaskForm') as HTMLFormElement;
const deleteTaskBtn = document.getElementById('deleteTaskBtn') as HTMLButtonElement;

// --- Initialization ---

const init = () => {
  setupTheme();
  updateDate();
  renderLists();
  renderTasks();
  setupEventListeners();
};

const updateDate = () => {
  const date = new Date();
  currentDate.textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

// --- Theme ---

const setupTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
};

const updateThemeIcon = (theme: string) => {
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
};

// --- Rendering ---

const renderLists = () => {
  customListsContainer.innerHTML = '';
  const lists = store.getLists().filter(l => !l.isSystem);

  lists.forEach(list => {
    const div = document.createElement('div');
    div.className = `nav-btn ${currentListId === list.id ? 'active' : ''}`;
    div.innerHTML = `
            <span class="list-dot" style="background-color: ${list.color}"></span>
            ${list.name}
            <button class="delete-list-btn" aria-label="Delete list" style="margin-left: auto; opacity: 0.5;">&times;</button>
        `;
    div.addEventListener('click', (e) => {
      // Handle delete click
      if ((e.target as HTMLElement).classList.contains('delete-list-btn')) {
        e.stopPropagation();
        if (confirm(`Delete list "${list.name}"?`)) {
          store.deleteList(list.id);
          if (currentListId === list.id) {
            currentListId = undefined;
            currentView = 'all';
            updateViewHeader();
          }
          renderLists();
          renderTasks();
        }
        return;
      }

      currentListId = list.id;
      currentView = 'all'; // Reset view to show this list
      updateViewHeader(list.name);
      renderLists();
      renderTasks();
    });
    customListsContainer.appendChild(div);
  });
};

const updateViewHeader = (title?: string) => {
  if (title) {
    currentViewTitle.textContent = title;
  } else {
    if (currentView === 'all') currentViewTitle.textContent = 'All Tasks';
    if (currentView === 'today') currentViewTitle.textContent = 'Today';
    if (currentView === 'upcoming') currentViewTitle.textContent = 'Upcoming';
  }

  // Update active class on nav
  navBtns.forEach(btn => btn.classList.remove('active'));
  if (!currentListId) {
    const activeBtn = document.querySelector(`[data-view="${currentView}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
};

const renderTasks = () => {
  const tasks = store.getTasks({
    listId: currentListId,
    view: currentListId ? undefined : currentView
  });

  // Apply sort logic from select if needed (Store has default sort, but we can override or re-sort here)
  const sortVal = sortSelect.value;
  if (sortVal === 'priority') {
    const pMap = { high: 3, medium: 2, low: 1 };
    tasks.sort((a, b) => pMap[b.priority] - pMap[a.priority]);
  } else if (sortVal === 'due') {
    tasks.sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity));
  }
  // 'created' is default in store

  const searchQuery = searchInput.value.toLowerCase();
  const filtered = tasks.filter(t => t.title.toLowerCase().includes(searchQuery));

  taskList.innerHTML = '';

  if (filtered.length === 0) {
    taskList.innerHTML = `<li style="text-align:center; padding: 2rem; color: var(--text-secondary)">No tasks found</li>`;
    return;
  }

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;

    li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                   ${task.dueDate ? `<span>📅 ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                   ${task.description ? `<span>📄</span>` : ''}
                </div>
            </div>
        `;

    // Checkbox event
    const checkbox = li.querySelector('.task-checkbox') as HTMLInputElement;
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      store.toggleTask(task.id);
      renderTasks();
    });

    // Click to edit
    li.addEventListener('click', () => openEditModal(task));

    taskList.appendChild(li);
  });
};

// --- Actions ---

const handleQuickAdd = () => {
  const title = quickTaskInput.value.trim();
  if (!title) return;

  store.addTask({
    title,
    priority: quickPriority.value as any,
    listId: currentListId || 'default',
    // If view is 'today', set due date to today? Optional UX improvement
  });

  quickTaskInput.value = '';
  renderTasks();
};

const openEditModal = (task: Task) => {
  const form = editTaskForm;
  (form.elements.namedItem('id') as HTMLInputElement).value = task.id;
  (form.elements.namedItem('title') as HTMLInputElement).value = task.title;
  (form.elements.namedItem('description') as HTMLTextAreaElement).value = task.description || '';
  (form.elements.namedItem('priority') as HTMLSelectElement).value = task.priority;

  const dateInput = form.elements.namedItem('dueDate') as HTMLInputElement;
  if (task.dueDate) {
    dateInput.valueAsNumber = task.dueDate; // Works if input type is date? No, needs YYYY-MM-DD
    dateInput.value = new Date(task.dueDate).toISOString().split('T')[0];
  } else {
    dateInput.value = '';
  }

  // Populate Lists Select
  const listSelect = form.elements.namedItem('listId') as HTMLSelectElement;
  listSelect.innerHTML = '';
  store.getLists().forEach(l => {
    const option = document.createElement('option');
    option.value = l.id;
    option.textContent = l.name;
    option.selected = l.id === task.listId;
    listSelect.appendChild(option);
  });

  taskModal.showModal();
};

const handleEditSubmit = (e: Event) => {
  e.preventDefault();
  const formData = new FormData(editTaskForm);
  const id = formData.get('id') as string;

  // Parse date
  const dateStr = formData.get('dueDate') as string;
  const dueDate = dateStr ? new Date(dateStr).getTime() : undefined;

  store.updateTask(id, {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    priority: formData.get('priority') as any,
    listId: formData.get('listId') as string,
    dueDate
  });

  taskModal.close();
  renderTasks();
};

const handleDeleteFromModal = () => {
  const id = (editTaskForm.elements.namedItem('id') as HTMLInputElement).value;
  if (confirm('Delete this task?')) {
    store.deleteTask(id);
    taskModal.close();
    renderTasks();
  }
};

// --- Event Listeners ---

const setupEventListeners = () => {
  // Nav
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.getAttribute('data-view') as any;
      currentListId = undefined;
      updateViewHeader();
      renderLists(); // Remove active state from lists
      renderTasks();
    });
  });

  // Lists
  addListBtn.addEventListener('click', () => {
    const name = prompt('List Name:');
    if (name) {
      store.addList(name);
      renderLists();
    }
  });

  // Quick Add
  quickAddBtn.addEventListener('click', handleQuickAdd);
  quickTaskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleQuickAdd();
  });

  // Search & Sort
  searchInput.addEventListener('input', renderTasks);
  sortSelect.addEventListener('change', renderTasks);

  // Modal
  closeModalBtn.addEventListener('click', () => taskModal.close());
  editTaskForm.addEventListener('submit', handleEditSubmit);
  deleteTaskBtn.addEventListener('click', handleDeleteFromModal);

  // Close modal on click outside
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) taskModal.close();
  });
};

init();
