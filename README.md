# 🎉 Event Management

Hệ thống quản lý sự kiện toàn diện với kiến trúc Frontend/Backend tách biệt.

## 🏗️ Architecture

```
Event_Management/
├── frontend/          # Next.js 16 (App Router + RSC)
│   ├── src/
│   │   ├── app/              # Pages & Layouts (Server Components)
│   │   ├── components/       # Reusable UI components
│   │   │   └── ui/           # Shared design system components
│   │   ├── lib/              # Utilities, API clients
│   │   └── types/            # TypeScript type definitions
│   └── ...
│
├── backend/           # Express.js (Modular Monolith)
│   ├── src/
│   │   ├── config/           # App configuration & database
│   │   ├── common/           # Shared middleware, utils, types
│   │   │   ├── middleware/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   ├── modules/          # Feature modules (domain-driven)
│   │   │   ├── event/        # Event module
│   │   │   │   ├── event.model.ts
│   │   │   │   ├── event.repository.ts
│   │   │   │   ├── event.service.ts
│   │   │   │   ├── event.controller.ts
│   │   │   │   ├── event.routes.ts
│   │   │   │   └── index.ts
│   │   │   └── user/         # User module
│   │   │       ├── user.model.ts
│   │   │       ├── user.repository.ts
│   │   │       ├── user.service.ts
│   │   │       ├── user.controller.ts
│   │   │       ├── user.routes.ts
│   │   │       └── index.ts
│   │   ├── app.ts            # Express app setup
│   │   └── server.ts         # Server entry point
│   └── ...
│
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env    # Configure environment variables
npm run dev             # Starts on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:3000
```

## 🔑 Key Design Decisions

### Frontend (Next.js)
- **Server Components (RSC)** — Tận dụng tối đa RSC để fetch data trực tiếp từ Express backend → tăng tốc tải trang & SEO
- **Client Components** — Chỉ dùng cho các tương tác người dùng động (forms, modals, etc.)
- **CSS Modules** — Scoped styling với design tokens qua CSS custom properties

### Backend (Express)
- **Modular Monolith** — Nhóm theo domain/feature thay vì nhóm theo kỹ thuật
- **Layered Architecture** — Controller → Service → Repository trong mỗi module
- **TypeScript** — Type safety xuyên suốt toàn bộ codebase

## 📦 Tech Stack

| Layer     | Technology         |
|-----------|--------------------|
| Frontend  | Next.js 16, React 19, TypeScript |
| Backend   | Express.js, TypeScript |
| Database  | MongoDB + Mongoose |
| Styling   | CSS Modules + Tailwind CSS |
| Runtime   | tsx (dev), tsc (build) |

## 📝 API Endpoints

### Events
| Method | Endpoint           | Description          |
|--------|-------------------|----------------------|
| GET    | /api/events        | List all events      |
| GET    | /api/events/:id    | Get event by ID      |
| POST   | /api/events        | Create new event     |
| PUT    | /api/events/:id    | Update event         |
| DELETE | /api/events/:id    | Delete event         |

### Users
| Method | Endpoint           | Description          |
|--------|-------------------|----------------------|
| GET    | /api/users/:id     | Get user profile     |
| PUT    | /api/users/:id     | Update user profile  |
| DELETE | /api/users/:id     | Delete user account  |

### Health
| Method | Endpoint           | Description          |
|--------|-------------------|----------------------|
| GET    | /api/health        | Health check         |
