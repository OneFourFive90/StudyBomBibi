'use client';
import { useState } from 'react';

export default function TestPage() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!input) return;
    setLoading(true);
    setReply('');

    try {
      const res = await fetch('/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      if (data.reply) {
        setReply(data.reply);
      } else {
        setReply('Error: ' + data.error);
      }
    } catch (error) {
      setReply('Failed to contact server.');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🤖 AI Connection Test</h1>
      
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask Gemini something (e.g., 'Plan a 1-day study schedule for Java')"
        style={{ width: '100%', height: '100px', padding: '10px', marginBottom: '10px' }}
      />
      
      <button 
        onClick={askAI} 
        disabled={loading}
        style={{ padding: '10px 20px', cursor: 'pointer', background: 'black', color: 'white', border: 'none' }}
      >
        {loading ? 'Asking Gemini...' : 'Send to AI'}
      </button>

      {reply && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '5px' }}>
          <strong>Gemini Answer:</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{reply}</p>
        </div>
      )}
    </div>
  );
}