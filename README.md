# 🎓 CampusMitra

CampusMitra is a comprehensive, full-stack web application designed to foster a collaborative and resourceful environment for university students. It serves as a centralized hub that brings together essential student services, making campus life more connected and efficient.

## ✨ Key Features

- **🔐 Secure Authentication**
  - Fully implemented user registration and login system.
  - Secure password hashing using `bcryptjs` and session management via JSON Web Tokens (JWT).
- **📦 Borrow & Rent Module**
  - A persistent, MongoDB-backed system where students can securely list items they want to lend or rent.
  - Image upload capabilities and ownership-based UI controls.
- **🔍 AI-Powered Lost & Found**
  - A smart module to report lost and found items.
  - Implements a simulated AI matching algorithm (keyword/image feature comparison) to reunify students with their lost belongings.
- **🗣️ Collective Grievance Management**
  - A robust system that enables students to anonymously report issues.
  - Issues are automatically clustered and assigned a priority pressure score for a data-driven resolution approach.
- **📚 Peer Tutoring Platform**
  - Connects students who need academic help with peers willing to tutor them.

## 🛠️ Technology Stack

**Frontend:**
- HTML5
- CSS3 (Vanilla & Custom Utilities)
- JavaScript (Vanilla DOM Manipulation & API integration)

**Backend:**
- Node.js
- Express.js (RESTful API development)
- JSON Web Tokens (JWT) for secure authentication
- Bcrypt.js for payload encryption

**Database:**
- MongoDB (NoSQL Database)
- Mongoose (Object Data Modeling)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have the following installed to run this project:
- [Node.js](https://nodejs.org/) (v14.x or later recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/iama02/CampusMitra.git
   cd CampusMitra
   ```

2. **Install the dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following variables:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/campusmitra # Or your MongoDB Atlas URI
   JWT_SECRET=your_super_secret_jwt_key
   ```

4. **Start the application:**
   ```bash
   npm start
   ```
   *The server should now be running on `http://localhost:3000`.*

## 📂 Project Structure

```text
CampusMitra/
├── assets/          # Images, icons, and visual assets
├── css/             # Stylesheets (Vanilla CSS/Tailwind if added)
├── js/              # Client-side JavaScript logic
├── models/          # MongoDB Mongoose schemas
├── pages/           # HTML views for different modules
├── .env             # Environment variables 
├── index.html       # Entry point / Landing Page
├── package.json     # Node.js dependencies and scripts
└── server.js        # Express application server and API endpoints
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License. 
