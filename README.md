# StudyBomBibi

An AI-powered study companion that helps students learn faster and smarter. StudyBomBibi provides intelligent tools for generating quizzes, creating study plans, and offering personalized learning assistance.

## Project Description

**Problem Statement:**
Students today face "digital fragmentation," spending more time managing scattered PDFs and lecture slides than actively learning. This leads to passive study habits, high academic distress (affecting over 70% of local undergraduates), and rapid information loss—up to 95% within 3 days.

**Our Solution:**
StudyBomBibi transforms scattered digital files into a structured, active learning journey. Instead of a passive file storage system, it acts as a **Proactive AI Tutor** that generates personalized courses, audio lectures, and interactive quizzes from your existing study materials.

**SDG Alignment:**
*   **SDG 4 (Quality Education):** We target **Target 4.4** by using AI-driven study plans to equip students with technical mastery and **Target 4.5** by democratizing access to high-quality tutoring through multimodal content (text, audio, video).
*   **SDG 10 (Reduced Inequalities):** Aligning with **Target 10.2**, our platform provides a 24/7 AI tutor and multi-language support, ensuring high-quality academic guidance is accessible regardless of economic background.

## Implementation Details

Our architecture leverages Google's latest AI technologies to build a robust, scalable educational platform:

*   **Frontend:** Next.js 16, React 19, TypeScript (Type-safe, responsive UI with Tailwind CSS & Framer Motion).
*   **Backend:** Next.js API Routes (Node.js environment).
*   **Authentication:** Firebase Auth (Secure Google Sign-In and session persistence).
*   **Database:** Firebase Firestore (Real-time synchronization of study plans and chat history).
*   **AI Engine:** **Google Gemini 2.5 Flash** (Selected for its 1M+ token context window to process entire textbooks and generate grounded study plans).
*   **Audio:** **Google Cloud Text-to-Speech** (Converts AI-generated notes into natural audio lessons).

## Challenges Faced

During our beta testing with 39 real users, we encountered and solved several critical issues:

1.  **The Context Switching Problem:** Users disliked switching tabs to use AI tools.
    *   *Solution:* We built **In-Text Contextual AI**, allowing users to highlight text directly in a document to "Quick Explain" or "Summarize" without breaking flow.
2.  **Library Clutter:** Users found it hard to organize AI-generated insights.
    *   *Solution:* We implemented **Smart Folders** and a direct **"Save to Notes"** feature within chats to create a structured knowledge base.
3.  **Stability & Auth:** Early versions suffered from chatbot timeouts and session drops.
    *   *Solution:* We optimized LLM API timeouts and patched the Firebase Google Authentication flow, resulting in zero reported login drops in subsequent tests.

## Future Roadmap

*   **Phase 1 (0-12 Months): Creator-Led Marketplace**
    *   Launch a marketplace where educators can upload materials.
    *   Enable students to hyper-personalize purchased courses using Gemini to restructure pacing.
*   **Phase 2 (1-2 Years): Enterprise Integration**
    *   Integrate via API with platforms like Moodle, Canvas, and Google Classroom.
    *   Automate the processing of lecture materials the moment a professor uploads them.
*   **Phase 3 (2+ Years): Global Accessibility**
    *   Utilize Gemini's advanced translation to allow uploads in native languages while receiving world-class study plans in English (and vice versa).
    *   Launch "AI-Verified" peer tutoring economy.

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
