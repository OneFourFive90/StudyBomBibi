# Unified Study Plan Generation API

## Overview

The study plan generation system has been restructured into a streamlined, unified API that handles both study plan creation and AI asset generation in a single workflow.

## ✅ **Recommended Architecture** (Current Implementation)

### 🎯 **Single Entry Point**
- **`POST /api/study-plan/create`** - Complete study plan creation + asset generation

### 🔧 **Internal Asset Processing**  
- **`POST /api/study-plan/assets/generate`** - Internal asset generation (called by create API)
- **`GET /api/study-plan/assets/generate`** - Check generation status

## 📋 **Complete Workflow**

### 1. Study Plan Creation
```typescript
POST /api/study-plan/create
{
  "ownerId": "user123",
  "fileIds": ["file1", "file2"],
  "days": 5,
  "hoursPerDay": 2,
  "formats": ["video", "image", "text"]
}
```

**What happens:**
1. ✅ Retrieves extracted text from files
2. ✅ Calls AI to generate study plan structure  
3. ✅ Saves plan to Firestore with pending assets
4. ✅ **Automatically triggers asset generation**
5. ✅ Returns complete results with asset generation status

### 2. Asset Generation (Internal)
The `/api/study-plan/assets/generate` endpoint:
- Gets all pending assets for the plan
- For each asset:
  - **Images**: Calls `/api/image` internally
  - **Audio**: Calls `/api/tts` internally  
  - Updates asset status and activity URLs
- Returns comprehensive generation results

### 3. Response Structure
```typescript
{
  "success": true,
  "planId": "plan123",
  "courseTitle": "Biology Fundamentals",
  "totalDays": 5,
  "dailyModuleIds": ["mod1", "mod2", ...],
  "assets": {
    "totalAssets": 12,
    "generated": 10,
    "failed": 1,
    "pending": 1
  },
  "message": "Study plan created with 10/12 assets generated successfully."
}
```

## 🏗️ **Asset Generation Details**

### Video Activities
For each video segment, creates:
- **`slide_image`** asset (calls `/api/image`)
- **`script_audio`** asset (calls `/api/tts`) 

### Image Activities  
Creates:
- **`single_image`** asset (calls `/api/image`)

### Storage Structure
```
/users/{userId}/studyplan_ai_assets/{planId}/
  images/
    activity_0_single.jpg           # Single images
    activity_1_slide_0.jpg          # Video slides  
    activity_1_slide_1.jpg
  audio/
    activity_1_script_0.mp3         # Video scripts
    activity_1_script_1.mp3
```

## 🎯 **Benefits of This Approach**

### ✅ **Pros**
1. **Single API Call** - Frontend only needs to call one endpoint
2. **Complete Workflow** - Everything handled internally  
3. **Better UX** - User gets study plan ready to use immediately
4. **Robust Error Handling** - Individual asset failures don't break the plan
5. **Progress Tracking** - Clear counts of generated/failed/pending assets
6. **Cleaner Architecture** - Simplified API surface

### ⚠️ **Considerations**
1. **Longer Response Time** - But provides immediate progress feedback
2. **Resource Intensive** - Generates many assets at once
3. **Complex Error Handling** - Need to handle partial failures gracefully

## 📊 **Monitoring & Status**

### Check Generation Status
```typescript
GET /api/study-plan/assets/generate?planId=plan123

Response:
{
  "planId": "plan123",
  "totalAssets": 12,
  "progress": 83,  // percentage
  "statusCounts": {
    "pending": 1,
    "generating": 1, 
    "ready": 10,
    "failed": 0
  },
  "isComplete": false
}
```

## 🔄 **Migration Notes**

### Deprecated Endpoints
- ❌ `POST /api/study-plan/assets/process` - Returns 410 with redirect info
- ❌ Individual asset processing workflows

### Updated File Structure  
- ✅ Enhanced asset schema with `assetType`, `segmentIndex`, `prompt`
- ✅ Activity structure with `assets[]` array instead of single `assetUrl`
- ✅ Comprehensive error tracking and status management

## 🚀 **Usage Example**

```typescript
// Frontend: Create complete study plan
const response = await fetch('/api/study-plan/create', {
  method: 'POST',
  body: JSON.stringify({
    ownerId: 'user123',
    fileIds: ['file1', 'file2'],
    days: 5,
    hoursPerDay: 2,
    formats: ['video', 'image']
  })
});

const result = await response.json();

if (result.success) {
  // Plan created successfully
  console.log(`Plan ${result.planId} created!`);
  console.log(`${result.assets.generated}/${result.assets.totalAssets} assets ready`);
  
  // Navigate to study plan
  router.push(`/study-plan/${result.planId}`);
}
```

This unified approach significantly improves the developer and user experience by providing a single, comprehensive API for complete study plan creation! 🎉