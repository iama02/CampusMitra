# CampusMitra - Database Architecture & Schema Guide

This document provides a complete, deep-dive explanation of the database architecture used in the CampusMitra project. It is specifically structured to help you answer database-related questions during your technical review or viva.

---

## 1. Core Database Choice
**Database:** MongoDB
**ODM (Object Data Modeling) Library:** Mongoose

**Why MongoDB?**
* **Flexibility:** As a campus utility app, item descriptions, availability slots, and profile structures can vary. A NoSQL document database like MongoDB allows flexible schema structures.
* **Rapid Prototyping:** MongoDB works seamlessly with Node.js/Express, passing JSON directly from the client to the database without complex serialization mapping.

---

## 2. Design Philosophy: Referencing vs. Embedding
We used a **mixed relational approach** (Denormalization) to optimize for speed.

* **Referencing:** We use `mongoose.Schema.Types.ObjectId` with `ref: 'User'` to explicitly link documents (e.g., linking a `BorrowRequest` to the `User` who requested it). This maintains a single source of truth for critical relationships.
* **Embedding (Denormalization):** To avoid expensive and slow `.populate()` joins on the most frequently hit API endpoints, we actively embed non-volatile relational data. For example, instead of just saving `requesterId`, we also save `requesterName` and `requesterEmail` directly inside the `BorrowRequest` and `LostFoundItem` collections. This allows the frontend to render the user interface instantly in a single query.

---

## 3. Collections and Detailed Schemas

The database consists of **8 core collections**. Every collection automatically gets `createdAt` and `updatedAt` timestamps due to the Mongoose `{ timestamps: true }` option.

### A. User (`users`)
Stores all student authentication and core profile data.
* `name` (String, required): Full name of the student.
* `rollNo` (String, required, unique): Student's college ID.
* `email` (String, required, unique): Institutional email. Includes a Regex validator (`/.+\.ac\.in$/`) to ensure only college students can register.
* `branch` & `year` (String, required): Academic details.
* `password` (String, required): Hashed using `bcryptjs` before saving.
* `whatsappNumber` (String, default: ''): Optional contact number for P2P interactions.
* `averageRating` (Number, default: 0) & `ratingCount` (Number, default: 0): Tracks the aggregate trust score of the user across transactions.
* `resetPasswordToken` & `resetPasswordExpires`: Temporary fields used for the password reset workflow.

### B. BorrowItem (`borrowitems`)
Represents the items available for borrowing/renting in the marketplace.
* `id` (Number, required): An explicit numerical ID (simulating auto-increment) used to simplify frontend routing instead of exposing complex ObjectIds.
* `name` & `description` (String, required): Item details.
* `price` (Number, required) & `timeUnit` (String, required): Renting terms (e.g., 50 per Day).
* `image` (String): Cloudinary image CDN URL.
* `category` (String, default: "General"): Categorization.
* `status` (String, default: "Available"): Tracks availability. Transitions to "Reserved" and "In Use" during active requests.
* `owner` (String, required): The name of the user who posted the item.

### C. BorrowRequest (`borrowrequests`)
Handles the transactional state between an item owner and a requester.
* `itemId` & `itemName`: Details of the target item.
* `ownerName`: Embedded owner name.
* `requesterId` (ObjectId, ref: 'User'): The student borrowing the item.
* `requesterName` & `requesterEmail`: Embedded data for faster frontend rendering.
* `status` (String): Follows the lifecycle: `['Pending', 'Accepted', 'Declined', 'In Use', 'Returned']`.
* `handoverOTP` & `returnOTP` (String, default: null): Dynamically generated 4-digit PINs acting as digital signatures to prove the physical exchange of items.
* **Index Constraint:** A unique compound index on `{ itemId: 1, requesterId: 1 }` prevents a user from spamming requests for the same item.

### D. LostFoundItem (`lostfounditems`)
Stores lost or found items, utilizing AI for matching.
* `type` (String, enum: `['Lost', 'Found']`): Explicit categorization.
* `name`, `description`, `location` (String, required): Details used by the Gemini AI to find semantic matches.
* `status` (String, enum: `['Open', 'Resolved']`): Determines if the item is still active.
* `reporterId` (ObjectId, ref: 'User'): The person making the post.
* `reporterName`, `reporterEmail`, `reporterWhatsapp`: Denormalized contact info to allow finders/losers to connect immediately.

### E. TutorProfile (`tutorprofiles`)
Maps subject-matter experts (tutors) to their offerings.
* `name`, `subjects`, `description`, `availability` (String, required): Profile details.
* `rating` (String, default: '*****'): Visual representation of tutor quality.
* `ownerId` (ObjectId, ref: 'User'): The actual user acting as the tutor.
* `ownerName`, `ownerEmail`: Denormalized for rendering.

### F. TutoringRequest (`tutoringrequests`)
Manages session bookings between students and tutors.
* `tutorId` (ObjectId, ref: 'TutorProfile') & `tutorName`
* `studentId` (ObjectId, ref: 'User'), `studentName`, `studentEmail`
* `status` (String, enum: `['Pending', 'Accepted', 'Declined']`): Session state.
* **Index Constraint:** Unique compound index on `{ tutorId: 1, studentId: 1 }` ensures a student can't double-book the same tutor simultaneously.

### G. Notification (`notifications`)
A centralized event logging system for user alerts.
* `userId` (ObjectId, ref: 'User'): The recipient of the notification.
* `title`, `message` (String, required): Notification content.
* `type` (String, enum: `['info', 'success', 'warning', 'error']`): Determines UI color (e.g., success is green).
* `isRead` (Boolean, default: false): Used to show unread badges on the frontend.
* `link` (String): Internal routing path to redirect the user when clicked.

### H. Review (`reviews`)
Maintains the integrity and trust score of the platform.
* `reviewerId` (ObjectId, ref: 'User')
* `targetName` (String, required): The user being reviewed.
* `rating` (Number, min: 1, max: 5): The star rating given.
* `requestId` (ObjectId, required): Ties the review to a specific, completed transaction (borrowing or tutoring).
* **Index Constraint:** Unique compound index on `{ reviewerId: 1, requestId: 1 }` explicitly prevents review-bombing (users can only leave one review per completed transaction).

---

## 4. Key Database Hooks & Middleware

* **Password Hashing:** In `userSchema.pre('save')`, we intercept any database save operation. If the `password` field was modified, we generate a salt (`bcrypt.genSalt(10)`) and hash the password before it reaches the physical database layer. This ensures plaintext passwords are never accidentally saved.
* **Auto-Timestamps:** Mongoose automatically handles `createdAt` and `updatedAt`, which we use directly in the frontend to sort items chronologically (e.g., `.sort({ createdAt: -1 })`).
