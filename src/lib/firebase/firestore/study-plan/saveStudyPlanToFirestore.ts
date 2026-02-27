import { db } from "@/lib/firebase/firebase";
import {
  collection,
  addDoc,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { addAssetToBatch } from "../study-plan-assets/saveStudyPlanAIAssets";

// ============ TYPE DEFINITIONS ============

// Video segment structure from AI response
export interface VideoSegment {
  slide_title: string;
  bullets: string[];
  script: string;
}

// Quiz question structure from AI response
export interface QuizCheck {
  question: string;
  options: string[];
  answer: string;
}

// Activity structure from AI response
export interface AIActivity {
  type: "video" | "text" | "quiz" | "image";
  time_minutes: number;
  title: string;
  // Text activities
  content?: string;
  practice_problem?: string;
  // Video activities
  video_segments?: VideoSegment[];
  // Image activities
  image_description?: string;
  // Quiz activities
  quiz_check?: QuizCheck[];
}

// Daily schedule from AI response
export interface AIScheduleDay {
  day: number;
  title: string;
  activities: AIActivity[];
}

// Full AI response structure
export interface AIStudyPlanResponse {
  courseTitle: string;
  schedule: AIScheduleDay[];
}

// ============ FIRESTORE DOCUMENT TYPES ============

// Activity stored in Firestore (with optional asset URLs)
export interface StoredActivity extends AIActivity {
  assetStatus?: "pending" | "generating" | "ready" | "failed";
  assets?: ActivityAsset[]; // References to individual assets
  isCompleted?: boolean; // Completion status for this activity
}

// Individual asset reference within an activity
export interface ActivityAsset {
  assetId: string;
  type: "slide_image" | "script_audio" | "single_image";
  segmentIndex?: number; // For video segments
  url?: string; // Download URL when ready
}

// Daily module document in subcollection
export interface DailyModuleDocument {
  title: string;
  order: number;
  isCompleted: boolean;
  activities: StoredActivity[];
}

// Main plan document
export interface PlanDocument {
  ownerId: string;
  courseTitle: string;
  sourceFileIds: string[];
  totalDays: number;
  currentDay: number;
  hoursPerDay: number;
  prefStyle: string[]; // ["video", "text", "image"]
  progress: number;
  status: "active" | "completed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ SAVE FUNCTION ============

export interface SaveStudyPlanInput {
  ownerId: string;
  sourceFileIds: string[];
  hoursPerDay: number;
  prefStyle: string[];
  aiResponse: AIStudyPlanResponse;
}

export interface SaveStudyPlanResult {
  planId: string;
  dailyModuleIds: string[];
  pendingAssetIds: string[];
}

/**
 * Save a complete study plan to Firestore
 * - Creates plan document in 'plans' collection
 * - Creates daily modules in 'plans/{planId}/dailyModule' subcollection
 * - Creates pending asset entries in 'studyplanAIAssets' for video/image activities
 */
export async function saveStudyPlanToFirestore(
  input: SaveStudyPlanInput
): Promise<SaveStudyPlanResult> {
  const { ownerId, sourceFileIds, hoursPerDay, prefStyle, aiResponse } = input;
  const now = Timestamp.now();

  // 1. Create the main plan document
  const planData: PlanDocument = {
    ownerId,
    courseTitle: aiResponse.courseTitle,
    sourceFileIds,
    totalDays: aiResponse.schedule.length,
    currentDay: 1,
    hoursPerDay,
    prefStyle,  //["video", "text", "image"]
    progress: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const planRef = await addDoc(collection(db, "plans"), planData);
  const planId = planRef.id;

  // 2. Create daily modules and track assets that need generation
  const dailyModuleIds: string[] = [];
  const pendingAssetIds: string[] = [];
  const batch = writeBatch(db);

  for (const scheduleDay of aiResponse.schedule) {
    // Create daily module document
    const dailyModuleRef = doc(collection(db, "plans", planId, "dailyModule"));
    const dailyModuleId = dailyModuleRef.id;
    dailyModuleIds.push(dailyModuleId);

    // Process activities and identify assets to generate
    const storedActivities: StoredActivity[] = scheduleDay.activities.map(
      (activity, index) => {
        const storedActivity: StoredActivity = { ...activity };
        const assets: ActivityAsset[] = [];

        // Set completion status for each activity (default: false)
        storedActivity.isCompleted = false;

        if (activity.type === "video" && activity.video_segments) {
          // Create assets for each video segment (image + audio)
          activity.video_segments.forEach((segment, segmentIndex) => {
            // Create slide image asset
            const slideImageAssetId = addAssetToBatch(batch, {
              ownerId,
              planId,
              dailyModuleId,
              activityIndex: index,
              assetType: "slide_image",
              segmentIndex,
              prompt: `Slide: ${segment.slide_title}. Bullets: ${segment.bullets.join(", ")}`,
            }, now);
            pendingAssetIds.push(slideImageAssetId);
            assets.push({
              assetId: slideImageAssetId,
              type: "slide_image",
              segmentIndex,
            });

            // Create script audio asset
            const scriptAudioAssetId = addAssetToBatch(batch, {
              ownerId,
              planId,
              dailyModuleId,
              activityIndex: index,
              assetType: "script_audio",
              segmentIndex,
              prompt: segment.script,
            }, now);
            pendingAssetIds.push(scriptAudioAssetId);
            assets.push({
              assetId: scriptAudioAssetId,
              type: "script_audio",
              segmentIndex,
            });
          });
          storedActivity.assetStatus = "pending";
          storedActivity.assets = assets;
        } else if (activity.type === "image" && activity.image_description) {
          // Create single image asset
          const imageAssetId = addAssetToBatch(batch, {
            ownerId,
            planId,
            dailyModuleId,
            activityIndex: index,
            assetType: "single_image",
            prompt: activity.image_description,
          }, now);
          pendingAssetIds.push(imageAssetId);
          storedActivity.assetStatus = "pending";
          storedActivity.assets = [{
            assetId: imageAssetId,
            type: "single_image",
          }];
        }

        return storedActivity;
      }
    );

    const dailyModuleData: DailyModuleDocument = {
      title: scheduleDay.title,
      order: scheduleDay.day,
      isCompleted: false,
      activities: storedActivities,
    };

    batch.set(dailyModuleRef, dailyModuleData);
  }

  // 3. Commit all daily modules and asset entries
  await batch.commit();

  return {
    planId,
    dailyModuleIds,
    pendingAssetIds,
  };
}
