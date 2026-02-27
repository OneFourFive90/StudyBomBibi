# Study Plan Assets Schema (Current Implementation)

## Overview

This document describes the current enhanced study plan assets system that handles the complexity of video generation through granular asset management. Videos consist of multiple slides (images) and narration scripts (audio) that are managed separately and combined in the frontend.

**Status**: ✅ **ACTIVE SYSTEM** - This is the current implementation as of the unified API restructure.

## Key Features

### 1. Granular Asset Management
- **Video Activities**: Multiple assets per activity (one image + one audio per segment)
- **Image Activities**: Single asset per activity
- **Comprehensive Tracking**: Individual status for each asset component

### 2. Asset Types
- `slide_image`: AI-generated images for video presentation slides
- `script_audio`: TTS-generated audio for video narration  
- `single_image`: AI-generated images for standalone image activities

### 3. Unified Workflow
- **Single API Entry**: `/api/study-plan/create` handles plan + asset generation
- **Automatic Processing**: Assets generated immediately during plan creation
- **Real-time Status**: Comprehensive progress tracking and error handling

## Schema Structure

### Collection: `studyplanAIAssets`
```typescript
{
  ownerId: string
  planId: string
  dailyModuleId: string
  activityIndex: number
  
  assetType: "slide_image" | "script_audio" | "single_image"
  segmentIndex?: number  // For video segments (0, 1, 2...)
  prompt?: string        // Image description or TTS script
  
  status: "pending" | "generating" | "ready" | "failed"
  storagePath?: string
  downloadUrl?: string
  errorMessage?: string
  
  createdAt: timestamp
  updatedAt?: timestamp
}
```

### Activity Structure in `dailyModule`
```typescript
{
  type: "video" | "text" | "quiz" | "image"
  title: string
  time_minutes: number
  
  // Video activities
  video_segments?: VideoSegment[]
  
  // Image activities  
  image_description?: string
  
  // Asset tracking
  assetStatus?: "pending" | "generating" | "ready" | "failed"
  assets?: ActivityAsset[]
  // Completion tracking
  isCompleted?: boolean // Section completion status (NEW)
}

interface ActivityAsset {
  assetId: string
  type: "slide_image" | "script_audio" | "single_image"
  segmentIndex?: number
  url?: string  // Set when asset is ready
}
```

## Firebase Storage Structure
```
/users/{userId}/studyplan_ai_assets/{planId}/
  images/
    activity_0_single.jpg          # Single image activity
    activity_1_slide_0.jpg         # Video slide 0
    activity_1_slide_1.jpg         # Video slide 1
  audio/
    activity_1_script_0.mp3        # Video script 0 TTS
    activity_1_script_1.mp3        # Video script 1 TTS
```

## Generation Workflow

### Unified API Approach
1. **Single API Call**: `/api/study-plan/create` handles everything
2. **Automatic Asset Creation**: Assets are created and generated in one workflow
3. **No Manual Triggering**: No need for separate asset generation calls

### For Video Activities
1. Create study plan with video segments via `/api/study-plan/create`
2. For each segment, automatically creates:
   - One `slide_image` asset (prompt: slide title + bullets)
   - One `script_audio` asset (prompt: script text)
3. Assets are automatically processed internally via `/api/study-plan/assets/generate`
4. Frontend gets complete plan with asset URLs ready for video assembly

### For Image Activities
1. Create study plan with image description via `/api/study-plan/create`
2. Automatically creates one `single_image` asset (prompt: image description)
3. Asset is automatically processed and URL returned
4. Frontend displays the generated image immediately

## API Endpoints

### Unified Study Plan Creation: `POST /api/study-plan/create`
```typescript
// Creates complete study plan + automatically generates all assets
{
  "ownerId": "user456",
  "fileIds": ["file1", "file2"], 
  "days": 3,
  "hoursPerDay": 2,
  "formats": ["video", "image"]
}

// Response includes asset generation results
{
  "success": true,
  "planId": "plan789",
  "courseTitle": "Introduction to Biology",
  "assets": {
    "totalAssets": 27,
    "generated": 25,
    "failed": 1,
    "pending": 1
  }
}
```

### Asset Generation Status: `GET /api/study-plan/assets/generate`
```typescript
// Check generation progress for a plan
GET /api/study-plan/assets/generate?planId=plan789

// Response
{
  "planId": "plan789",
  "totalAssets": 27,
  "progress": 93,
  "statusCounts": {
    "pending": 1,
    "generating": 1,
    "ready": 25,
    "failed": 0
  },
  "isComplete": false
}
```

### Internal Asset Processing: `POST /api/study-plan/assets/generate`
**Note**: This is called internally by the create API, not directly by frontend.
```typescript
// Internal call to process all assets for a plan
{
  "planId": "plan789",
  "userId": "user456"
}
```

### Deprecated Endpoints
- ❌ `/api/study-plan/assets/process` - Returns 410 with redirect info

## Integration Points

### Image Generation API (`/api/image`)
- Receives: `description`, `storagePath`, `userId`
- Returns: `downloadUrl`
- Used for both `slide_image` and `single_image` types

### TTS API (`/api/tts`)
- Receives: `text`, `storagePath`, `userId`  
- Returns: `downloadUrl`
- Used for `script_audio` type

### Frontend Video Creation
- Gets all assets for a video activity
- Combines slide images with script audio
- Creates video presentation in browser
- Could use libraries like FFmpeg.js or canvas-based solutions

## Benefits

1. **Unified Workflow**: Single API call creates plan and generates all assets
2. **Granular Control**: Track generation of individual slides and scripts
3. **Parallel Processing**: Generate multiple assets simultaneously
4. **Robust Error Handling**: Individual assets can fail without breaking entire activity
5. **Flexible Frontend**: Frontend decides how to combine assets into final video
6. **Storage Organization**: Clear file structure for different asset types
7. **Progress Tracking**: Monitor generation progress at asset and activity level
8. **Immediate Results**: Most assets generated during plan creation for instant usability

## Current Implementation Notes

**Status**: ✅ **IMPLEMENTED** - This enhanced schema is now the current system.

### Key Implementation Details:
1. **Unified API**: `/api/study-plan/create` handles everything automatically
2. **Enhanced Asset Schema**: All assets use `assetType`, `segmentIndex`, `prompt` fields
3. **Automatic Generation**: Assets are created and processed in single API call
4. **Organized Storage**: Assets stored in structured folders by plan and type
5. **Status Tracking**: Comprehensive asset and activity status management
6. **Error Resilience**: Individual asset failures don't break entire study plan

### File Structure:
- ✅ `/api/study-plan/create/route.ts` - Unified entry point
- ✅ `/api/study-plan/assets/generate/route.ts` - Internal asset processing
- ✅ Enhanced Firestore schema with granular asset tracking  
- ✅ Asset workflow utilities for process management
- ❌ Old individual asset generation files (deprecated)