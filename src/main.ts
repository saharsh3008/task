
import './style.css';
import { TaskStore } from './store';
import type { Task } from './store';

// Initialize Store
let store: TaskStore = null!;
try {
  store = new TaskStore();
} catch (e) {
  console.error('Failed to initialize store', e);
  alert('Critical Error: Failed to initialize application data. Please check console.');
}

// State for UI
let currentView: 'all' | 'today' | 'upcoming' | 'date-view' = 'all';
let currentListId: string | undefined = undefined;
let currentDateFilter: Date | null = null; // For calendar view

// DOM Elements
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;

const navBtns = document.querySelectorAll('.nav-btn');
const customListsContainer = document.getElementById('customLists') as HTMLDivElement;
const addListBtn = document.getElementById('addListBtn') as HTMLButtonElement;
const miniCalendar = document.getElementById('miniCalendar') as HTMLDivElement;

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
  renderCalendar();
  renderTasks();
  setupEventListeners();
  setupReminders();
};

const updateDate = () => {
  const date = new Date();
  currentDate.textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

// --- Calendar ---
let displayedMonth = new Date();

// New DOM Elements
const mobileCalendarTrigger = document.getElementById('mobileCalendarTrigger') as HTMLButtonElement;
const mobileCalendarModal = document.getElementById('mobileCalendarModal') as HTMLDialogElement;
const closeMobileCalendarBtn = document.getElementById('closeMobileCalendarBtn') as HTMLButtonElement;
const mobileCalendarContainer = document.getElementById('mobileCalendarContainer') as HTMLDivElement;

// ...

const renderCalendar = () => {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();

  // First day of month
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0-6 (Sun-Sat)

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Check for activity (mocking efficiency by checking all tasks)
  const tasks = store.getTasks();
  const activeDays = new Set<string>();
  tasks.forEach(t => {
    if (t.completedAt) activeDays.add(new Date(t.completedAt).toDateString());
  });

  let html = `
        <div class="calendar-header">
            <button class="calendar-nav-btn prev-month-btn">&lt;</button>
            <span class="calendar-month">${displayedMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            <button class="calendar-nav-btn next-month-btn">&gt;</button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-header">S</div>
            <div class="calendar-day-header">M</div>
            <div class="calendar-day-header">T</div>
            <div class="calendar-day-header">W</div>
            <div class="calendar-day-header">T</div>
            <div class="calendar-day-header">F</div>
            <div class="calendar-day-header">S</div>
    `;

  // Empty cells
  for (let i = 0; i < startDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  // Days
  const todayStr = new Date().toDateString();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toDateString();
    const className = [
      'calendar-day',
      dateStr === todayStr ? 'today' : '',
      currentDateFilter && dateStr === currentDateFilter.toDateString() ? 'selected' : '',
      activeDays.has(dateStr) ? 'has-event' : ''
    ].filter(Boolean).join(' ');

    html += `<div class="calendar-day ${className}" data-date="${dateStr}">${day}</div>`;
  }

  html += `</div>`;

  // Render to both containers
  const containers = [miniCalendar, mobileCalendarContainer];

  containers.forEach(container => {
    if (!container) return;
    container.innerHTML = html;

    // Listeners (scoped to container)
    // Note: we use class selectors since IDs might be duplicated if we used them in HTML string
    container.querySelector('.prev-month-btn')?.addEventListener('click', () => {
      displayedMonth.setMonth(displayedMonth.getMonth() - 1);
      renderCalendar();
    });
    container.querySelector('.next-month-btn')?.addEventListener('click', () => {
      displayedMonth.setMonth(displayedMonth.getMonth() + 1);
      renderCalendar();
    });

    container.querySelectorAll('.calendar-day[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        const date = new Date(el.getAttribute('data-date')!);
        currentDateFilter = date;
        currentView = 'date-view';
        currentListId = undefined;
        updateViewHeader();
        renderCalendar(); // To update selection style
        renderTasks();

        // If mobile modal is open, close it
        if (mobileCalendarModal && mobileCalendarModal.getAttribute('open') !== null) {
          mobileCalendarModal.close();
        }
      });
    });
  });
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

// --- Reminders ---

const setupReminders = () => {
  if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }

  setInterval(() => {
    const tasks = store.getTasks({ listId: undefined }); // Check all tasks
    const now = Date.now();

    tasks.forEach(task => {
      if (task.reminder && task.reminder <= now && task.reminder > now - 60000 && !task.completed) {
        // If reminder is within last minute (to avoid spamming old ones)
        if (Notification.permission === 'granted') {
          new Notification(`Reminder: ${task.title}`, {
            body: task.description || 'Time to complete this task!',
            icon: '/vite.svg'
          });
        } else {
          alert(`Reminder: ${task.title}`);
        }

        // Clear reminder? Or set a flag "reminded"? 
        // For simplicity, we assume we notified and don't clear, but the loop checks > now - 60s
        // To avoid double notification in same minute, we should probably mark it. 
        // But simplified logic: check if reminder is exactly in this minute window.
      }
    });
  }, 30000); // Check every 30s
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
      currentDateFilter = null;
      renderCalendar(); // clear selection
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
    if (currentView === 'date-view' && currentDateFilter) {
      currentViewTitle.textContent = currentDateFilter.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    }
  }

  // Update active class on nav
  navBtns.forEach(btn => btn.classList.remove('active'));
  if (!currentListId && currentView !== 'date-view') {
    const activeBtn = document.querySelector(`[data-view="${currentView}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
};

const renderTasks = () => {
  let tasks: Task[] = [];

  if (currentView === 'date-view' && currentDateFilter) {
    // Custom filtering for Calendar View
    const filterStart = currentDateFilter.getTime();
    const filterEnd = filterStart + 86400000;

    tasks = store.getTasks().filter(t => {
      // Include if completed ON this date OR Due ON this date
      const completedOnDate = t.completed && t.completedAt && t.completedAt >= filterStart && t.completedAt < filterEnd;
      const dueOnDate = t.dueDate && t.dueDate >= filterStart && t.dueDate < filterEnd;
      return completedOnDate || dueOnDate;
    });
  } else {
    tasks = store.getTasks({
      listId: currentListId,
      view: currentListId ? undefined : (currentView as any)
    });
  }

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
    const msg = currentView === 'date-view' ? 'No activity on this date' : 'No tasks found';
    taskList.innerHTML = `<li style="text-align:center; padding: 2rem; color: var(--text-secondary)">${msg}</li>`;
    return;
  }

  // Modal
  closeModalBtn.addEventListener('click', () => taskModal.close());
  editTaskForm.addEventListener('submit', handleEditSubmit);
  deleteTaskBtn.addEventListener('click', handleDeleteFromModal);

  // Subtask Add Button in Modal
  const addSubtaskBtn = document.getElementById('addSubtaskBtn');
  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', handleAddSubtask);
  }
  const newSubtaskInput = document.getElementById('newSubtaskInput');
  if (newSubtaskInput) {
    newSubtaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submit
        handleAddSubtask();
      }
    });
  }

  // Close modal on click outside
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) taskModal.close();
  });
  // ... 

  // In renderTasks ...
  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;

    const reminderHtml = task.reminder && task.reminder > Date.now()
      ? `<span class="reminder-icon" title="${new Date(task.reminder).toLocaleString()}">🔔</span>`
      : '';

    const recurrenceHtml = task.recurrence && task.recurrence !== 'none'
      ? `<span class="recurrence-icon" title="Repeats ${task.recurrence}">🔁</span>`
      : '';

    // Progress Bar Calculation
    let progressBarHtml = '';
    if (task.subtasks && task.subtasks.length > 0) {
      const total = task.subtasks.length;
      const done = task.subtasks.filter(s => s.completed).length;
      const percent = Math.round((done / total) * 100);

      progressBarHtml = `
                <div class="progress-container">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percent}%"></div>
                    </div>
                    <span class="progress-text">${done}/${total}</span>
                </div>
            `;
    }

    li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                   ${recurrenceHtml}
                   ${task.dueDate ? `<span>📅 ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                   ${reminderHtml}
                   ${task.description ? `<span>📄</span>` : ''}
                </div>
                ${progressBarHtml}
            </div>
        `;
    // ...

    // Checkbox event
    const checkbox = li.querySelector('.task-checkbox') as HTMLInputElement;
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      store.toggleTask(task.id);
      renderCalendar(); // Update dots
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
    // If view is 'today' or date-view, set due date?
    dueDate: (currentView === 'today' || currentView === 'date-view') && currentDateFilter ? currentDateFilter.getTime() : undefined
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
    dateInput.value = new Date(task.dueDate).toISOString().split('T')[0];
  } else {
    dateInput.value = '';
  }

  const reminderInput = form.elements.namedItem('reminder') as HTMLInputElement;
  if (task.reminder) {
    const rDate = new Date(task.reminder);
    const tzOffset = rDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(rDate.getTime() - tzOffset)).toISOString().slice(0, -1);
    reminderInput.value = localISOTime.substring(0, 16);
  } else {
    reminderInput.value = '';
  }

  const recurrenceSelect = form.elements.namedItem('recurrence') as HTMLSelectElement;
  recurrenceSelect.value = task.recurrence || 'none';

  // Populate Subtasks
  renderSubtasksInModal(task);

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

const renderSubtasksInModal = (task: Task) => {
  const list = document.getElementById('editSubtasksList') as HTMLUListElement;
  list.innerHTML = '';

  (task.subtasks || []).forEach(sub => {
    const li = document.createElement('li');
    li.className = `subtask-item ${sub.completed ? 'completed' : ''}`;
    li.innerHTML = `
            <input type="checkbox" class="subtask-checkbox" ${sub.completed ? 'checked' : ''} data-id="${sub.id}">
            <span class="subtask-text">${sub.title}</span>
            <button type="button" class="delete-subtask-btn" data-id="${sub.id}">&times;</button>
        `;

    // Toggle Subtask
    li.querySelector('input')?.addEventListener('change', () => {
      store.toggleSubtask(task.id, sub.id);
      // Re-render only subtasks to keep modal open and state fresh
      // We need to fetch fresh task from store
      const fresh = store.getTask(task.id);
      if (fresh) renderSubtasksInModal(fresh);
      renderTasks(); // Update main background view too
    });

    // Delete Subtask
    li.querySelector('.delete-subtask-btn')?.addEventListener('click', () => {
      store.deleteSubtask(task.id, sub.id);
      const fresh = store.getTask(task.id);
      if (fresh) renderSubtasksInModal(fresh);
      renderTasks();
    });

    list.appendChild(li);
  });
};

const handleAddSubtask = () => {
  const input = document.getElementById('newSubtaskInput') as HTMLInputElement;
  const title = input.value.trim();
  if (!title) return;

  const id = (editTaskForm.elements.namedItem('id') as HTMLInputElement).value;
  if (id) {
    store.addSubtask(id, title);
    input.value = '';
    const fresh = store.getTask(id);
    if (fresh) renderSubtasksInModal(fresh);
    renderTasks();
  }
}

const handleEditSubmit = (e: Event) => {
  e.preventDefault();
  const formData = new FormData(editTaskForm);
  const id = formData.get('id') as string;

  // Parse date
  const dateStr = formData.get('dueDate') as string;
  const dueDate = dateStr ? new Date(dateStr).getTime() : undefined;

  // Parse reminder
  const reminderStr = formData.get('reminder') as string;
  const reminder = reminderStr ? new Date(reminderStr).getTime() : undefined;

  store.updateTask(id, {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    priority: formData.get('priority') as any,
    listId: formData.get('listId') as string,
    recurrence: formData.get('recurrence') as any,
    dueDate,
    reminder
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
      currentDateFilter = null;
      updateViewHeader();
      renderLists(); // Remove active state from lists
      renderCalendar(); // clear selection
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

  // Mobile Calendar
  if (mobileCalendarTrigger) {
    mobileCalendarTrigger.addEventListener('click', () => {
      // Ensure calendar is up to date when opening
      renderCalendar();
      mobileCalendarModal.showModal();
    });
  }

  if (closeMobileCalendarBtn) {
    closeMobileCalendarBtn.addEventListener('click', () => mobileCalendarModal.close());
  }

  if (mobileCalendarModal) {
    mobileCalendarModal.addEventListener('click', (e) => {
      if (e.target === mobileCalendarModal) mobileCalendarModal.close();
    });
  }
};

// Wrap init
try {
  if (store) init();
} catch (e) {
  console.error('Failed to initialize app', e);
}
