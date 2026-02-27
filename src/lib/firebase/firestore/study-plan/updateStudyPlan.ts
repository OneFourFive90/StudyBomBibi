import { db } from "@/lib/firebase/firebase";
import { doc, updateDoc, getDoc, Timestamp, collection, getDocs } from "firebase/firestore";

/**
 * Check if all activities in all daily modules are completed
 */
async function areAllActivitiesCompleted(planId: string): Promise<boolean> {
  const modulesRef = collection(db, "plans", planId, "dailyModule");
  const snapshot = await getDocs(modulesRef);
  
  for (const docSnap of snapshot.docs) {
    const moduleData = docSnap.data();
    const activities = moduleData.activities || [];
    
    for (const activity of activities) {
      if (!activity.isCompleted) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Calculate progress based on completed sections (same as frontend)
 * - For each module: 1 materials section + number of quiz activities
 * - Progress = (completed sections / total sections) * 100
 */
async function calculateProgressFromSections(planId: string): Promise<number> {
  const modulesRef = collection(db, "plans", planId, "dailyModule");
  const snapshot = await getDocs(modulesRef);
  
  let totalSections = 0;
  let completedSections = 0;

  snapshot.docs.forEach(doc => {
    const moduleData = doc.data();
    const activities = moduleData.activities || [];
    
    // Count total sections: 1 for materials + number of quizzes
    const quizCount = activities.filter((a: any) => a.type === "quiz").length;
    totalSections += 1 + quizCount;

    // Check if materials section is completed (first non-quiz activity is complete)
    const materialIdx = activities.findIndex((a: any) => a.type !== "quiz");
    if (materialIdx !== -1 && activities[materialIdx].isCompleted) {
      completedSections++;
    }

    // Check if each quiz is completed
    activities.forEach((activity: any) => {
      if (activity.type === "quiz" && activity.isCompleted) {
        completedSections++;
      }
    });
  });

  if (totalSections === 0) return 0;
  return Math.round((completedSections / totalSections) * 100);
}

/**
 * Calculate current day based on the highest consecutive completed daily modules
 * - Returns the next day to work on (or the last day if all are completed)
 * - Example: Days 1,2 completed, Day 3 incomplete, Day 4 completed -> currentDay = 3 (next to work on)
 * - Example: Days 1,2,3 completed (last day) -> currentDay = 3 (no next day)
 */
async function calculateCurrentDay(planId: string): Promise<number> {
  const planRef = doc(db, "plans", planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) return 1;
  
  const totalDays = planSnap.data().totalDays || 1;
  
  const modulesRef = collection(db, "plans", planId, "dailyModule");
  const snapshot = await getDocs(modulesRef);
  
  const modules = snapshot.docs
    .map(doc => ({
      order: doc.data().order,
      isCompleted: doc.data().isCompleted,
    }))
    .sort((a, b) => a.order - b.order);
  
  // Find the highest consecutive completed day
  let highestCompletedDay = 0;
  for (const module of modules) {
    if (module.isCompleted) {
      highestCompletedDay = module.order;
    } else {
      break; // Stop at first incomplete day
    }
  }
  
  // Return the next day to work on, or the last day if all are completed
  return Math.min(highestCompletedDay + 1, totalDays);
}

/**
 * Update completion status for a specific activity (section) in a daily module
 * @param planId - Study plan document ID
 * @param dailyModuleId - Daily module document ID
 * @param activityIndex - Index of the activity in the activities array
 * @param isCompleted - Completion status to set
 */
export async function updateActivityCompletionStatus(
  planId: string,
  dailyModuleId: string,
  activityIndex: number,
  isCompleted: boolean
) {
  const moduleRef = doc(db, "plans", planId, "dailyModule", dailyModuleId);
  const planRef = doc(db, "plans", planId);
  const moduleSnap = await getDoc(moduleRef);
  if (!moduleSnap.exists()) throw new Error("Module not found");

  const moduleData = moduleSnap.data();
  const activities = moduleData.activities || [];
  if (activityIndex < 0 || activityIndex >= activities.length) {
    throw new Error("Invalid activity index");
  }

  activities[activityIndex].isCompleted = isCompleted;
  activities[activityIndex].updatedAt = Timestamp.now();

  // Check if all activities are completed
  const allCompleted = activities.every((a: any) => a.isCompleted === true);

  const now = Timestamp.now();
  
  // Calculate progress based on completion status
  const newProgress = await calculateProgressFromSections(planId);

  // Write activity and progress updates first
  await Promise.all([
    updateDoc(moduleRef, {
      activities,
      isCompleted: allCompleted,
      updatedAt: now,
    }),
    updateDoc(planRef, {
      progress: newProgress,
      updatedAt: now,
    })
  ]);

  // Calculate currentDay after writing to Firestore (uses fresh data)
  const newCurrentDay = await calculateCurrentDay(planId);
  
  // Check if all activities are completed and update status accordingly
  const allActivitiesCompleted = await areAllActivitiesCompleted(planId);
  const planSnap = await getDoc(planRef);
  const currentStatus = planSnap.data()?.status;
  
  let statusUpdate = {};
  if (allActivitiesCompleted && currentStatus !== "completed") {
    statusUpdate = { status: "completed" };
  } else if (!allActivitiesCompleted && currentStatus === "completed") {
    statusUpdate = { status: "active" };
  }
  
  // Update currentDay and status if needed
  await updateDoc(planRef, {
    currentDay: newCurrentDay,
    ...statusUpdate,
  });
}

/**
 * Bulk update completion status for multiple activities (sections) in a daily module
 * @param planId - Study plan document ID
 * @param dailyModuleId - Daily module document ID
 * @param activityIndices - Array of activity indices to update
 * @param isCompleted - Completion status to set
 */
export async function bulkUpdateActivityCompletionStatus(
  planId: string,
  dailyModuleId: string,
  activityIndices: number[],
  isCompleted: boolean
) {
  const moduleRef = doc(db, "plans", planId, "dailyModule", dailyModuleId);
  const planRef = doc(db, "plans", planId);
  const moduleSnap = await getDoc(moduleRef);
  if (!moduleSnap.exists()) throw new Error("Module not found");

  const moduleData = moduleSnap.data();
  const activities = moduleData.activities || [];

  activityIndices.forEach(idx => {
    if (idx >= 0 && idx < activities.length) {
      activities[idx].isCompleted = isCompleted;
      activities[idx].updatedAt = Timestamp.now();
    }
  });

  // Check if all activities are completed
  const allCompleted = activities.every((a: any) => a.isCompleted === true);
  const now = Timestamp.now();
  
  // Calculate progress based on completion status
  const newProgress = await calculateProgressFromSections(planId);

  // Write activity and progress updates first
  await Promise.all([
    updateDoc(moduleRef, {
      activities,
      isCompleted: allCompleted,
      updatedAt: now,
    }),
    updateDoc(planRef, {
      progress: newProgress,
      updatedAt: now,
    })
  ]);

  // Calculate currentDay after writing to Firestore (uses fresh data)
  const newCurrentDay = await calculateCurrentDay(planId);
  
  // Check if all activities are completed and update status accordingly
  const allActivitiesCompleted = await areAllActivitiesCompleted(planId);
  const planSnap = await getDoc(planRef);
  const currentStatus = planSnap.data()?.status;
  
  let statusUpdate = {};
  if (allActivitiesCompleted && currentStatus !== "completed") {
    statusUpdate = { status: "completed" };
  } else if (!allActivitiesCompleted && currentStatus === "completed") {
    statusUpdate = { status: "active" };
  }
  
  // Update currentDay and status if needed
  await updateDoc(planRef, {
    currentDay: newCurrentDay,
    ...statusUpdate,
  });
}

/**
 * Utility to mark all activities in a daily module as completed
 * @param planId - Study plan document ID
 * @param dailyModuleId - Daily module document ID
 */
export async function completeAllActivitiesInModule(
  planId: string,
  dailyModuleId: string
) {
  const moduleRef = doc(db, "plans", planId, "dailyModule", dailyModuleId);
  const planRef = doc(db, "plans", planId);
  const moduleSnap = await getDoc(moduleRef);
  if (!moduleSnap.exists()) throw new Error("Module not found");

  const moduleData = moduleSnap.data();
  const activities = moduleData.activities || [];

  activities.forEach((activity: any) => {
    activity.isCompleted = true;
    activity.updatedAt = Timestamp.now();
  });

  const now = Timestamp.now();
  
  // Calculate progress based on completion status
  const newProgress = await calculateProgressFromSections(planId);

  // Write activity and progress updates first
  await Promise.all([
    updateDoc(moduleRef, {
      activities,
      isCompleted: true,
      updatedAt: now,
    }),
    updateDoc(planRef, {
      progress: newProgress,
      updatedAt: now,
    })
  ]);

  // Calculate currentDay after writing to Firestore (uses fresh data)
  const newCurrentDay = await calculateCurrentDay(planId);
  
  // Check if all activities are completed and update status accordingly
  const allActivitiesCompleted = await areAllActivitiesCompleted(planId);
  const planSnap = await getDoc(planRef);
  const currentStatus = planSnap.data()?.status;
  
  let statusUpdate = {};
  if (allActivitiesCompleted && currentStatus !== "completed") {
    statusUpdate = { status: "completed" };
  } else if (!allActivitiesCompleted && currentStatus === "completed") {
    statusUpdate = { status: "active" };
  }
  
  // Update currentDay and status if needed
  await updateDoc(planRef, {
    currentDay: newCurrentDay,
    ...statusUpdate,
  });
}
