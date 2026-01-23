const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Lead operations
async function createLead(leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateLead(id, updates) {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getLeads(filters = {}) {
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getLeadById(id) {
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

// Tour operations
async function scheduleTour(tourData) {
  const { data, error } = await supabase.from('scheduled_tours').insert([tourData]).select().single();

  if (error) throw error;
  return data;
}

async function getTours(filters = {}) {
  let query = supabase
    .from('scheduled_tours')
    .select('*, leads(first_name, last_name, phone, email)')
    .order('tour_date', { ascending: true });

  if (filters.upcoming) {
    query = query.gte('tour_date', new Date().toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Knowledge base operations
async function getKnowledgeBase() {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw error;
  return data;
}

async function updateKnowledgeBase(id, content) {
  const { data, error } = await supabase
    .from('knowledge_base')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createKnowledgeEntry(entry) {
  const { data, error } = await supabase.from('knowledge_base').insert([entry]).select().single();

  if (error) throw error;
  return data;
}

// AI config operations
async function getAIConfig() {
  const { data, error } = await supabase.from('ai_config').select('*').single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function updateAIConfig(updates) {
  const { data, error } = await supabase
    .from('ai_config')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', (await getAIConfig()).id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  supabase,
  createLead,
  updateLead,
  getLeads,
  getLeadById,
  scheduleTour,
  getTours,
  getKnowledgeBase,
  updateKnowledgeBase,
  createKnowledgeEntry,
  getAIConfig,
  updateAIConfig,
};
