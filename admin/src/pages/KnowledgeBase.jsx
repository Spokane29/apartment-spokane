import React, { useState, useEffect } from 'react';

export default function KnowledgeBase() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  async function fetchKnowledge() {
    try {
      const res = await fetch('/api/admin/knowledge');
      const data = await res.json();
      setContent(data.content || '');
    } catch (err) {
      console.error('Failed to fetch knowledge:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/admin/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      setMessage({ type: 'success', text: 'Saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Property Information</h2>
        <button
          className="btn btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={message.type} style={{ marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      <div className="card">
        <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          Enter all property information below. The AI assistant will use this to answer questions about the apartment.
          Include details about pricing, amenities, policies, neighborhood, move-in specials, etc.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Example:

PROPERTY DETAILS
- Address: 104 South Oak, Spokane WA 99201
- Unit size: 2 bedroom, 1 bath, 700 sqft
- Rent: $1,200/month
- Move-in Special: $400 off first month if you move in by Feb 1st

AMENITIES
- Hardwood floors throughout
- Backyard picnic area
- Laundry in building
- Pet friendly (cats and small dogs welcome)
- Reserved parking
- Storage space included

POLICIES
- Lease: 12-month minimum
- Security deposit: $1,200
- Pet deposit: $300
- No smoking

NEIGHBORHOOD
- Historic Spokane neighborhood
- 2 blocks to restaurants, coffee shops, and pubs
- Easy walk to downtown Spokane
- Bus stop on corner
- Minutes from Kendall Yards and I-90`}
          style={{
            width: '100%',
            minHeight: '500px',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            padding: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}
        />
      </div>
    </div>
  );
}
