# UF Tutor Marketplace

### **App Overview**
The platform will be a marketplace connecting University of Florida students/parents with tutors (current students or alumni) for specific courses. The pages should be University of Florida themed, and be responsive and mobile-friendly. Key features include:
1. **Tutor Profiles**: Tutors create profiles, upload unofficial transcripts, resumes, and profile pictures.
2. **Course Catalog**: A predefined list of UF course codes/descriptions for tutors to select and for students to search.
3. **Search Functionality**: Parents/students can search for tutors by course, rating, or availability.
4. **Payment System**: Stripe integration for handling payments from students/parents and payouts to tutors.
5. **Admin Dashboard**: An admin view to manage tutor applications, track lessons, and process payments.

---

### **Technical Stack Recommendations**
1. **Frontend**: React with NextJS for a dynamic and responsive UI.
2. **Backend**: Firebase for authentication, database, and hosting.
   - **Firebase Auth**: For user authentication (tutors, students/parents, admins).
   - **Firestore**: NoSQL database for storing tutor profiles, courses, lessons, and payments.
   - **Firebase Hosting**: For deploying your React app.
3. **Payments**: Stripe for handling payments from students/parents and payouts to tutors.

---

### **App Layout and Features**

#### **1. User Roles**
- **Tutors**: Can create profiles, upload documents, select courses they can teach, and manage lessons.
- **Students/Parents**: Can search for tutors, book lessons, and make payments.
- **Admin**: Can manage tutor applications, track lessons, and process payments.

#### **2. Key Pages**
- **Homepage**: 
  - Search bar for finding tutors by course code/description.
  - Featured tutors or courses.
- **Tutor Profile Page**:
  - Tutor’s bio, profile picture, courses they teach, ratings, and availability.
  - Button to book a lesson.
- **Tutor Application Page**:
  - Form for tutors to upload unofficial transcripts, resumes, and select courses they can teach.
- **Admin Dashboard**:
  - View tutor applications.
  - Track completed lessons and payments.
  - Process payouts to tutors.

---

### **Firestore Data Structure**
Firestore uses a **document -> collection** pattern. Here’s how your data could be structured:

#### **1. Users Collection**
- **Document ID**: `user_id` (auto-generated by Firebase Auth).
- **Fields**:
  - `role`: `tutor`, `student`, or `admin`.
  - `email`: User’s email address.
  - `profile_picture_url`: URL to the user’s profile picture.
  - `created_at`: Timestamp of account creation.

#### **2. Tutors Collection**
- **Document ID**: `tutor_id` (same as `user_id` for tutors).
- **Fields**:
  - `bio`: Tutor’s bio.
  - `transcript_url`: URL to the tutor’s unofficial transcript.
  - `resume_url`: URL to the tutor’s resume.
  - `courses_taught`: Array of course codes (e.g., `["COP3502", "MAC2311"]`).
  - `rating`: Average rating (e.g., `4.5`).
  - `hourly_rate`: Tutor’s hourly rate (e.g., `30`).
  - `availability`: Array of available time slots.

#### **3. Courses Collection**
- **Document ID**: `course_code` (e.g., `COP3502`).
- **Fields**:
  - `course_description`: Description of the course (e.g., `Programming Fundamentals`).

#### **4. Lessons Collection**
- **Document ID**: `lesson_id` (auto-generated).
- **Fields**:
  - `tutor_id`: ID of the tutor.
  - `student_id`: ID of the student/parent.
  - `course_code`: Code of the course being taught.
  - `date`: Date of the lesson.
  - `duration`: Duration of the lesson in minutes.
  - `notes`: Notes about the lesson.
  - `status`: `pending`, `completed`, or `canceled`.

#### **5. Payments Collection**
- **Document ID**: `payment_id` (auto-generated).
- **Fields**:
  - `lesson_id`: ID of the associated lesson.
  - `amount`: Payment amount.
  - `status`: `pending`, `paid`, or `released`.

---

### **Example Firestore Queries**

#### **1. Finding Tutors for a Specific Course**
```javascript
db.collection('tutors')
  .where('courses_taught', 'array-contains', 'COP3502')
  .get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data());
    });
  });
```

#### **2. Filtering Tutors by Rating**
```javascript
db.collection('tutors')
  .where('rating', '>=', 4.5)
  .get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data());
    });
  });
```

#### **3. Fetching Lessons for a Tutor**
```javascript
db.collection('lessons')
  .where('tutor_id', '==', 'tutor_id_123')
  .get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data());
    });
  });
```

---

### **Payment Flow**
- **Student/Parent Side**:
  - Book a lesson and pay via Stripe.
  - Payment is held in escrow until the lesson is completed.
- **Tutor Side**:
  - After the lesson is marked as completed (with notes), the admin releases payment to the tutor.
- **Admin Side**:
  - Track all payments and manage payouts to tutors.

---

### **Roadmap for Development**

#### **Phase 1: Setup**
1. Set up the React app.
2. Configure Firebase (Auth, Firestore, Hosting).
3. Set up authentication with Firebase Auth.
4. Create the Firestore database structure.

#### **Phase 2: Core Features**
1. **Tutor Application Flow**:
   - Build the form for tutors to upload documents and select courses.
   - Store data in Firestore.
2. **Search Functionality**:
   - Implement search by course code/description.
   - Display tutor profiles based on search results.
3. **Lesson Booking**:
   - Allow students/parents to book lessons and pay via Stripe.
4. **Admin Dashboard**:
   - Build a dashboard to manage tutor applications, lessons, and payments.

#### **Phase 3: Payment Integration**
1. Integrate Stripe for payments from students/parents.
2. Implement a system to hold payments in escrow and release them to tutors after lesson completion.

#### **Phase 4: Polish and Launch**
1. Add styling and responsiveness.
2. Test the app thoroughly.
3. Deploy the app using Firebase Hosting.

---

### **README File Outline**
```markdown
# UF Tutor Marketplace

## Overview
A platform connecting University of Florida students/parents with tutors for specific courses.

## Features
- Tutor profiles with document uploads.
- Search for tutors by course.
- Lesson booking and payment via Stripe.
- Admin dashboard for managing tutors and payments.

## Tech Stack
- **Frontend**: React with NextJS
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **Payments**: Stripe

## Setup Instructions
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set up Firebase and Stripe environment variables.
4. Run the app: `npm start`.

## Firestore Data Structure
[Include the Firestore data structure here.]

## Payment Flow
[Describe the payment flow in detail.]

## Deployment
- Deploy the React app using Firebase Hosting.

## Contributors
[List contributors here.]

## License
[Add license information.]
```

---

### **Final Recommendations**
1. **Use Firebase**: It’s a great choice for authentication, real-time database, and hosting.
2. **Stripe for Payments**: Use Stripe for both incoming payments and payouts to tutors.
3. **Optimize Firestore Queries**: Use composite indexes and denormalize data where necessary to improve query performance.

Let me know if you need further clarification or help with Firebase-specific implementation details!