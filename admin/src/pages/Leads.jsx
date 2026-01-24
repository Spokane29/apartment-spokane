import React, { useState, useEffect } from 'react';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchLeads();
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  }

  async function deleteLead(id) {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
      fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Leads</h2>
      </div>

      {leads.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Move-in</th>
                <th>Source</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.first_name} {lead.last_name}</strong>
                    <br />
                    <small style={{ color: '#64748b' }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </small>
                  </td>
                  <td>{lead.phone}</td>
                  <td>{lead.email || '-'}</td>
                  <td>{lead.move_in_date || '-'}</td>
                  <td>{lead.source}</td>
                  <td>
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="toured">Toured</option>
                      <option value="applied">Applied</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn--secondary"
                        onClick={() => setSelectedLead(lead)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        View
                      </button>
                      <button
                        className="btn"
                        onClick={() => deleteLead(lead.id)}
                        style={{ padding: '6px 12px', fontSize: '12px', background: '#ef4444', color: 'white', border: 'none' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No leads yet</div>
      )}

      {selectedLead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>
              {selectedLead.first_name} {selectedLead.last_name}
            </h3>
            <p><strong>Phone:</strong> {selectedLead.phone}</p>
            <p><strong>Email:</strong> {selectedLead.email || '-'}</p>
            <p><strong>Move-in:</strong> {selectedLead.move_in_date || '-'}</p>
            <p><strong>Property:</strong> {selectedLead.property_interest}</p>
            <p><strong>Message:</strong> {selectedLead.message || '-'}</p>

            {selectedLead.chat_transcript && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '12px' }}>Chat Transcript</h4>
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '16px',
                    borderRadius: '8px',
                    maxHeight: '300px',
                    overflow: 'auto',
                  }}
                >
                  {selectedLead.chat_transcript.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: '12px',
                        padding: '8px 12px',
                        background: msg.role === 'user' ? '#e2e8f0' : 'white',
                        borderRadius: '8px',
                      }}
                    >
                      <small style={{ color: '#64748b' }}>
                        {msg.role === 'user' ? 'Visitor' : 'Sona'}
                      </small>
                      <p style={{ margin: '4px 0 0' }}>{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="btn btn--secondary" onClick={() => setSelectedLead(null)}>
                Close
              </button>
              <button
                className="btn"
                onClick={() => { deleteLead(selectedLead.id); setSelectedLead(null); }}
                style={{ background: '#ef4444', color: 'white', border: 'none' }}
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
