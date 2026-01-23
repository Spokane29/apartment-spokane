import React, { useState, useEffect } from 'react';

export default function KnowledgeBase() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ category: '', title: '', content: '' });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch('/api/admin/knowledge');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch knowledge base:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(id) {
    try {
      await fetch(`/api/admin/knowledge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      setEditingId(null);
      setMessage({ type: 'success', text: 'Saved successfully' });
      fetchEntries();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save' });
    }
  }

  async function handleAdd() {
    if (!newEntry.category || !newEntry.title || !newEntry.content) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    try {
      await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      setShowAdd(false);
      setNewEntry({ category: '', title: '', content: '' });
      setMessage({ type: 'success', text: 'Entry added successfully' });
      fetchEntries();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add entry' });
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const categories = ['property', 'amenities', 'pricing', 'policies', 'neighborhood', 'faqs'];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Knowledge Base</h2>
        <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
          Add Entry
        </button>
      </div>

      {message && <div className={message.type}>{message.text}</div>}

      {showAdd && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Add New Entry</h3>
          <div className="form-group">
            <label>Category</label>
            <select
              value={newEntry.category}
              onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={newEntry.title}
              onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
              placeholder="e.g., Pet Policy"
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={newEntry.content}
              onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              placeholder="Enter the information..."
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn--primary" onClick={handleAdd}>
              Save Entry
            </button>
            <button className="btn btn--secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {entries.length > 0 ? (
        <div className="kb-list">
          {entries.map((entry) => (
            <div key={entry.id} className="kb-item">
              <span className="category">{entry.category}</span>
              <h4>{entry.title}</h4>

              {editingId === entry.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{ width: '100%', minHeight: '150px', marginTop: '12px' }}
                  />
                  <div className="actions">
                    <button className="btn btn--primary" onClick={() => handleSave(entry.id)}>
                      Save
                    </button>
                    <button
                      className="btn btn--secondary"
                      onClick={() => setEditingId(null)}
                      style={{ marginLeft: '10px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="content">{entry.content}</p>
                  <div className="actions">
                    <button
                      className="btn btn--secondary"
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditContent(entry.content);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No knowledge base entries yet.</p>
          <p style={{ marginTop: '10px' }}>Add property information for Sona to reference.</p>
        </div>
      )}
    </div>
  );
}
