# Statco Leave Management System

A full-stack leave management application built with **Java Spring Boot** (backend) and **React TypeScript** (frontend).

---

## Features

- **Employee Portal** — Apply for leave, track request status, view leave balance
- **Admin Portal** — Dashboard stats, review & approve/reject requests, view all requests
- **Leave Types** — Annual, Sick, Maternity, Paternity, Unpaid, Other
- **Email Notifications** — Employees notified on approval/rejection; admins notified on new requests
- **JWT Authentication** — Role-based access (ADMIN / EMPLOYEE)
- **Leave Balance Tracking** — Auto-deducted on approval, restored on cancellation

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.8+ |
| Node.js | 18+ |
| MySQL | 8.0+ |

---

## Backend Setup

### 1. Create MySQL Database
```sql
CREATE DATABASE statco_leave;
```

### 2. Configure `application.properties`
Edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/statco_leave?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
spring.datasource.username=YOUR_MYSQL_USERNAME
spring.datasource.password=YOUR_MYSQL_PASSWORD

# Email (Gmail example — use an App Password, not your real password)
spring.mail.username=your_email@gmail.com
spring.mail.password=your_app_password
```

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App Passwords

### 3. Run the Backend
```bash
cd backend
mvn spring-boot:run
```
Backend runs at: `http://localhost:8080`

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Edit `frontend/.env` if your backend runs on a different port:
```
REACT_APP_API_URL=http://localhost:8080/api
```

### 3. Run the Frontend
```bash
npm start
```
Frontend runs at: `http://localhost:3000`

---

## First-Time Setup

### Create an Admin Account
Register via the app, then manually update the role in MySQL:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@statco.com';
```

Or use the register API directly with role override:
```json
POST /api/auth/register
{
  "fullName": "HR Admin",
  "email": "admin@statco.com",
  "password": "admin123",
  "role": "ADMIN"
}
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |

### Employee
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/leave/apply` | Submit leave request |
| GET | `/api/leave/my-requests` | Get my requests |
| POST | `/api/leave/{id}/cancel` | Cancel a request |
| GET | `/api/leave/balance` | Get leave balance |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leave/admin/all` | All requests |
| GET | `/api/leave/admin/pending` | Pending requests |
| POST | `/api/leave/admin/{id}/review` | Approve or reject |
| GET | `/api/leave/admin/stats` | Dashboard stats |

---

## Project Structure

```
leave-management/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/statco/leave/
│       ├── controller/       # REST controllers
│       ├── service/          # Business logic
│       ├── repository/       # JPA repositories
│       ├── model/            # JPA entities
│       ├── dto/              # Request/response DTOs
│       ├── security/         # JWT + Spring Security
│       └── config/           # Security & CORS config
└── frontend/
    └── src/
        ├── api/              # Axios API functions
        ├── components/       # Sidebar, Layout
        ├── context/          # Auth context
        ├── pages/
        │   ├── employee/     # Dashboard, Apply, Requests, Balance
        │   └── admin/        # Dashboard, All Requests, Pending
        └── types/            # TypeScript interfaces
```

---

## Default Leave Entitlements

| Leave Type | Days |
|------------|------|
| Annual | 21 |
| Sick | 10 |
| Maternity | 90 |
| Paternity | 14 |

These can be changed in `LeaveBalance.java`.

---

## Tech Stack

**Backend:** Java 17, Spring Boot 3.2, Spring Security, JWT (JJWT), Spring Data JPA, Spring Mail, Lombok, MySQL

**Frontend:** React 18, TypeScript, React Router v6, Axios, react-hot-toast, date-fns
