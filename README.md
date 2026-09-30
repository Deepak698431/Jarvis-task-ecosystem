# 🌐 J.A.R.V.I.S. Task Ecosystem

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![C++](https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### 🟢 **Live Web Client:** [todo-synced.vercel.app](https://todo-synced.vercel.app/)

A unified, multi-user task management architecture bridging a serverless web application with a low-latency native Windows desktop client. Powered by Gemini AI for natural language processing and secured via custom edge-level middleware.

## 🚀 The Architecture

Standard web authentication (cookies, JWTs, OAuth) introduces heavy friction when integrating with native Win32 C++ applications. To solve this, I engineered a **Lightweight Header Authentication** system. 

Instead of bloated boilerplates, a Next.js serverless API acts as the central nervous system, intercepting `x-username` and `x-app-password` headers at the edge. This instantly isolates multi-user data within a single MongoDB collection using index-level document tagging, requiring only two lines of `cpp-httplib` code to authenticate the desktop client.

### Core Components
* **The Brain (API):** Next.js API routes deployed on Vercel, handling database routing, security gatekeeping, and AI payload processing.
* **The Cloud (Data):** MongoDB Atlas utilizing a single-collection architecture (`{ user: username }` tagging) to securely silo operator data.
* **The Desktop Engine (C++):** A native Windows client built with Modern C++, CMake, Dear ImGui, and GLFW. Optimized for zero input lag by stripping dynamic `std::string` allocations in favor of static character arrays.
* **The Web Client (PWA):** A responsive React dashboard featuring the native Web Speech API and fluid typography that scales flawlessly from an iPhone to a 21:9 ultrawide monitor.

---

## ✨ Key Features

* **🎙️ Natural Language AI Scheduling:** Speak or type natural commands (e.g., *"Study C++ graphs tomorrow from 5 to 7 PM"*). The Gemini API parses the unstructured text into exact Unix timestamps and Priority levels, instantly saving the structured payload to the database.
* **⚡ Cross-Platform Real-Time Sync:** Add a task on your iOS device via voice, and watch it instantly populate on your Windows desktop environment. 
* **🔒 Stateless Edge Security:** Prevents cross-user data mutation (PUT/DELETE) strictly at the API route level before database queries execute.
* **🛡️ Deadlock-Free Rendering:** Architected to completely bypass serverless execution deadlocks by delegating database hydration entirely to the client, preventing Vercel timeout crashes.

---

## 🛠️ Engineering Challenges Conquered

During development, deploying to a serverless environment introduced a critical **Serverless Deadlock** and a `MongoServerSelectionError`. 

Because Server Components execute in isolated, short-lived functions, having the server attempt to fetch from its own API route occupied the main thread, blocking the MongoDB driver from establishing a network connection within the 30-second timeout window. I re-architected the data flow to pass empty initial states from the server, shifting the authentication and database fetch lifecycle strictly to the client. This instantly resolved the deadlock, optimized Vercel compute usage, and enabled seamless cloud-to-database connections.

---

## 💻 Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/jarvis-ecosystem.git](https://github.com/yourusername/jarvis-ecosystem.git)
