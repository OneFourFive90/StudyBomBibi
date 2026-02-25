# Study Plan Data Flow Documentation

## Overview

The Study Plan feature allows users to generate AI-powered study plans from uploaded files, which are then stored in Firestore. Video and image assets are generated asynchronously and stored in Firebase Storage.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API ROUTES                                           │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ /api/study-plan/create  │    │ /api/study-plan/assets/generate         │ │
│  │                         │    │                                         │ │
│  │ 1. Validate input       │    │ 1. Get asset document                   │ │
│  │ 2. Get extracted texts  │    │ 2. Get activity data                    │ │
│  │ 3. Call AI generation   │    │ 3. Generate video/image                 │ │
│  │ 4. Save to Firestore    │    │ 4. Upload to Storage                    │ │
│  │ 5. Return planId        │    │ 5. Update Firestore                     │ │
│  └─────────────────────────┘    └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   AI SERVICES     │   │    FIRESTORE      │   │ FIREBASE STORAGE  │
│                   │   │                   │   │                   │
│ - Gemini (plans)  │   │ - plans           │   │ - studyplan_ai_   │
│ - Video gen (TBD) │   │ - dailyModule     │   │   assets          │
│ - Image gen (TBD) │   │ - studyplanAssets │   │                   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

---

## Flow 1: Create Study Plan

### Request
```
POST /api/study-plan/create

{
  "ownerId": "user123",
  "fileIds": ["fileId1", "fileId2"],
  "days": 3,
  "hoursPerDay": 2,
  "formats": ["video", "text", "image"]
}
```

### Sequence Diagram

```
Frontend                API Route              Firestore              Gemini AI
    │                       │                      │                      │
    │──POST /create────────▶│                      │                      │
    │                       │                      │                      │
    │                       │──getExtractedTexts──▶│                      │
    │                       │◀──texts + names──────│                      │
    │                       │                      │                      │
    │                       │──generateStudyPlan──────────────────────────▶│
    │                       │◀──AIStudyPlanResponse───────────────────────│
    │                       │                      │                      │
    │                       │──saveStudyPlan──────▶│                      │
    │                       │   (batch write)      │                      │
    │                       │   - plans doc        │                      │
    │                       │   - dailyModule docs │                      │
    │                       │   - asset docs       │                      │
    │                       │◀──planId─────────────│                      │
    │                       │                      │                      │
    │◀──{ planId, ... }─────│                      │                      │
```

### Files Involved

| File | Responsibility |
|------|----------------|
| `src/app/api/study-plan/create/route.ts` | API endpoint orchestration |
| `src/lib/firebase/firestore/getExtractedTextFromFile.ts` | Retrieve extracted text from files |
| `src/lib/ai/generateStudyPlan.ts` | Call Gemini to generate study plan |
| `src/lib/firebase/firestore/study-plan/saveStudyPlanToFirestore.ts` | Save plan + modules to Firestore |
| `src/lib/firebase/firestore/study-plan-assets/saveStudyPlanAIAssets.ts` | Create pending asset entries |

### Firestore Writes

```
1. Collection: plans
   └── Doc: {planId}
       ├── ownerId: "user123"
       ├── courseTitle: "Biology Fundamentals"
       ├── sourceFileIds: ["fileId1", "fileId2"]
       ├── totalDays: 3
       ├── currentDay: 1
       ├── hoursPerDay: 2
       ├── prefStyle: ["video", "text", "image"]
       ├── progress: 0
       ├── status: "active"
       ├── createdAt: Timestamp
       └── updatedAt: Timestamp

2. Sub-collection: plans/{planId}/dailyModule
   └── Doc: {dailyModuleId}
       ├── title: "Day 1: Cell Structure"
       ├── order: 1
       ├── isCompleted: false
       └── activities: [
             {
               type: "video",
               title: "Introduction",
               time_minutes: 15,
               video_segments: [...],
               assetId: "assetId1"      // Link to pending asset
             },
             {
               type: "text",
               title: "Cell Membrane",
               content: "## Overview..."
             },
             {
               type: "quiz",
               title: "Day 1 Quiz",
               quiz_check: [...]
             }
           ]

3. Collection: studyplanAIAssets
   └── Doc: {assetId}
       ├── ownerId: "user123"
       ├── planId: "planId"
       ├── dailyModuleId: "moduleId"
       ├── activityIndex: 0
       ├── type: "video"
       ├── status: "pending"          // Will change to "ready"
       ├── storagePath: null          // Will be set after generation
       ├── downloadUrl: null          // Will be set after generation
       └── createdAt: Timestamp
```

### Response
```json
{
  "success": true,
  "planId": "abc123",
  "courseTitle": "Biology Fundamentals",
  "totalDays": 3,
  "dailyModuleIds": ["mod1", "mod2", "mod3"],
  "pendingAssets": 5,
  "message": "Study plan created successfully. 5 assets pending generation."
}
```

---

## Flow 2: Generate Asset

### Request
```
POST /api/study-plan/assets/generate

{
  "assetId": "assetId1"
}
```

### Sequence Diagram

```
Frontend              API Route           Firestore         AI Service        Storage
    │                     │                   │                 │               │
    │──POST /generate────▶│                   │                 │               │
    │                     │                   │                 │               │
    │                     │──getAssetById────▶│                 │               │
    │                     │◀──asset doc───────│                 │               │
    │                     │                   │                 │               │
    │                     │──getActivity─────▶│                 │               │
    │                     │◀──activity data───│                 │               │
    │                     │                   │                 │               │
    │                     │──markGenerating──▶│                 │               │
    │                     │                   │                 │               │
    │                     │──generate─────────────────────────▶│               │
    │                     │◀──buffer + mime────────────────────│               │
    │                     │                   │                 │               │
    │                     │──upload───────────────────────────────────────────▶│
    │                     │◀──storagePath + url────────────────────────────────│
    │                     │                   │                 │               │
    │                     │──markAssetReady──▶│                 │               │
    │                     │──updateActivity──▶│                 │               │
    │                     │                   │                 │               │
    │◀──{ downloadUrl }───│                   │                 │               │
```

### Files Involved

| File | Responsibility |
|------|----------------|
| `src/app/api/study-plan/assets/generate/route.ts` | API endpoint orchestration |
| `src/lib/firebase/firestore/study-plan-assets/updateStudyPlanAIAsset.ts` | Update asset status + activity URL |
| `src/lib/ai/generateVideoAsset.ts` | Generate video from segments (TODO) |
| `src/lib/ai/generateImageAsset.ts` | Generate image from description (TODO) |
| `src/lib/firebase/storage/uploadStudyPlanAsset.ts` | Upload to Firebase Storage |

### Asset Status Transitions

```
pending ──▶ generating ──▶ ready
                │
                └─────────▶ failed (if error)
```

### Firestore Updates

```
1. studyplanAIAssets/{assetId}
   Before:
     status: "pending"
     storagePath: null
     downloadUrl: null
   
   After:
     status: "ready"
     storagePath: "users/user123/studyplan_ai_assets/plan_planId_vid_assetId.mp4"
     downloadUrl: "https://firebasestorage.googleapis.com/..."
     updatedAt: Timestamp

2. plans/{planId}/dailyModule/{moduleId}
   activities[0].assetUrl: "https://firebasestorage.googleapis.com/..."
```

### Firebase Storage Path

```
users/
  └── {userId}/
      └── studyplan_ai_assets/
          ├── plan_{planId}_vid_{assetId}.mp4    (video)
          └── plan_{planId}_img_{assetId}.png    (image)
```

### Response
```json
{
  "success": true,
  "assetId": "assetId1",
  "type": "video",
  "storagePath": "users/user123/studyplan_ai_assets/plan_abc123_vid_xyz789.mp4",
  "downloadUrl": "https://firebasestorage.googleapis.com/...",
  "message": "Asset generated successfully"
}
```

---

## Data Types

### AI Study Plan Response (from Gemini)

```typescript
interface AIStudyPlanResponse {
  courseTitle: string;
  schedule: Array<{
    day: number;
    title: string;
    activities: Array<{
      type: "video" | "text" | "quiz" | "image";
      time_minutes: number;
      title: string;
      // Text
      content?: string;
      practice_problem?: string;
      // Video
      video_segments?: Array<{
        slide_title: string;
        bullets: string[];
        script: string;
      }>;
      // Image
      image_description?: string;
      // Quiz
      quiz_check?: Array<{
        question: string;
        options: string[];
        answer: string;
      }>;
    }>;
  }>;
}
```

### Asset Generation Result

```typescript
interface GenerateAssetResult {
  buffer: Buffer;
  mimeType: string;    // "video/mp4" | "image/png"
  extension: string;   // "mp4" | "png"
}
```

---

## Error Handling

### Create Study Plan Errors

| Error | Status | Cause |
|-------|--------|-------|
| Missing required field | 400 | Invalid request body |
| Failed to retrieve files | 400 | File not found or unauthorized |
| Some files have no extracted text | 400 | Files not processed yet |
| AI generation failed | 500 | Gemini API error |
| Failed to create study plan | 500 | Firestore write error |

### Generate Asset Errors

| Error | Status | Cause |
|-------|--------|-------|
| Missing assetId | 400 | Invalid request |
| Asset not found | 404 | Invalid assetId |
| Asset is currently being generated | 409 | Duplicate request |
| Asset generation failed | 500 | AI service error |
| Failed to generate asset | 500 | Storage/Firestore error |

---

## Frontend Integration Guide

### 1. Create Study Plan

```typescript
const response = await fetch("/api/study-plan/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ownerId: user.uid,
    fileIds: selectedFileIds,
    days: 3,
    hoursPerDay: 2,
    formats: ["video", "text"],
  }),
});

const { planId, pendingAssets } = await response.json();

// Navigate to plan page
router.push(`/plans/${planId}`);
```

### 2. Generate Assets (After Plan Created)

```typescript
// Option A: Generate all pending assets
for (const assetId of pendingAssetIds) {
  await fetch("/api/study-plan/assets/generate", {
    method: "POST",
    body: JSON.stringify({ assetId }),
  });
}

// Option B: Use Firestore listener for real-time updates
const unsubscribe = onSnapshot(
  query(collection(db, "studyplanAIAssets"), where("planId", "==", planId)),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.doc.data().status === "ready") {
        // Asset is ready, update UI
      }
    });
  }
);
```

### 3. Display Plan with Assets

```typescript
// Read daily modules
const modulesRef = collection(db, "plans", planId, "dailyModule");
const modules = await getDocs(query(modulesRef, orderBy("order")));

modules.forEach((doc) => {
  const { activities } = doc.data();
  activities.forEach((activity) => {
    if (activity.type === "video" && activity.assetUrl) {
      // Render video player with activity.assetUrl
    }
  });
});
```

---

## File Structure

```
src/
├── app/api/
│   └── study-plan/
│       ├── create/
│       │   └── route.ts              # Create study plan endpoint
│       └── assets/
│           └── generate/
│               └── route.ts          # Generate single asset
│
└── lib/
    ├── ai/
    │   ├── generateStudyPlan.ts      # Gemini study plan generation
    │   ├── generateVideoAsset.ts     # Video generation (TODO)
    │   └── generateImageAsset.ts     # Image generation (TODO)
    │
    └── firebase/
        ├── storage/
        │   └── uploadStudyPlanAsset.ts      # Upload to Firebase Storage
        │
        └── firestore/
            ├── getExtractedTextFromFile.ts  # Read file extracted text
            │
            ├── study-plan/
            │   └── saveStudyPlanToFirestore.ts  # Save plan + modules
            │
            └── study-plan-assets/
                ├── saveStudyPlanAIAssets.ts     # Create pending assets
                └── updateStudyPlanAIAsset.ts    # Update asset status
```
