import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({ leads: 0, tours: 0, newLeads: 0 });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsRes, toursRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/schedule?upcoming=true'),
        ]);

        const leads = await leadsRes.json();
        const tours = await toursRes.json();

        const newLeads = leads.filter((l) => l.status === 'new').length;

        setStats({
          leads: leads.length,
          tours: tours.length,
          newLeads,
        });

        setRecentLeads(leads.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="stats-grid">
        <div className="card">
          <h3>Total Leads</h3>
          <div className="stat">{stats.leads}</div>
        </div>
        <div className="card">
          <h3>New Leads</h3>
          <div className="stat">{stats.newLeads}</div>
        </div>
        <div className="card">
          <h3>Upcoming Tours</h3>
          <div className="stat">{stats.tours}</div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Leads</h3>
        {recentLeads.length > 0 ? (
          <div className="table-container" style={{ boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Move-in</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.first_name} {lead.last_name}</td>
                    <td>{lead.phone}</td>
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
