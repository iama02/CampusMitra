# CampusMitra - Final Technical Review & Viva Guide

This document is structured specifically for your technical review. It contains exact, codebase-specific details of the CampusMitra implementation to help you answer in-depth architectural and workflow questions confidently.

---

## 1. PROJECT OVERVIEW

*   **Problem Solved:** CampusMitra centralizes and digitizes campus community interactions—replacing scattered WhatsApp groups and unstructured notice boards. It provides a secure, single platform for students to recover lost items, safely borrow/rent goods, and connect for peer-to-peer tutoring.
*   **Key Modules:** 
    1. Authentication & Profiles
    2. Borrow & Rent Marketplace (with secure OTP handover)
    3. Lost & Found (with AI-powered semantic matching)
    4. Peer Tutoring (Subject-based mentoring network)
*   **Tech Stack:**
    *   **Frontend:** Vanilla HTML5, CSS (TailwindCSS for styling), and Vanilla JavaScript (ES6+).
    *   **Backend:** Node.js with Express.js framework.
    *   **Database:** MongoDB via the Mongoose ORM.
    *   **3rd Party APIs/Libraries:** Google Generative AI (Gemini), Cloudinary (Image CDN), Nodemailer (Emails), JSON Web Tokens (JWT), bcryptjs (Password hashing).

---

## 2. SYSTEM ARCHITECTURE

*   **Overall Architecture:** Client-Server model using a RESTful API architecture. The frontend makes asynchronous HTTP requests to the backend, which processes business logic, queries MongoDB, and responds with JSON.
*   **Folder Structure:**
    *   `/pages/`: Contains HTML views (`auth.html`, `borrow.html`, `profile.html`, etc.).
    *   `/js/`: Contains isolated frontend logic for each page (e.g., `borrow.js`, `lostfound.js`).
    *   `/models/`: Contains Mongoose database schemas.
    *   `server.js`: The main Express server file containing all API routes, middleware, and database connection logic.
*   **Step-by-Step Flow:**
    1. User clicks a button (e.g., "Request Item").
    2. Frontend JS (`fetch()`) sends a POST request with a JWT token in the header.
    3. Express backend intercepts the route, runs `requireAuth` middleware to validate the JWT.
    4. Backend controller executes logic, queries MongoDB via Mongoose.
    5. Backend sends a `200/201` JSON response.
    6. Frontend updates the DOM dynamically based on the JSON data.

---

## 3. AUTHENTICATION SYSTEM

*   **Signup Flow:** User submits details $\rightarrow$ Backend checks if `email` or `rollNo` already exists $\rightarrow$ `userSchema.pre('save')` hook intercepts the save $\rightarrow$ Hashes the password using `bcryptjs` $\rightarrow$ Saves user to DB.
*   **Login Flow:** Backend looks up user by email $\rightarrow$ Uses `bcrypt.compare()` to verify password $\rightarrow$ If valid, signs a new JWT payload containing `id, name, email, whatsappNumber`.
*   **Password Hashing:** Used `bcryptjs` with a salt factor of 10. It is used because it has built-in salting and is computationally slow by design, protecting against brute-force/rainbow-table attacks.
*   **JWT Handling:** 
    *   *Creation:* Created via `jwt.sign()` with a 7-day expiration and a secret key (`getJwtSecret()`).
    *   *Storage:* Stored on the client side in `localStorage`.
    *   *Verification:* A custom `requireAuth` middleware extracts the token from the `Authorization: Bearer <token>` header and runs `jwt.verify()`.
*   **Password Reset:** Implemented via Nodemailer. Generates a random crypto hex token, hashes it, stores it with a 15-min expiration in the DB, and emails the plaintext token link to the user.

---

## 4. DATABASE DESIGN

*   **Collections & Core Fields:**
    *   `User`: name, rollNo, email, branch, password, averageRating.
    *   `BorrowItem`: id, name, description, price, timeUnit, image, status (Available/Reserved/In Use), owner.
    *   `BorrowRequest`: itemId, requesterId, status, handoverOTP, returnOTP.
    *   `LostFoundItem`: type (Lost/Found), name, location, reporterId.
    *   `TutorProfile` & `TutoringRequest`: Used to map students to subject experts.
    *   `Notification`: userId, title, message, isRead.
*   **Referencing vs Embedding:** 
    *   We used a **mixed approach (Denormalization)**. We used *Referencing* for core links (e.g., `requesterId: mongoose.Schema.Types.ObjectId, ref: 'User'`). 
    *   However, to optimize read performance and avoid expensive `.populate()` joins, we deliberately *Embedded* small data like `requesterName` and `requesterEmail` directly into the Request documents.
*   **Validation Rules:** Mongoose validators enforce data integrity. For example, the `email` field uses a Regex validator (`/.+\.ac\.in$/`) to strictly ensure only institutional emails can register.

---

## 5. CORE MODULES (Deep Dive)

### A. Lost & Found (with AI Matching)
*   **Purpose:** Allow users to report items and automatically find matches.
*   **Internal Workflow:**
    1. Input: User posts "Lost: Blue Milton Bottle".
    2. Processing: Backend saves the item. It then queries the DB for all "Open" items of the *opposite* type ("Found").
    3. AI Check: It sends the new item and the list of opposite items to the Gemini API with a strict prompt to return a JSON array of `{id, score}`.
    4. Output: The backend matches the returned IDs to the database items, sorts them by score, and returns them to the frontend to trigger a match popup.
*   **Edge Cases:** If the Gemini API fails, times out, or returns a 503 (High Demand), the backend catches the error silently, saves the item anyway, and simply returns an empty matches array.

### B. Borrow & Rent Marketplace
*   **Purpose:** Secure peer-to-peer sharing of physical items.
*   **Internal Workflow (Dual-OTP System):**
    1. Requester clicks "Borrow" $\rightarrow$ Generates a `BorrowRequest`.
    2. Owner "Accepts" $\rightarrow$ Backend generates a 4-digit `handoverOTP` and `returnOTP` via `Math.random()`. Item status becomes "Reserved".
    3. **Handover:** Users meet in person. Owner inputs the `handoverOTP` provided by the requester. Backend verifies it, clears the OTP, and marks item as "In Use".
    4. **Return:** Requester returns the item and inputs the `returnOTP` provided by the owner. Item becomes "Available" again.
*   **Limitations:** Currently relies on off-platform communication (WhatsApp/Email) to arrange the physical meeting.

### C. Peer Tutoring
*   **Purpose:** Skill sharing network.
*   **Workflow:** Users create a `TutorProfile`. Others browse and send a `TutoringRequest`. The tutor can Accept/Decline, which automatically triggers a `Notification` system event.

---

## 6. API DESIGN

*   **RESTful Routing:** Uses standard HTTP verbs.
    *   `GET /api/items` (Fetch catalog)
    *   `POST /api/items` (Add new item)
    *   `PATCH /api/items/requests/:id/status` (Update request status)
    *   `DELETE /api/lostfound/:id` (Resolve/Delete post)
*   **Example Request/Response (Login):**
    *   *Req:* `POST /api/auth/login` | Body: `{ "email": "x@college.ac.in", "password": "123" }`
    *   *Res:* `200 OK` | Body: `{ "message": "Login successful!", "token": "eyJhbG...", "user": {"name": "..."} }`
*   **Error Handling Strategy:** All endpoints use `try...catch`. Database/Auth errors return `400` (Bad Request) or `401/403` (Unauthorized), while internal exceptions return `500` with the error message.

---

## 7. FRONTEND IMPLEMENTATION

*   **API Calls:** Built using modern vanilla JavaScript `fetch()` promises inside `async/await` blocks.
*   **State Management:** Data is fetched and cached locally in variables (e.g., `let cachedItems = []`). When an action occurs (like deleting an item), the array is filtered locally and the DOM is re-rendered to avoid an extra network request.
*   **UI Updates:** The frontend relies on generating HTML string literals dynamically and injecting them via `innerHTML`. We use a custom `showToast()` function for non-blocking success/error feedback.

---

## 8. SPECIAL / ADVANCED FEATURES

*   **Feature:** Semantic AI Matching (Lost & Found).
*   **Library Used:** `@google/generative-ai` (Gemini Flash Model).
*   **How it Works Internally:** Instead of relying on exact text matching (which fails if one person says "Water Flask" and another says "Milton Bottle"), the backend builds a prompt containing stringified JSON of all active database items. It leverages the LLM's natural language understanding to calculate a confidence score for potential matches. We use regex (`replace(/^```json/, '')`) to clean the AI's response to ensure it parses perfectly via `JSON.parse()`.

---

## 9. SECURITY

*   **Authentication & Session:** JWTs prevent session hijacking because tokens are stateless and cryptographically signed.
*   **Authorization:** The `requireAuth` middleware injects `req.user`. When a user tries to delete an item, the backend explicitly verifies `if (item.reporterEmail !== req.user.email) return 403;` to prevent Insecure Direct Object Reference (IDOR) attacks.
*   **File Uploads:** Handled securely via `multer` and `multer-storage-cloudinary`, ensuring only images are uploaded and stored off-site on Cloudinary's CDN, protecting the server from malicious file executions.

---

## 10. PERFORMANCE & SCALABILITY

*   **Optimizations Done:**
    *   Images are offloaded to Cloudinary, saving local server bandwidth and disk space.
    *   No complex `.populate()` relational joins on the main feed; denormalization speeds up read queries significantly.
*   **Limitations & Future Scaling:**
    *   *Current limitation:* The notification system uses HTTP Polling (`setInterval(fetchNotifications, 30000)`), which generates unnecessary network traffic.
    *   *Scaling solution:* Replace HTTP polling with WebSockets (e.g., `Socket.io`) for persistent, low-latency, real-time push events.

---

## 11. CHALLENGES FACED & HOW THEY WERE SOLVED

1.  **AI Response Formatting:** The Gemini API sometimes returned responses wrapped in Markdown (` ```json `), which crashed `JSON.parse()`. 
    *   *Solution:* Implemented custom Regex cleaning steps in `server.js` before parsing the response.
2.  **API Rate Limiting & Outages:** The AI API occasionally throws 503 (High Demand) or 429 (Rate Limit) errors.
    *   *Solution:* Wrapped the AI logic in an isolated `try...catch` block. If the AI fails, the server logs a warning but proceeds to return a `201 Created` status so the core function of posting the item doesn't break for the user.
3.  **Physical Item Handover Trust:** How to ensure users actually exchanged the item?
    *   *Solution:* Engineered a Dual-OTP system (Pickup PIN & Return PIN) requiring both users to physically share a code generated securely on the backend.

---

## 12. FUTURE ENHANCEMENTS

1.  **In-App Messaging:** Replace the current WhatsApp/Email redirection with an internal WebSocket-based real-time chat.
2.  **Payment Gateway Integration:** Integrate Razorpay or Stripe to handle rental payments natively rather than relying on cash/external UPI.
3.  **Pagination:** Currently, `GET /api/items` returns all items. Implement skip/limit cursor pagination to handle thousands of items efficiently.
