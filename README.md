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
│   │   │   ├── event/        # Event (public read + protected write)
│   │   │   ├── user/         # User & Auth
│   │   │   ├── category/     # Event categories
│   │   │   ├── star/         # Featured stars (homepage)
│   │   │   ├── banner/       # Marketing banners
│   │   │   └── organizer/    # Organizer event + ticket management (EM-23, EM-24, EM-128)
│   │   │       ├── ticket.model.ts
│   │   │       └── ...
│   │   └── scripts/
│   │       ├── create-admin.ts       # npm run seed:admin
│   │       └── seed-homepage.ts      # npm run seed:homepage
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

### User & Auth (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/otp/send` | Send OTP (register) |
| POST | `/register` | Register with OTP |
| POST | `/login` | Login email/password |
| POST | `/google` | Login via Google |
| POST | `/logout` | Logout (clear cookie) |
| GET | `/me` | Current user (auth required) |
| PUT | `/me` | Update profile (auth required) |
| GET | `/admin` | List users (ADMIN only) |
| POST | `/admin/staff` | Create STAFF (ADMIN only) |

### Events (`/api/events`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | List events (public, status=published) |
| GET | `/search` | — | Full-text search (EM-68) |
| GET | `/:id` | — | Get event by ID (published only) |
| GET | `/:id/detail` | — | Event + tickets + related (EM-72) |
| POST | `/` | ORGANIZER\|ADMIN | Create event |
| PUT | `/:id` | ORGANIZER\|ADMIN | Update event |
| DELETE | `/:id` | ORGANIZER\|ADMIN | Delete event |

### Organizer (`/api/organizer`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/events` | ORGANIZER\|ADMIN | Create DRAFT event (EM-23) |
| GET | `/events` | ORGANIZER\|ADMIN | My events |
| PUT | `/events/:id` | ORGANIZER\|ADMIN | Update DRAFT (EM-24) |
| POST | `/events/:id/submit` | ORGANIZER\|ADMIN | Submit for review |
| GET/POST/PUT | `/events/:id/tickets` | ORGANIZER\|ADMIN | Ticket management (EM-128) |

### Categories, Stars, Banners
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | — | List categories |
| GET | `/api/stars` | — | List featured stars |
| GET | `/api/banners` | — | List active banners |

### Health
| Method | Endpoint           | Description          |
|--------|-------------------|----------------------|
| GET    | /api/health        | Health check         |
