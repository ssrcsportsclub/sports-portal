<div align="center">
  <h1>SSRC Sports Club Portal</h1>
  <p><strong>A modern, open-source sports management infrastructure for clubs and organizations.</strong></p>

  <p>
    <img src="https://img.shields.io/github/stars/ssrcsportsclub/sports-portal?style=flat-square&label=stars&color=black" alt="stars" />
    <img src="https://img.shields.io/github/forks/ssrcsportsclub/sports-portal?style=flat-square&label=forks&color=black" alt="forks" />
    <img src="https://img.shields.io/github/license/ssrcsportsclub/sports-portal?style=flat-square&label=license&color=black" alt="license" />
  </p>

  <p>
    <img src="https://img.shields.io/badge/React%2019-%2320232a.svg?style=flat-square&logo=react&logoColor=%2361DAFB" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-%23007acc.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-%23646CFF.svg?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Redux%20Toolkit-%23764ABC.svg?style=flat-square&logo=redux&logoColor=white" alt="Redux Toolkit" />
    <img src="https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Lucide%20React-%23F5A623.svg?style=flat-square&logo=lucide&logoColor=white" alt="Lucide React" />
    <img src="https://img.shields.io/badge/Node.js-%23339933.svg?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express%204-%23000000.svg?style=flat-square&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
    <br />
    <img src="https://img.shields.io/badge/Mongoose-%23880000.svg?style=flat-square&logo=mongoose&logoColor=white" alt="Mongoose" />
    <img src="https://img.shields.io/badge/Nodemailer-%23000000.svg?style=flat-square&logo=nodemailer&logoColor=white" alt="Nodemailer" />
    <img src="https://img.shields.io/badge/JWT-%23000000.svg?style=flat-square&logo=json-web-tokens&logoColor=white" alt="JWT" />
    <img src="https://img.shields.io/badge/Vercel-%23000000.svg?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
  </p>
</div>

---

## Introduction

**SSRC Sports Club Portal** is a robust, modern web application designed to replace manual scheduling and coordination for sports organizations. Built with a focus on visual excellence, security, and data sovereignty, it offers a complete infrastructure for managing events, memberships, and equipment tracking.

---

## ✨ Features

- **🔐 Secure Authentication:** Multi-tier authentication including Google OAuth and traditional Email/Password with JWT cookies.
- **🛡️ RBAC (Role-Based Access Control):** Granular permissions for Admins, Superusers, Moderators, and Students.
- **📝 Dynamic Forms:** Custom form builder for event registrations and membership applications with backend OTP verification.
- **📦 Inventory System:** Advanced equipment tracking with chain-of-custody requests and peer-to-peer transfers.
- **📢 Real-time Announcements:** Interactive club updates with emoji reactions and visual focus.
- **⚡ Performance Optimized:** Built on React 19 and Vite for a lightning-fast user experience.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v18 or higher
- **Database:** MongoDB (Local or Atlas)
- **Email:** SMTP credentials for OTP and notifications

### Installation

1. **Clone the Repo**

   ```bash
   git clone https://github.com/pr4shxnt/sports-portal.git
   ```

2. **Backend Setup**

   ```bash
   cd server
   npm install
   # Create .env from .env.example
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd client
   npm install
   npm run dev
   ```

---

## 🛠️ Project Structure

```text
├── client/                # React 19 + Tailwind CSS 4.0
│   ├── src/
│   │   ├── components/    # Common UI & Logic
│   │   ├── pages/         # View components
│   │   └── store/         # Redux Toolkit state
├── server/                # Express + MongoDB
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── models/        # Mongoose schemas
│   │   └── middlewares/   # Auth & Security logic
```

---

## 🤝 Contributors

This project is maintained by **Prashant (@pr4shxnt)**. Contributions are welcome!

---

## 📜 License

This project is licensed under the **ISC License**.

---

<div align="center">
  <p><em>Created with ❤️ by the SSRC Development Team</em></p>
  <p>⭐ Star us on GitHub!</p>
</div>
