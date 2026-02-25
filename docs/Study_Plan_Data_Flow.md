# Study Plan Data Flow Documentation

## Overview

The Study Plan feature provides a unified API workflow that generates AI-powered study plans from uploaded files and automatically creates all associated assets (images and audio) in a single request. Assets are generated as separate components and stored in Firebase Storage with comprehensive status tracking.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED API ROUTES                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                   /api/study-plan/create                                │ │
│  │                                                                         │ │
│  │ 1. Validate input & get extracted texts                                │ │
│  │ 2. Call AI to generate study plan structure                            │ │
│  │ 3. Save plan + modules to Firestore with pending assets               │ │
│  │ 4. ✨ AUTOMATICALLY call asset generation                              │ │
│  │ 5. Return complete results with asset status                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────────┐ │
│  │              /api/study-plan/assets/generate (Internal)                 │ │
│  │                                                                         │ │
│  │ • Processes all pending assets for a plan                              │ │
│  │ • Calls /api/image for slide_image & single_image                      │ │
│  │ • Calls /api/tts for script_audio                                      │ │
│  │ • Updates asset status and activity URLs                               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   AI SERVICES     │   │    FIRESTORE      │   │ FIREBASE STORAGE  │
│                   │   │                   │   │                   │
│ - Gemini (plans)  │   │ - plans           │   │ - studyplan_ai_   │
│ - /api/image      │   │ - dailyModule     │   │   assets/         │
│ - /api/tts        │   │ - studyplanAssets │   │   {planId}/       │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

---

## Unified Workflow: Complete Study Plan Creation

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
Frontend        Create API      Asset API      Firestore      AI Services    Storage
    │               │              │              │              │             │
    │──POST create──▶│              │              │              │             │
    │               │              │              │              │             │
    │               │──getTexts───▶│              │              │             │
    │               │◀─texts───────│              │              │             │
    │               │              │              │              │             │
    │               │──generatePlan────────────────────────────▶│             │
    │               │◀─AIResponse─────────────────────────────────             │
    │               │              │              │              │             │
    │               │──savePlan + Assets─────────▶│              │             │
    │               │◀─planId + assetIds──────────│              │             │
    │               │              │              │              │             │
    │               │──triggerAssets─────────────▶│              │             │
    │               │              │──getPending─▶│              │             │
    │               │              │◀─assetList──│              │             │
    │               │              │              │              │             │
    │               │              │──/api/image─────────────────▶│             │
    │               │              │──/api/tts───────────────────▶│             │
    │               │              │◀─buffers────────────────────│             │
    │               │              │              │              │             │
    │               │              │──upload──────────────────────────────────▶│
    │               │              │◀─downloadUrls────────────────────────────│
    │               │              │              │              │             │
    │               │              │──updateStatus───────────────▶│             │
    │               │◀─results─────│              │              │             │
    │               │              │              │              │             │
    │◀─complete─────│              │              │              │             │
```

### Files Involved

| File | Responsibility |
|------|----------------|
| `src/app/api/study-plan/create/route.ts` | Unified API orchestration + asset triggering |
| `src/app/api/study-plan/assets/generate/route.ts` | Internal asset generation for all asset types |
| `src/lib/firebase/firestore/getExtractedTextFromFile.ts` | Retrieve extracted text from files |
| `src/lib/ai/generateStudyPlan.ts` | Call Gemini to generate study plan |
| `src/lib/firebase/firestore/study-plan/saveStudyPlanToFirestore.ts` | Save plan + modules with enhanced assets |
| `src/lib/firebase/firestore/study-plan-assets/saveStudyPlanAIAssets.ts` | Create granular pending asset entries |
| `src/lib/firebase/firestore/study-plan-assets/assetGenerationWorkflow.ts` | Asset management utilities |

### Firestore Writes

```
1. Collection: plans
   └── Doc: {planId}
       ├── ownerId: "user123"
       ├── courseTitle: "Introduction to Biology & The Cell"
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
       ├── title: "Day 1: Unveiling Biology"
       ├── order: 1
       ├── isCompleted: false
       └── activities: [
             {
               type: "video",
               title: "Introduction to Biology",
               time_minutes: 45,
               video_segments: [...],
               assetStatus: "pending",
               assets: [
                 {
                   assetId: "asset1_slide0",
                   type: "slide_image",
                   segmentIndex: 0
                 },
                 {
                   assetId: "asset1_audio0",
                   type: "script_audio",
                   segmentIndex: 0
                 }
               ]
             },
             {
               type: "image", 
               title: "Cell Diagram",
               time_minutes: 10,
               image_description: "Detailed cell anatomy...",
               assetStatus: "pending",
               assets: [
                 {
                   assetId: "asset2_single",
                   type: "single_image"
                 }
               ]
             }
           ]

3. Collection: studyplanAIAssets (Enhanced Schema)
   └── Doc: {assetId}
       ├── ownerId: "user123"
       ├── planId: "planId"
       ├── dailyModuleId: "moduleId"
       ├── activityIndex: 0
       ├── assetType: "slide_image"   // "slide_image", "script_audio", "single_image"
       ├── segmentIndex: 0            // For video segments (optional)
       ├── prompt: "Welcome to Biology! The scientific study..."
       ├── status: "pending"          // "pending", "generating", "ready", "failed"
       ├── storagePath: null          // Set after generation
       ├── downloadUrl: null          // Set after generation
       ├── errorMessage: null         // Set if failed
       ├── createdAt: Timestamp
       └── updatedAt: Timestamp
```

### Response
```json
{
  "success": true,
  "planId": "abc123",
  "courseTitle": "Introduction to Biology & The Cell",
  "totalDays": 3,
  "dailyModuleIds": ["mod1", "mod2", "mod3"],
  "assets": {
    "totalAssets": 27,
    "generated": 25,
    "failed": 1,
    "pending": 1
  },
  "message": "Study plan created with 25/27 assets generated successfully."
}
```

---

## Asset Generation Details

### Asset Types & Storage Organization

#### Video Activities → Multiple Assets
```
"video" activity with 3 segments creates 6 assets:
├── slide_image (segment 0) → activity_0_slide_0.jpg
├── script_audio (segment 0) → activity_0_script_0.mp3  
├── slide_image (segment 1) → activity_0_slide_1.jpg
├── script_audio (segment 1) → activity_0_script_1.mp3
├── slide_image (segment 2) → activity_0_slide_2.jpg
└── script_audio (segment 2) → activity_0_script_2.mp3
```

#### Image Activities → Single Asset  
```
"image" activity creates 1 asset:
└── single_image → activity_1_single.jpg
```

### Firebase Storage Structure

```
users/
  └── {userId}/
      └── studyplan_ai_assets/
          └── {planId}/
              ├── images/
              │   ├── activity_0_slide_0.jpg      # Video slide images
              │   ├── activity_0_slide_1.jpg
              │   ├── activity_0_slide_2.jpg
              │   └── activity_1_single.jpg       # Single image activities
              └── audio/
                  ├── activity_0_script_0.mp3     # Video TTS narration
                  ├── activity_0_script_1.mp3
                  └── activity_0_script_2.mp3
```

### Asset Status Transitions

```
pending ──▶ generating ──▶ ready
                │
                └─────────▶ failed (if error)
```

### Internal Asset Generation Process

When `/api/study-plan/assets/generate` is called internally:

1. **Gets Pending Assets**: Queries all assets with `status: "pending"` for the plan
2. **Processes Each Asset**:
   - `slide_image` & `single_image` → calls `/api/image`
   - `script_audio` → calls `/api/tts`  
3. **Updates Status**: Marks as "generating" → "ready" or "failed"
4. **Updates Activities**: Links downloadUrl back to activity.assets[]

---

## Data Types

### Enhanced Activity Structure (Firestore)

```typescript
interface StoredActivity {
  type: "video" | "text" | "quiz" | "image";
  time_minutes: number;
  title: string;
  
  // Text activities
  content?: string;
  practice_problem?: string;
  
  // Video activities (multiple segments → multiple assets)
  video_segments?: VideoSegment[];
  
  // Image activities (single image → single asset)
  image_description?: string;
  
  // Quiz activities
  quiz_check?: QuizCheck[];
  
  // Asset tracking (NEW)
  assetStatus?: "pending" | "generating" | "ready" | "failed";
  assets?: ActivityAsset[];  // References to individual assets
}

interface ActivityAsset {
  assetId: string;
  type: "slide_image" | "script_audio" | "single_image";
  segmentIndex?: number;  // For video segments
  url?: string;           // Download URL when ready
}
```

### Enhanced Asset Document (Firestore)

```typescript
interface StudyPlanAssetDocument {
  ownerId: string;
  planId: string;
  dailyModuleId: string;
  activityIndex: number;
  
  assetType: "slide_image" | "script_audio" | "single_image";
  segmentIndex?: number;  // For video segments (0, 1, 2...)
  prompt?: string;        // Image description or TTS script
  
  status: "pending" | "generating" | "ready" | "failed";
  storagePath?: string;
  downloadUrl?: string;
  errorMessage?: string;
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## Error Handling

### Unified API Errors

| Error | Status | Cause |
|-------|--------|-----------| 
| Missing required field | 400 | Invalid request body |
| Failed to retrieve files | 400 | File not found or unauthorized |
| Some files have no extracted text | 400 | Files not processed yet |
| AI generation failed | 500 | Gemini API error |
| Asset generation partially failed | 200 | Some assets failed, but plan created |
| Failed to create study plan | 500 | Firestore write error |

### Asset Generation Errors (Internal)

| Error | Handling | Impact |
|-------|----------|---------| 
| Image generation failed | Mark asset as "failed" | Individual asset fails, others continue |
| TTS generation failed | Mark asset as "failed" | Individual asset fails, others continue |  
| Storage upload failed | Mark asset as "failed" | Individual asset fails, others continue |
| All assets failed | Activity marked "failed" | Activity unusable, plan still valid |

---

## Frontend Integration Guide

### 1. Create Complete Study Plan (Unified API)

```typescript
const response = await fetch("/api/study-plan/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ownerId: user.uid,
    fileIds: selectedFileIds,
    days: 3,
    hoursPerDay: 2,
    formats: ["video", "text", "image"],
  }),
});

const result = await response.json();

if (result.success) {
  // Plan created with assets automatically generated
  console.log(`Plan ${result.planId} created!`);
  console.log(`${result.assets.generated}/${result.assets.totalAssets} assets ready`);
  
  // Navigate directly to study plan
  router.push(`/study-plan/${result.planId}`);
} else {
  console.error("Plan creation failed:", result.error);
}
```

### 2. Monitor Asset Generation Progress

```typescript
// Check generation status
const statusResponse = await fetch(`/api/study-plan/assets/generate?planId=${planId}`);
const status = await statusResponse.json();

console.log(`Progress: ${status.progress}%`);
console.log(`Ready: ${status.statusCounts.ready}, Failed: ${status.statusCounts.failed}`);

// Real-time updates via Firestore listener
const unsubscribe = onSnapshot(
  query(
    collection(db, "studyplanAIAssets"), 
    where("planId", "==", planId)
  ),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const asset = change.doc.data();
      if (asset.status === "ready") {
        // Asset generated successfully
        updateUI(asset.activityIndex, asset.downloadUrl);
      }
    });
  }
);
```

### 3. Display Study Plan with Assets

```typescript
// Read daily modules with enhanced asset structure
const modulesRef = collection(db, "plans", planId, "dailyModule");
const modules = await getDocs(query(modulesRef, orderBy("order")));

modules.forEach((doc) => {
  const { activities } = doc.data();
  
  activities.forEach((activity) => {
    if (activity.type === "video" && activity.assets) {
      // Group assets by segment for video creation
      const segments = groupAssetsBySegment(activity.assets);
      
      segments.forEach((segment, index) => {
        const slideUrl = segment.find(a => a.type === "slide_image")?.url;
        const audioUrl = segment.find(a => a.type === "script_audio")?.url;
        
        if (slideUrl && audioUrl) {
          // Create video segment from slide + audio
          renderVideoSegment(slideUrl, audioUrl, index);
        }
      });
      
    } else if (activity.type === "image" && activity.assets?.[0]?.url) {
      // Render single image
      renderImage(activity.assets[0].url);
    }
  });
});

function groupAssetsBySegment(assets) {
  const segments = {};
  assets.forEach(asset => {
    const segIndex = asset.segmentIndex || 0;
    if (!segments[segIndex]) segments[segIndex] = [];
    segments[segIndex].push(asset);
  });
  return Object.values(segments);
}
```

---

## File Structure

```
src/
├── app/api/
│   └── study-plan/
│       ├── create/
│       │   └── route.ts                     # 🎯 Unified API endpoint (plan + assets)
│       └── assets/
│           ├── generate/
│           │   └── route.ts                 # Internal asset generation
│           └── process/
│               └── route.ts                 # ❌ Deprecated (returns 410)
│
└── lib/
    ├── ai/
    │   ├── generateStudyPlan.ts             # Gemini study plan generation 
    │   ├── generateVideoAsset.ts            # ❌ Deprecated (unused)
    │   └── generateImageAsset.ts            # ❌ Deprecated (unused)
    │
    └── firebase/
        ├── storage/
        │   ├── uploadAssetToStorage.ts      # 🆕 Firebase Storage uploads for AI assets
        │   └── uploadStudyPlanAsset.ts      # ❌ Deprecated (replaced by uploadAssetToStorage)
        │
        └── firestore/
            ├── getExtractedTextFromFile.ts  # Read file extracted text
            │
            ├── study-plan/
            │   └── saveStudyPlanToFirestore.ts     # Save plan + enhanced assets
            │
            └── study-plan-assets/
                ├── saveStudyPlanAIAssets.ts        # Create granular asset entries
                ├── updateStudyPlanAIAsset.ts       # Update asset status + URLs
                └── assetGenerationWorkflow.ts      # 🆕 Asset management utilities
```

### Key Changes from Old Architecture:

✅ **Unified Entry Point**: Single `/api/study-plan/create` handles everything  
✅ **Enhanced Assets**: Granular tracking with `assetType`, `segmentIndex`, `prompt`  
✅ **Asset Workflow**: New utilities for managing complex asset generation  
✅ **Automatic Generation**: Assets created immediately during plan creation  
✅ **Persistent Storage**: All generated assets uploaded to Firebase Storage via `uploadAssetToStorage`  
✅ **API Integration**: `/api/image` and `/api/tts` now support direct Firebase uploads  
❌ **Deprecated**: Old individual asset generation files and endpoints
