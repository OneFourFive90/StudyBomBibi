# Activity Completion & Progress Tracking System

## Overview

This document describes how users track progress through study plans by completing activities (learning materials and quizzes), and how the backend calculates progress percentage and determines the current day.

**Status**: ✅ **ACTIVE SYSTEM** - This is the current implementation as of the quiz completion fix.

---

## Core Concepts

### Section Definition
A **section** is a completable unit within a study plan:

- **Materials Section**: All learning activities in a day (text, video, images)
  - Count: **1 per day**
  - Completed when: User completes all non-quiz activities and marks them
  
- **Quiz Section**: Each individual quiz in a day  
  - Count: 1 per quiz × number of quizzes per day
  - Completed when: User submits quiz answers

### Example
```
Day 1: "Introduction to Biology"
├── Materials Section (1 section)
│   ├── Video: "What is Biology?" (45 min)
│   ├── Text: "Core Concepts" (30 min)
│   └── Image: "Cell Structure Diagram"
│
├── Quiz Section 1: "Biology Basics Quiz"
│
└── Quiz Section 2: "Vocabulary Quiz"

Total sections for Day 1 = 3 (1 materials + 2 quizzes)
```

---

## Progress Calculation

### Formula
```
Progress % = (Completed Sections / Total Sections) × 100

Where:
  Completed Sections = sections marked with isCompleted: true
  Total Sections = sum of all sections across all days
  
  Total Sections per day = 1 (materials) + number of quizzes
```

### Frontend Calculation
In the course detail page (`src/app/(dashboard)/courses/[id]/page.tsx`):

```typescript
// Calculate total sections
const totalActivities = dailyModules.reduce((acc, mod) => {
  const quizCount = mod.activities.filter(a => a.type === "quiz").length;
  return acc + 1 + quizCount;  // 1 for materials, rest for quizzes
}, 0);

// Count completed sections from completedSections Set
const completedActivities = Array.from(completedSections).length;

// Display progress
const progressPercent = Math.round((completedActivities / totalActivities) * 100);
```

### Backend Calculation
In `src/lib/firebase/firestore/study-plan/updateStudyPlan.ts`:

```typescript
async function calculateProgressFromSections(planId: string): Promise<number> {
  // Read all daily modules
  const modulesRef = collection(db, "plans", planId, "dailyModule");
  const snapshot = await getDocs(modulesRef);
  
  let totalSections = 0;
  let completedSections = 0;

  snapshot.docs.forEach(doc => {
    const moduleData = doc.data();
    const activities = moduleData.activities || [];
    
    // Count total: 1 materials + quizzes
    const quizCount = activities.filter((a: any) => a.type === "quiz").length;
    totalSections += 1 + quizCount;

    // Count completed: materials section
    const materialIdx = activities.findIndex((a: any) => a.type !== "quiz");
    if (materialIdx !== -1 && activities[materialIdx].isCompleted) {
      completedSections++;
    }

    // Count completed: each quiz
    activities.forEach((activity: any) => {
      if (activity.type === "quiz" && activity.isCompleted) {
        completedSections++;
      }
    });
  });

  if (totalSections === 0) return 0;
  return Math.round((completedSections / totalSections) * 100);
}
```

---

## Current Day Calculation

### Purpose
Determine which day the user should focus on next (the first incomplete day).

### Algorithm
```
1. Get total days from plan
2. Read all daily modules
3. Find highest consecutive completed day
   - Example: Days 1,2,3 completed (in order) → highest = 3
   - Example: Days 1,2 completed, Day 3 incomplete, Day 4 completed (skipped) → highest = 2
     (because we stop at first incomplete)
4. Return min(highest + 1, totalDays)
   - Usually returns next day to work on
   - Returns last day if all days completed
```

### Backend Implementation
In `src/lib/firebase/firestore/study-plan/updateStudyPlan.ts`:

```typescript
async function calculateCurrentDay(planId: string): Promise<number> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return 1;
  
  const totalDays = planSnap.data().totalDays || 1;
  
  // Get all modules sorted by order
  const modulesRef = collection(db, "plans", planId, "dailyModule");
  const snapshot = await getDocs(modulesRef);
  
  const modules = snapshot.docs
    .map(doc => ({
      order: doc.data().order,
      isCompleted: doc.data().isCompleted,
    }))
    .sort((a, b) => a.order - b.order);
  
  // Find highest consecutive completed day
  let highestCompletedDay = 0;
  for (const module of modules) {
    if (module.isCompleted) {
      highestCompletedDay = module.order;
    } else {
      break;  // ← Stop at first incomplete day
    }
  }
  
  // Return next day or last day if all completed
  return Math.min(highestCompletedDay + 1, totalDays);
}
```

### Examples

**Scenario 1: Normal progression**
```
Day 1: ✅ All sections completed (isCompleted: true)
Day 2: ❌ Not completed yet (isCompleted: false)
Day 3: ✅ (not yet reached)

highestCompletedDay = 1
currentDay = min(1 + 1, 3) = 2  ← User should work on Day 2
```

**Scenario 2: All days completed**
```
Day 1: ✅ (isCompleted: true)
Day 2: ✅ (isCompleted: true)
Day 3: ✅ (isCompleted: true)

highestCompletedDay = 3
currentDay = min(3 + 1, 3) = 3  ← Stay on last day
```

**Scenario 3: Partial completion (skip)**
```
Day 1: ✅ (isCompleted: true)
Day 2: ❌ (isCompleted: false)
Day 3: ✅ (isCompleted: true)   ← Already completed

highestCompletedDay = 1  ← Only counts consecutive
currentDay = min(1 + 1, 3) = 2  ← User should complete Day 2 first
```

---

## Activity Completion Workflow

### User Flow: Materials Section

```
User sees learning materials
        ↓
    [After reading/watching all materials]
        ↓
[Mark as Completed] button clicked
        ↓
Frontend updates completedSections Set
        ↓
Backend: updateActivityCompletionStatus(
  planId,
  moduleId, 
  activityIndex (of materials),
  true
)
        ↓
✅ Materials marked complete
```

### User Flow: Quiz Section

```
User clicks quiz in sidebar
        ↓
Quiz start page shown
        ↓
    [Start Quiz]
        ↓
Answer all questions
        ↓
    [Submit Quiz]
        ↓
↓────────────────────────────────────────↓
│ IMMEDIATE SAVE (NEW)                   │
│ updateActivityCompletionStatus() called │
│ Frontend updates completedSections     │
↓─────────────────────────────────────────↓
        ↓
Quiz results page shown
        ↓
[Next Section] button clicked (optional)
        ↓
✅ Quiz marked complete
✅ Progress updated
✅ Navigate to next content
```

---

## Firestore Update Sequence

### Key Change: CurrentDay Calculation Order

**BEFORE**: Calculated BEFORE updates written
- ❌ Used stale Firestore data (modules not yet updated)
- ❌ Could produce incorrect currentDay

**AFTER**: Calculated AFTER updates written  
- ✅ Uses fresh data from Firestore
- ✅ Accurate currentDay calculation

### Complete Update Sequence

When `updateActivityCompletionStatus()` is called:

```
1. Read module data from Firestore
   └── Get current state of all activities

2. Update activity in memory
   └── activities[index].isCompleted = true
   └── activities[index].updatedAt = now()

3. Check if module is fully completed
   └── allCompleted = all activities marked true

4. Calculate progress
   └── calculateProgressFromSections() 
   └── Reads all modules from Firestore

5. WRITE #1: Activities + Progress
   └── updateDoc(moduleRef, { activities, isCompleted: allCompleted })
   └── updateDoc(planRef, { progress: newProgress })
   └── ⏳ Waits for both writes to complete

6. CALCULATE currentDay after write
   └── calculateCurrentDay()
   └── Reads fresh module data (includes updates from step 5)

7. WRITE #2: CurrentDay
   └── updateDoc(planRef, { currentDay: newCurrentDay })
```

### Code Example

```typescript
export async function updateActivityCompletionStatus(
  planId: string,
  dailyModuleId: string,
  activityIndex: number,
  isCompleted: boolean
) {
  // Step 1: Read and update in memory
  const activities = [...];
  activities[activityIndex].isCompleted = isCompleted;
  
  // Step 2-4: Calculate progress
  const newProgress = await calculateProgressFromSections(planId);

  // Step 5: Write activities + progress FIRST
  await Promise.all([
    updateDoc(moduleRef, {
      activities,
      isCompleted: allCompleted,
    }),
    updateDoc(planRef, {
      progress: newProgress,
    })
  ]);

  // Step 6-7: Calculate and write currentDay AFTER
  const newCurrentDay = await calculateCurrentDay(planId);
  await updateDoc(planRef, {
    currentDay: newCurrentDay,
  });
}
```

---

## Quiz Completion

### Quiz Submission Flow

**Immediate Save** (When "Submit Quiz" is clicked):

```typescript
// In [id]/page.tsx, Submit Quiz button onClick:
onClick={async () => {
  setQuizSubmitted(true);  // Show results page
  
  // SAVE TO FIRESTORE IMMEDIATELY
  const activityIndex = currentModule.activities.findIndex(
    (a, idx) => a.type === "quiz" && idx === activeQuizIndex
  );
  
  await updateActivityCompletionStatus(
    courseId,
    currentModule.id,
    activityIndex,
    true  // Mark quiz as completed
  );
  
  // Update frontend state
  setCompletedSections(prev => {
    const newSet = new Set(prev);
    newSet.add(getSectionKey(activeModuleDay, "quiz", activeQuizIndex));
    return newSet;
  });
}}
```

### Why Immediate Save?

1. **Data Loss Protection**: If user closes page after submitting, completion is saved
2. **Frontend Sync**: Sidebar immediately shows quiz as completed ✅
3. **No Optional Saves**: Doesn't rely on user clicking "Next Section"
4. **User Feedback**: Green checkmark appears immediately

---

## API Summary

### `updateActivityCompletionStatus()`
**Location**: `src/lib/firebase/firestore/study-plan/updateStudyPlan.ts`

```typescript
export async function updateActivityCompletionStatus(
  planId: string,
  dailyModuleId: string,
  activityIndex: number,
  isCompleted: boolean
): Promise<void>
```

**What it does**:
1. Updates activity completion status
2. Recalculates progress
3. Writes activity + progress to Firestore
4. Calculates currentDay
5. Writes currentDay to Firestore

**Called from**:
- Quiz submission (when "Submit Quiz" clicked)
- Materials completion (when "Mark as Completed" clicked)

### `calculateProgressFromSections()`
**Location**: `src/lib/firebase/firestore/study-plan/updateStudyPlan.ts`

```typescript
async function calculateProgressFromSections(planId: string): Promise<number>
```

**Returns**: Progress percentage (0-100)

**Reads from**: All daily modules and their activities

### `calculateCurrentDay()`
**Location**: `src/lib/firebase/firestore/study-plan/updateStudyPlan.ts`

```typescript
async function calculateCurrentDay(planId: string): Promise<number>
```

**Returns**: Next day to work on (1 to totalDays)

**Reads from**: Plan document and all daily modules
