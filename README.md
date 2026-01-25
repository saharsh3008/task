# Modern Task Manager

Modern Task Manager is a powerful, intuitive tool designed to streamline your daily workflow and boost productivity. This application offers a seamless experience with features like recurring tasks, smart lists, and a visual calendar, helping you stay organized on any device. Built with a focus on speed and simplicity, it ensures you can manage complex projects or simple daily chores without the clutter.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

## 🚀 Features

- **Smart Task Management**: Create, edit, and delete tasks with ease.
- **Subtasks & Checklists**: Break down complex tasks into manageable subtasks.
- **Recurring Tasks**: Set tasks to repeat on specific days.
- **Priority Levels**: Organize tasks by priority (Low, Medium, High).
- **Custom Lists**: Group tasks into custom lists (e.g., Personal, Work).
- **Calendar View**: Visual overview of your upcoming tasks.
- **Views**: Filter tasks by 'All', 'Today', and 'Upcoming'.
- **Search**: Instantly find tasks with a built-in search functionality.
- **Dark/Light Mode**: Fully responsive theme switching.
- **Local Persistence**: specific data is saved to your browser's LocalStorage, so you never lose your data.
- **Responsive Design**: Optimized for both desktop and mobile use.

## 🛠️ Tech Stack

- **Core**: HTML5, CSS3, TypeScript
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: Custom observable-like `TaskStore` implementation
- **Styling**: Vanilla CSS with comprehensive design tokens

## 📦 Installation

To get started with this project locally, follow these steps:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project_todolist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

## 📂 Project Structure

```
project_todolist/
├── public/              # Static assets
├── src/
│   ├── main.ts          # Application entry point & DOM logic
│   ├── store.ts         # State management & Business logic
│   ├── style.css        # Global styles & CSS variables
│   └── vite-env.d.ts    # TypeScript definitions for Vite
├── index.html           # Main HTML template
├── package.json         # Project dependencies & scripts
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## 🎨 Architecture

The application uses a clean separation of concerns:
- **`store.ts`**: Handles all data manipulations, local storage sync, and business logic (filtering, sorting, recurring tasks).
- **`main.ts`**: Handles the UI rendering, event listeners, and DOM updates based on the current state.
- **`style.css`**: Contains modern CSS with variables for theming and layout.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
