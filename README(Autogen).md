# UF Tutor Marketplace

A platform connecting University of Florida students with tutors for course-specific help. The platform enables tutors to create profiles, students to search for tutors based on courses, and facilitates scheduling and payment for tutoring sessions.

## Features

- **Tutor Profiles**: Tutors can create profiles, upload unofficial transcripts, resumes, and profile pictures.
- **Course Catalog**: A predefined list of UF course codes and descriptions for tutors to select and for students to search.
- **Search Functionality**: Students can search for tutors by course, rating, or availability.
- **Payment System**: Stripe integration for handling payments from students and payouts to tutors.
- **Admin Dashboard**: An admin view to manage tutor applications, track lessons, and process payments.

## Technologies Used

- **Next.js**: React framework with server-side rendering
- **TypeScript**: For type-safe code
- **Tailwind CSS**: For styling
- **Firebase**: Authentication, Firestore database, and Storage
- **Stripe**: Payment processing

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- Stripe account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/uf-tutor-marketplace.git
   cd uf-tutor-marketplace
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory with your Firebase and Stripe configuration:
   ```
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret
   ```

4. Set up Firebase:
   - Create a new Firebase project
   - Enable Authentication (Email/Password)
   - Create Firestore database
   - Set up Storage for file uploads
   - Set up proper security rules for Firestore and Storage

5. Set up Stripe:
   - Create a Stripe account
   - Get your API keys
   - Set up webhook endpoint (for production)

### Running the Development Server

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment

The application can be deployed to Vercel, Netlify, or any other platform that supports Next.js:

```
npm run build
npm run start
```

## Project Structure

- `/src/app`: Next.js pages and API routes
- `/src/components`: Reusable React components
- `/src/firebase`: Firebase configuration and utility functions
- `/src/hooks`: Custom React hooks
- `/src/lib`: Utility functions and TypeScript types

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- University of Florida
- All contributors to this project 