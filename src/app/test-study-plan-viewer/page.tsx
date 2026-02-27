'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import PresentationPlayer from "@/components/PresentationPlayer";

interface ActivityAsset {
  assetId: string;
  type: 'slide_image' | 'script_audio' | 'single_image';
  segmentIndex?: number;
  url?: string;
}

interface Activity {
  type: 'video' | 'text' | 'quiz' | 'image';
  title: string;
  time_minutes: number;
  content?: string;
  image_description?: string;
  practice_problem?: string;
  video_segments?: Array<{ slide_title: string; bullets: string[]; script: string }>;
  quiz_check?: Array<{ question: string; options: string[]; answer: string }>;
  assets?: ActivityAsset[];
}

interface DailyModule {
  id: string;
  title: string;
  order: number;
  activities: Activity[];
}

interface StudyPlan {
  id: string;
  courseTitle: string;
  totalDays: number;
  currentDay: number;
  hoursPerDay: number;
  status: string;
  createdAt: any;
}

export default function StudyPlanViewer() {
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [dailyModules, setDailyModules] = useState<DailyModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const userId = 'test-user-123';

  // Fetch study plans for the user
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansRef = collection(db, 'plans');
        const q = query(plansRef, where('ownerId', '==', userId));
        const snapshot = await getDocs(q);
        const plans = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as StudyPlan[];
        setStudyPlans(plans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    fetchPlans();
  }, []);

  // Fetch daily modules and assets for selected plan
  useEffect(() => {
    if (!selectedPlan) return;

    const fetchModules = async () => {
      setLoading(true);
      try {
        // Get daily modules from subcollection
        const modulesRef = collection(db, 'plans', selectedPlan.id, 'dailyModule');
        const snapshot = await getDocs(modulesRef);
        const modules = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as DailyModule[];
        
        setDailyModules(modules.sort((a, b) => a.order - b.order));

        // Fetch asset URLs from Firestore
        const assetsRef = collection(db, 'studyplanAIAssets');
        const q = query(assetsRef, where('planId', '==', selectedPlan.id));
        const assetsSnapshot = await getDocs(q);
        
        const urls: Record<string, string> = {};
        assetsSnapshot.docs.forEach(doc => {
          const asset = doc.data();
          if (asset.downloadUrl) {
            urls[doc.id] = asset.downloadUrl;
          }
        });
        
        setAssetUrls(urls);
      } catch (error) {
        console.error('Error fetching modules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [selectedPlan]);

  const currentModule = dailyModules.find(m => m.order === currentDay);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>📚 Study Plan Viewer</h1>

      {/* Plan Selection */}
      {!selectedPlan ? (
        <div>
          <h2>Available Study Plans for {userId}</h2>
          {studyPlans.length === 0 ? (
            <p style={{ color: 'red' }}>No study plans found. Create one first!</p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {studyPlans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    background: '#f0f0f0',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  <strong>{plan.courseTitle}</strong>
                  <br />
                  <small>
                    {plan.totalDays} days • {plan.hoursPerDay} hrs/day • Status: {plan.status}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedPlan(null);
              setDailyModules([]);
              setCurrentDay(1);
            }}
            style={{
              marginBottom: '20px',
              padding: '10px 20px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            ← Back to Plans
          </button>

          {/* Plan Header */}
          <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '5px', marginBottom: '20px' }}>
            <h2>{selectedPlan.courseTitle}</h2>
            <p>
              Days: {selectedPlan.totalDays} | Hours/Day: {selectedPlan.hoursPerDay} | Status: {selectedPlan.status}
            </p>
          </div>

          {/* Day Navigation */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Array.from({ length: selectedPlan.totalDays }).map((_, idx) => (
              <button
                key={idx + 1}
                onClick={() => setCurrentDay(idx + 1)}
                style={{
                  padding: '10px 15px',
                  background: currentDay === idx + 1 ? '#007bff' : '#e0e0e0',
                  color: currentDay === idx + 1 ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: currentDay === idx + 1 ? 'bold' : 'normal',
                }}
              >
                Day {idx + 1}
              </button>
            ))}
          </div>

          {/* Daily Module Content */}
          {loading ? (
            <p>Loading activities...</p>
          ) : currentModule ? (
            <div>
              <h3>{currentModule.title}</h3>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                {currentModule.activities.map((activity, idx) => (
                  <ActivityCard
                    key={idx}
                    activity={activity}
                    assetUrls={assetUrls}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p>No activities found for this day.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity, assetUrls }: { activity: Activity; assetUrls: Record<string, string> }) {
  const [audioPlaying, setAudioPlaying] = useState(false);
const mockVideoSegments = [
    {
      slide_title: "Welcome to Computer Science!",
      bullets: [
        "The study of algorithms and data structures.",
        "The foundation of modern digital technology.",
        "Building blocks for AI and Software Engineering."
      ],
      script: "Welcome to your first lesson. Today, we dive into the world of computer science, exploring how algorithms and data structures form the backbone of our digital world.",
      imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
    }
  ];
  
  if (activity.type === 'text') {
    return (
      <div
        style={{
          padding: '15px',
          background: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '5px',
        }}
      >
        <h4>📝 {activity.title}</h4>
        <p style={{ color: '#666' }}>⏱️ {activity.time_minutes} minutes</p>
        {activity.content && <p>{activity.content}</p>}
        {activity.practice_problem && (
          <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '3px', marginTop: '10px' }}>
            <strong>Practice Problem:</strong> {activity.practice_problem}
          </div>
        )}
      </div>
    );
  }

  if (activity.type === 'image') {
    const imageAsset = activity.assets?.find(a => a.type === 'single_image');
    const imageUrl = imageAsset ? assetUrls[imageAsset.assetId] : null;

    return (
      <div
        style={{
          padding: '15px',
          background: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '5px',
        }}
      >
        <h4>🖼️ {activity.title}</h4>
        <p style={{ color: '#666' }}>⏱️ {activity.time_minutes} minutes</p>
        {activity.image_description && <p>{activity.image_description}</p>}
        
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={activity.title}
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              marginTop: '10px',
              borderRadius: '5px',
              objectFit: 'cover',
            }}
          />
        ) : (
          <p style={{ color: 'orange' }}>⏳ Image still generating...</p>
        )}
      </div>
    );
  }

if (activity.type === 'video') {
    return (
      <div style={{ padding: '15px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h4 style={{ marginBottom: '10px' }}>🎥 {activity.title}</h4>
        
        {/* Hardcode check: If the title matches your specific task, show the player */}
        {activity.title === "Watch Intro Video" ? (
          <div style={{ marginTop: '10px' }}>
            <PresentationPlayer segments={mockVideoSegments} />
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', background: '#eee', borderRadius: '10px' }}>
            <p style={{ color: '#666' }}>⏳ Video content for "{activity.title}" is still generating...</p>
          </div>
        )}
      </div>
    );
  }

  if (activity.type === 'quiz') {
    return (
      <div
        style={{
          padding: '15px',
          background: '#f0f8ff',
          border: '1px solid #0066cc',
          borderRadius: '5px',
        }}
      >
        <h4>✏️ {activity.title}</h4>
        <p style={{ color: '#666' }}>⏱️ {activity.time_minutes} minutes</p>

        {activity.quiz_check && activity.quiz_check.length > 0 ? (
          <div style={{ marginTop: '10px' }}>
            {activity.quiz_check.map((q, idx) => (
              <div key={idx} style={{ marginBottom: '15px', background: 'white', padding: '10px', borderRadius: '3px' }}>
                <strong>Q{idx + 1}: {q.question}</strong>
                <ul style={{ marginTop: '8px' }}>
                  {q.options.map((option, oidx) => (
                    <li
                      key={oidx}
                      style={{
                        padding: '5px',
                        background: option === q.answer ? '#d4edda' : 'transparent',
                        borderRadius: '3px',
                      }}
                    >
                      {option}
                      {option === q.answer && <span style={{ marginLeft: '10px', color: 'green' }}>✓ Correct</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p>Loading quiz...</p>
        )}
      </div>
    );
  }

  return null;
}
