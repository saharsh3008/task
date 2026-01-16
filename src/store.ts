export type Priority = 'low' | 'medium' | 'high';

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    priority: Priority;
    dueDate?: number; // timestamp
    completedAt?: number; // timestamp
    reminder?: number; // timestamp
    recurrenceDays?: number[]; // 0-6 (Sun-Sat), empty = no recurrence
    subtasks?: Subtask[];
    listId: string;
    createdAt: number;
    updatedAt: number;
}

export interface TaskList {
    id: string;
    name: string;
    color: string;
    isSystem?: boolean; // 'default' list
}

export class TaskStore {
    private tasks: Task[] = [];
    private lists: TaskList[] = [];
    private readonly TASKS_KEY = 'premium-todo-tasks';
    private readonly LISTS_KEY = 'premium-todo-lists';

    constructor() {
        this.load();
        // Ensure default list exists
        if (!this.lists.find(l => l.id === 'default')) {
            this.lists.push({ id: 'default', name: 'Inbox', color: '#3b82f6', isSystem: true });
            this.save();
        }
    }

    // --- Tasks ---

    getTasks(filter?: { listId?: string, view?: 'all' | 'today' | 'upcoming', search?: string }): Task[] {
        let filtered = [...this.tasks];

        // Basic List Filter
        if (filter?.listId) {
            filtered = filtered.filter(t => t.listId === filter.listId);
        }

        // Smart Search / Text Filter
        if (filter?.search) {
            const query = filter.search.toLowerCase();

            // Smart Filters
            const priorityMatch = query.match(/priority:(low|medium|high)/);
            const isDoneMatch = query.match(/is:done/);
            const isPendingMatch = query.match(/is:pending/);

            if (priorityMatch) {
                filtered = filtered.filter(t => t.priority === priorityMatch[1]);
            } else if (isDoneMatch) {
                filtered = filtered.filter(t => t.completed);
            } else if (isPendingMatch) {
                filtered = filtered.filter(t => !t.completed);
            } else {
                // Normal text search
                filtered = filtered.filter(t =>
                    t.title.toLowerCase().includes(query) ||
                    (t.description || '').toLowerCase().includes(query)
                );
            }
        }

        // View Filters (Date logic)
        if (filter?.view === 'today') {
            const today = new Date().setHours(0, 0, 0, 0);
            const tomorrow = new Date(today + 86400000).getTime();
            filtered = filtered.filter(t => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow);
        } else if (filter?.view === 'upcoming') {
            const today = new Date().setHours(0, 0, 0, 0);
            filtered = filtered.filter(t => t.dueDate && t.dueDate >= today);
        }

        return filtered.sort((a, b) => {
            // Sort by completion (completed last), then priority (high first), then date
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const pMap = { high: 3, medium: 2, low: 1 };
            if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
            return b.createdAt - a.createdAt;
        });
    }

    getTask(id: string): Task | undefined {
        return this.tasks.find(t => t.id === id);
    }

    // Helper for generating IDs
    private generateId(): string {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completed'>): Task {
        const newTask: Task = {
            ...task,
            id: this.generateId(),
            completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.tasks.push(newTask);
        this.save();
        return newTask;
    }

    updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx === -1) return null;

        const updatedTask = {
            ...this.tasks[idx],
            ...updates,
            updatedAt: Date.now()
        };
        this.tasks[idx] = updatedTask;
        this.save();
        return updatedTask;
    }

    deleteTask(id: string): void {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
    }

    toggleTask(id: string): void {
        const task = this.getTask(id);
        if (task) {
            const isCompleted = !task.completed;

            // Handle Recurrence on Completion
            if (isCompleted && task.recurrenceDays && task.recurrenceDays.length > 0) {
                this.handleRecurrence(task);
            }

            this.updateTask(id, {
                completed: isCompleted,
                completedAt: isCompleted ? Date.now() : undefined
            });
        }
    }

    private handleRecurrence(task: Task) {
        if (!task.dueDate) return;

        const currentDueDate = new Date(task.dueDate);
        const searchDate = new Date(currentDueDate);
        searchDate.setDate(searchDate.getDate() + 1); // Start ensuring it's in the future

        for (let i = 0; i < 365; i++) {
            const dayOfWeek = searchDate.getDay();
            if (task.recurrenceDays!.includes(dayOfWeek)) {
                // Found next match
                this.addTask({
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    listId: task.listId,
                    dueDate: searchDate.getTime(),
                    recurrenceDays: task.recurrenceDays,
                    subtasks: task.subtasks?.map(s => ({ ...s, completed: false }))
                });
                return;
            }
            searchDate.setDate(searchDate.getDate() + 1);
        }
    }

    // Subtask Management
    addSubtask(taskId: string, title: string) {
        const task = this.getTask(taskId);
        if (task) {
            const subtasks = task.subtasks || [];
            subtasks.push({ id: this.generateId(), title, completed: false });
            this.updateTask(taskId, { subtasks });
        }
    }

    toggleSubtask(taskId: string, subtaskId: string) {
        const task = this.getTask(taskId);
        if (task && task.subtasks) {
            const subtasks = task.subtasks.map(s =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s
            );
            this.updateTask(taskId, { subtasks });
        }
    }

    deleteSubtask(taskId: string, subtaskId: string) {
        const task = this.getTask(taskId);
        if (task && task.subtasks) {
            const subtasks = task.subtasks.filter(s => s.id !== subtaskId);
            this.updateTask(taskId, { subtasks });
        }
    }

    // --- Lists ---

    getLists(): TaskList[] {
        return this.lists;
    }

    addList(name: string, color: string = '#64748b'): TaskList {
        const newList: TaskList = {
            id: this.generateId(),
            name,
            color
        };
        this.lists.push(newList);
        this.save();
        return newList;
    }

    deleteList(id: string): void {
        if (id === 'default') return; // Cannot delete default
        this.lists = this.lists.filter(l => l.id !== id);
        // Move tasks to default? or delete? Let's move to default for safety
        this.tasks.forEach(t => {
            if (t.listId === id) {
                t.listId = 'default';
            }
        });
        this.save();
    }

    // --- Persistence ---

    private save() {
        try {
            localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasks));
            localStorage.setItem(this.LISTS_KEY, JSON.stringify(this.lists));
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }
    }

    private load() {
        try {
            const tasksRaw = localStorage.getItem(this.TASKS_KEY);
            const listsRaw = localStorage.getItem(this.LISTS_KEY);

            if (tasksRaw) this.tasks = JSON.parse(tasksRaw);
            if (listsRaw) this.lists = JSON.parse(listsRaw);
        } catch (e) {
            console.error('Failed to load store', e);
            this.tasks = [];
            this.lists = [];
        }
    }

    search(query: string): Task[] {
        const q = query.toLowerCase();
        return this.tasks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q)
        );
    }
}
