# StudyBomBibi

An AI-powered study companion that helps students learn faster and smarter. StudyBomBibi provides intelligent tools for generating quizzes, creating AI courses, and offering personalized learning assistance.

## Project Description

**Problem Statement:**
Students today face "digital fragmentation," spending more time managing scattered PDFs and lecture slides than actively learning. This leads to passive study habits, high academic distress (affecting over 70% of local undergraduates), and rapid information loss—up to 95% within 3 days.

**Our Solution:**
StudyBomBibi transforms scattered digital files into a structured, active learning journey. Instead of a passive file storage system, it acts as a **Proactive AI Tutor** that generates personalized courses, audio lectures, and interactive quizzes from your existing study materials.

**SDG Alignment:**
*   **SDG 4 (Quality Education):** We target **Target 4.4** by using AI-driven courses to equip students with technical mastery and **Target 4.5** by democratizing access to high-quality tutoring through multimodal content (text, audio, video).
*   **SDG 10 (Reduced Inequalities):** Aligning with **Target 10.2**, our platform provides a 24/7 AI tutor and multi-language support, ensuring high-quality academic guidance is accessible regardless of economic background.

## Implementation Details

Our architecture leverages Google's latest AI technologies to build a robust, scalable educational platform:

*   **Frontend:** Next.js 16, React 19, TypeScript (Type-safe, responsive UI with Tailwind CSS & Framer Motion).
*   **Backend:** Next.js API Routes (Node.js environment).
*   **Authentication:** Firebase Auth (Secure Google Sign-In and session persistence).
*   **Database:** Firebase Firestore (Real-time synchronization of AI courses and chat history).
*   **AI Engine:** **Google Gemini 2.5 Flash** (Selected for its 1M+ token context window to process entire textbooks and generate grounded AI courses).
*   **Audio:** **Google Cloud Text-to-Speech** (Converts AI-generated notes into natural audio lessons).

## Challenges Faced

During development, we encountered several key challenges:

*   **Mapping AI Responses to UI:** It was difficult to consistently parse and map the unstructured text responses from the AI into the structured UI components (like quizzes and AI courses).
*   **Secure Data Flow:** Managing the secure transfer of sensitive user data between the Next.js frontend and the backend API required careful architectural planning.
*   **Defining the Core Problem:** We spent significant time iterating on our problem statement to ensure we were solving the root cause of "digital fragmentation" rather than just building a generic tool.

## Future Roadmap

*   **Integration with Personal Calendars (Google/Outlook)**
    *   Directly sync generated AI courses with students' personal calendars to send reminders and block out dedicated focus time, turning static plans into actionable schedules.
*   **Community Study Hub & Peer Sharing**
    *   Allow users to share their verified AI-generated quizzes and course summaries with classmates, fostering a collaborative learning environment where students can test each other.

## Features

- **Dashboard** - Central hub for managing your learning journey
- **My Library** - Organize and manage your study materials and files
- **AI Courses** - AI-generated courses tailored to your learning needs
- **Exam Prep** - Focused preparation tools for exams
- **AI Assistant** - Intelligent chatbot that answers questions and explains concepts
- **Quiz Generation** - Automatically generate quizzes from your study materials
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
