import React, { useState, useEffect } from 'react';

export default function Settings() {
  const [config, setConfig] = useState({
    assistant_name: 'Sona',
    greeting_message: '',
    personality_rules: '',
    confirmation_template: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (data) {
        setConfig({
          assistant_name: data.assistant_name || 'Sona',
          greeting_message: data.greeting_message || '',
          personality_rules: data.personality_rules || '',
          confirmation_template: data.confirmation_template || "Got it, {name}! You're scheduled for {tour_date} at {tour_time}. Steve will reach out at {phone} to confirm. See you soon!",
        });
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>AI Settings</h2>
      </div>

      {message && <div className={message.type}>{message.text}</div>}

      <div className="card">
        <div className="form-group">
          <label>Assistant Name</label>
          <input
            type="text"
            value={config.assistant_name}
            onChange={(e) => setConfig({ ...config, assistant_name: e.target.value })}
            placeholder="Sona"
          />
          <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
            The name the AI assistant uses to introduce itself
          </small>
        </div>

        <div className="form-group">
          <label>Greeting Message</label>
          <textarea
            value={config.greeting_message}
            onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })}
            placeholder="Hi! I'm Sona, the virtual assistant for South Oak Apartments. How can I help you today?"
          />
          <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
            The first message visitors see when they open the chat
          </small>
        </div>

        <div className="form-group">
          <label>Personality Rules</label>
          <textarea
            value={config.personality_rules}
            onChange={(e) => setConfig({ ...config, personality_rules: e.target.value })}
            placeholder="Friendly and conversational. Answer questions directly. Ask one question at a time. Never be pushy."
            style={{ minHeight: '150px' }}
          />
          <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
            Guidelines for how the AI should communicate. These are included in the AI's system prompt.
          </small>
        </div>

        <div className="form-group">
          <label>Tour Confirmation Message</label>
          <textarea
            value={config.confirmation_template}
            onChange={(e) => setConfig({ ...config, confirmation_template: e.target.value })}
            placeholder="Thanks {name}! Here's what I have: Phone: {phone}, Email: {email}, Tour: {tour_date} at {tour_time}. You'll receive a confirmation shortly. See you then!"
            style={{ minHeight: '100px' }}
          />
          <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
            Message sent after collecting tour info. Use placeholders: {'{name}'}, {'{phone}'}, {'{email}'}, {'{tour_date}'}, {'{tour_time}'}
          </small>
        </div>

        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#1e293b' }}>Tips</h3>
        <ul style={{ paddingLeft: '20px', color: '#64748b', lineHeight: '1.8' }}>
          <li>Keep personality rules concise and actionable</li>
          <li>Test changes by opening the chat widget on your site</li>
          <li>The AI will always prioritize fair housing compliance</li>
          <li>Add property-specific info in the Knowledge Base, not here</li>
        </ul>
      </div>
    </div>
  );
}
