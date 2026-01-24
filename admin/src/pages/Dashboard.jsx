import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [days, setDays] = useState(1);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalLeads: 0,
    toursBooked: 0,
    leadConversionRate: '0%',
    tourConversionRate: '0%',
    avgMessagesPerSession: 0
  });
  const [visitors, setVisitors] = useState({ totalViews: 0, uniqueVisitors: 0 });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [days]);

  async function fetchData() {
    setLoading(true);
    try {
      const [analyticsRes, leadsRes] = await Promise.all([
        fetch(`/api/admin/analytics?days=${days}`),
        fetch(`/api/leads?days=${days}`),
      ]);

      const analytics = await analyticsRes.json();
      const leads = await leadsRes.json();

      setStats(analytics.summary || {
        totalSessions: 0,
        totalLeads: 0,
        toursBooked: 0,
        leadConversionRate: '0%',
        tourConversionRate: '0%',
        avgMessagesPerSession: 0
      });

      setRecentLeads(leads.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`btn ${days === d ? 'btn--primary' : 'btn--secondary'}`}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              {d === 1 ? 'Today' : `${d} Days`}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
        <div className="card">
          <h3>Chat Sessions</h3>
          <div className="stat">{stats.totalSessions}</div>
        </div>
        <div className="card">
          <h3>Leads Captured</h3>
          <div className="stat">{stats.totalLeads}</div>
        </div>
        <div className="card">
          <h3>Tours Booked</h3>
          <div className="stat">{stats.toursBooked}</div>
        </div>
        <div className="card">
          <h3>Lead Rate</h3>
          <div className="stat">{stats.leadConversionRate}</div>
        </div>
        <div className="card">
          <h3>Tour Rate</h3>
          <div className="stat">{stats.tourConversionRate}</div>
        </div>
        <div className="card">
          <h3>Avg Messages</h3>
          <div className="stat">{stats.avgMessagesPerSession}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Recent Leads</h3>
        {recentLeads.length > 0 ? (
          <div className="table-container" style={{ boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Tour Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.first_name} {lead.last_name}</strong>
                      <br />
                      <small style={{ color: '#64748b' }}>
                        {new Date(lead.created_at).toLocaleString()}
                      </small>
                    </td>
                    <td>{lead.phone}</td>
                    <td>{lead.email || '-'}</td>
                    <td>{lead.move_in_date || '-'}</td>
                    <td>
                      <span className={`badge badge--${lead.status}`}>{lead.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No leads yet</div>
        )}
      </div>
    </div>
  );
}
