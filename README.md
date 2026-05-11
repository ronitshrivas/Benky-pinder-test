# Becky Pinder Yoga & Wellness

A full-stack Next.js application for Becky Pinder, featuring a Midnight Navy & Champagne Gold design, Firebase backend, Square payments, and a comprehensive admin panel.

## Features

### Public Facing
- **Midnight Navy & Champagne Gold** responsive design
- **Home, Retreats, Courses, Becky (About), Blog, Contact** pages
- **User Authentication** via Firebase (Email/Password, Google, OTP Verification)
- **Course Purchases** via Square Web Payments SDK
- **Contact Form** with automated email notifications

### User Dashboard
- **My Courses**: View purchased courses and watch video lessons
- **My Bookings**: View registered retreats
- **Profile**: Manage account details
- **Purchase History**: View past transactions and download invoices

### Admin Panel
- **Dashboard**: Overview of users, revenue, and enrollments
- **Gallery Management**: Upload and manage photos/videos with titles and locations
- **Courses Management**: Full CRUD for video courses, including lesson uploads
- **Retreats Management**: Manage retreat listings and track available spots
- **Blog Management**: Write and publish blog posts
- **Payment History**: View all transactions across the platform
- **User Management**: View registered users and manage admin roles

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Payments**: Square Web Payments SDK & Square Node.js SDK
- **Emails**: Nodemailer (via Firebase Cloud Functions)

## Getting Started

Please refer to the `IMPLEMENTATION_GUIDE.md` for the complete Firebase App Hosting, Firestore, Storage, Functions, Square, and email deployment flow.
