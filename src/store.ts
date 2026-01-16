
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    priority: Priority;
    dueDate?: number; // timestamp
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

    getTasks(filter?: { listId?: string; view?: 'today' | 'upcoming' | 'all' }): Task[] {
        let result = [...this.tasks];

        if (filter?.listId) {
            result = result.filter(t => t.listId === filter.listId);
        }

        if (filter?.view === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            result = result.filter(t => t.dueDate && t.dueDate >= today.getTime() && t.dueDate < tomorrow.getTime());
        } else if (filter?.view === 'upcoming') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            result = result.filter(t => t.dueDate && t.dueDate >= today.getTime());
        }

        return result.sort((a, b) => {
            // Sort by completion (completed last), then priority (high first), then date
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            // Priority map
            const pMap = { high: 3, medium: 2, low: 1 };
            if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
            return b.createdAt - a.createdAt;
        });
    }

    getTask(id: string): Task | undefined {
        return this.tasks.find(t => t.id === id);
    }

    addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completed'>): Task {
        const newTask: Task = {
            ...task,
            id: crypto.randomUUID(),
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
            this.updateTask(id, { completed: !task.completed });
        }
    }

    // --- Lists ---

    getLists(): TaskList[] {
        return this.lists;
    }

    addList(name: string, color: string = '#64748b'): TaskList {
        const newList: TaskList = {
            id: crypto.randomUUID(),
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
        localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasks));
        localStorage.setItem(this.LISTS_KEY, JSON.stringify(this.lists));
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
