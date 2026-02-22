# Quiz Generation & Saving Backend Architecture

## Overview
The quiz system has two main phases:
1. **Generation & Preview** - User creates and previews quiz (no Firestore writes)
2. **Save** - User confirms and saves quiz to Firestore

---
## User Actions & API Flow

| User Action | API Called | Purpose |
|---|---|---|
| Click "Generate Quiz" | `POST /api/ai/generate-quiz` | Create preview |
| Click "Regenerate" | `POST /api/ai/generate-quiz` | New preview (browser memory only) |
| Click "Save Quiz" | `POST /api/quizzes/save` | Persist to Firestore |
| Click "Discard" | None | Clear browser state |
| Open quiz viewer | Loads from Firestore | Display saved quiz |
| Submit answer | None (yet) | Update browser state |

---

## Data Flow Summary

```
User Form
    ↓
POST /api/ai/generate-quiz
    ↓ (raw AI response)
Transform → calculate score
    ↓ (Firestore format)
Frontend Preview
    ↓
[Regenerate] → POST /api/ai/generate-quiz again
[Discard] → Clear state
[Save] → POST /api/quizzes/save
    ↓
Firestore (collection: quizzes)
    ↓
Quiz Viewer loads from Firestore
```

---

## Key Design Decisions

1. **Transform in `/api/ai/generate-quiz`** - Preview and saved quiz use same format
2. **No Firestore pollution** - Only intentional saves are persisted
3. **Stateless generation** - Each regenerate is independent
4. **Pre-calculated scores** - Score totals computed at generation time
5. **Separate endpoints** - Clean separation between generation and persistence

---

## API Endpoints

### 1. `POST /api/ai/generate-quiz` - Generate Quiz Preview
**What triggers it:** User fills form and clicks "Generate Quiz" button

**Input:**
```json
{
  "mode": "mcq" | "past_year",
  "sourceText": ["Material 1", "Material 2", ...], // frontend needs to fetch extracted text from the files using the given fileIds before calling this API
  "numQuestions": 5,
  "customPrompt": "optional instructions",
  "pastYearText": ["..."] // only for past_year mode
  "duration": "..." // only for past_year mode
}
```

**Output:** Quiz in **Firestore format** (already transformed)
```json
{
  "success": true,
  "title": "Generated Quiz Title",
  "questions": [
    {
      "id": "q_1",
      "type": "mcq",
      "question": "...",
      "marks": 1,
      "options": [...],
      "correctAnswerIndex": 1,
      "userSelectedIndex": null,
      "isCorrect": null,
      "explanation": "..."
    }
  ],
  "score": { "mcqScore": 0, "mcqTotal": 5, "structuredTotal": 0 }
}
```

**What happens:**
- Calls Gemini API to generate quiz in raw format
- Transforms raw AI response to Firestore schema
- Calculates initial score totals
- Returns preview data to frontend (NO Firestore save)

---

### 2. `POST /api/quizzes/save` - Save Quiz to Firestore
**What triggers it:** User clicks "Save Quiz" button after preview

**Input:** Preview data (already in Firestore format) from `/api/ai/quiz`
```json
{
  "ownerId": "test-user-123",
  "mode": "mcq" | "past_year",
  "quizData": { /* entire response from /api/ai/quiz */ },
  "customTitle": "optional custom title"
}
```

**Output:**
```json
{
  "success": true,
  "quizId": "firestore_doc_id",
  "title": "Quiz Title",
  "questionCount": 5,
  "message": "Quiz saved successfully"
}
```

**What happens:**
- Takes already-transformed quiz data
- Adds Firestore metadata (ownerId, status, timestamps)
- Saves to `quizzes` collection
- Returns quizId for loading later

---
## Firestore Schema

**Collection:** `quizzes`
**Document Fields:**
- `ownerId` (string) - User ID
- `title` (string) - Quiz title
- `mode` (string) - "mcq" or "past_year"
- `status` (string) - "uncomplete" or "completed"
- `score` (object) - { mcqScore, mcqTotal, structuredTotal }
- `questions` (array) - MCQQuestion[] | StructuredQuestion[]
- `createdAt` (timestamp) - Document creation time
- `updatedAt` (timestamp) - Last update time
