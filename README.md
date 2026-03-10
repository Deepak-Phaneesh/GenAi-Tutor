<h1 align="center">AI Adaptive Learning Platform</h1>

<p align="center">
  <strong>Dynamic, AI-driven educational platform providing custom learning paths and adaptive assessments.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Gemini_AI-Integration-orange?style=for-the-badge&logo=google" alt="Google Generative AI" />
</p>

<hr>

## ✨ Overview

This platform represents the next generation of online learning. It leverages the power of Large Language Models (LLMs) to construct personalized curriculums and automatically adapt educational content based on ongoing student performance. It features a complete frontend React application linked to a secure backend managed by Supabase.

### Core Features

- 🧠 **AI-Generated Curriculums:** Create tailored learning pathways ranging from basic to advanced across various domains (IT, Business, Languages, etc.).
- 📊 **Adaptive Assessments:** Dynamic quizzes scale in difficulty based on user metrics and progress tracking.
- 👨‍💻 **Interactive Coding Sandbox:** Features an integrated Monaco code editor for real-time coding exercises and validation.
- 📈 **Comprehensive Analytics:** Visual dashboards (using Recharts) to track user progress, learning streaks, and assessment accuracy.
- 🔐 **Secure Authentication:** Integrated user management via Supabase Auth with custom role support.

---

## 🏗️ Project Architecture

The project is structured into distinct frontend and backend layers to promote separation of concerns.

```plaintext
root/
├── frontend/             # React & Vite client application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Main application views/routes
│   │   └── lib/          # Utilities, API integrations, AuthContext
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies & scripts
│
└── backend/              # Database schema & backend utilities
    └── supabase_setup.sql # Core PostgreSQL database schema and RLS policies
```

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or another package manager
- A [Supabase](https://supabase.com/) project
- A valid LLM API Key (e.g., Groq or Google Gemini, as configured in environment)

### Installation

1. **Clone the repository** (if applicable):
   ```bash
   git clone <your-repo-url>
   cd "Gen AI project"
   ```

2. **Database Setup:**
   Head to your Supabase project's SQL Editor and run the queries found in `backend/supabase_setup.sql`. This will configure the necessary public tables (`users`, `user_progress`, `learning_paths`, `assessment_results`, etc.) and their respective Row Level Security (RLS) policies.

3. **Frontend Setup & Configuration:**
   Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

   Install the required dependencies:
   ```bash
   npm install
   ```

   Configure your environment variables. Ensure that Vite has access to the necessary secrets (like your Supabase URL and keys, and AI keys).

4. **Launch the Development Server:**
   Start the application locally:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

---

## 💻 Tech Stack

### Frontend
- **Framework:** React 19 (via Vite)
- **Routing:** React Router v7
- **Styling/Icons:** Custom CSS & Lucide React
- **Code Editor:** Monaco Editor
- **Data Visualization:** Recharts

### Backend / Services
- **Database & Auth:** Supabase (PostgreSQL)
- **AI Integration:** `@google/genai` (Configured for dynamic LLM generation)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for any bugs or feature requests. 

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<p align="center">
  <i>Developed with ❤️ for the future of education.</i>
</p>
