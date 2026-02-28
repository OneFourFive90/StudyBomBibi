# StudyBomBibi

An AI-powered study companion that helps students learn faster and smarter. StudyBomBibi provides intelligent tools for generating quizzes, creating study plans, and offering personalized learning assistance.

## Features

- **Dashboard** - Central hub for managing your learning journey
- **My Library** - Organize and manage your study materials and files
- **AI Courses** - AI-generated courses tailored to your learning needs
- **Exam Prep** - Focused preparation tools for exams
- **AI Assistant** - Intelligent chatbot that answers questions and explains concepts
- **Quiz Generation** - Automatically generate quizzes from your study materials
- **Study Plans** - AI-generated personalized study plans with structured activities
- **Text Extraction** - Extract text from images and documents
- **File Management** - Upload, preview, and organize study materials
- **Notes** - Create and manage study notes
- **Text-to-Speech** - Convert text to audio for better learning retention
- **Dark Mode** - Light and dark theme support

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI Framework**: Tailwind CSS, Radix UI, Framer Motion
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **AI Models**: Google Generative AI (Gemini)
- **Audio**: Google Cloud Text-to-Speech
- **Development**: ESLint, Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `src/app` - Next.js app directory with pages and layouts
- `src/components` - Reusable React components
- `src/lib` - Utility functions and API integrations
- `src/context` - React context for state management
- `src/hooks` - Custom React hooks
- `docs` - Project documentation
