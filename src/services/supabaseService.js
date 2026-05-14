
import { supabase } from '../supabaseClient';

/**
 * Supabase Service v1.0
 * Centralized data fetching and synchronization logic.
 */

export const fetchTasks = async (options = {}) => {
  const { startDate, endDate, limit = 2000 } = options;
  
  let query = supabase
    .from('NMK_Task')
    .select('*')
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchPersonalSpaceData = async (userObj, limit = 1000) => {
  if (!userObj) return [];
  const { id, name, email, username, isAdmin, isLeader, team } = userObj;
  
  let query = supabase
    .from('NMK_Task')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (isAdmin) {
    // Admin sees everything
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  if (isLeader && team) {
    // Leader sees their team's tasks
    // First, find all users in this team
    const { data: teamUsers } = await supabase
      .from('NMK_User')
      .select('id, name, email')
      .ilike('team', `%${team.split(' ')[0]}%`); // Flexible matching for team name

    const teamIdentifiers = [];
    teamUsers?.forEach(u => {
      if (u.id) teamIdentifiers.push(u.id);
      if (u.name) teamIdentifiers.push(u.name);
      if (u.email) teamIdentifiers.push(u.email);
    });

    if (teamIdentifiers.length > 0) {
      const filter = teamIdentifiers.map(val => `user_id.eq."${val}",create_by.eq."${val}"`).join(',');
      const { data, error } = await query.or(filter);
      if (error) throw error;
      return data || [];
    }
  }

  // Default: User sees only their own tasks
  const identifiers = [id, name, email, username].filter(Boolean);
  if (identifiers.length === 0) return [];
  const filter = identifiers.map(val => `user_id.eq."${val}",create_by.eq."${val}"`).join(',');
  
  const { data, error } = await query.or(filter);
  if (error) throw error;
  return data || [];
};

export const fetchUsers = async (vietnamOnly = false) => {
  let query = supabase
    .from('NMK_User')
    .select('id, name, email, team, location')
    .order('name');
    
  if (vietnamOnly) {
    query = query.ilike('location', 'VIETNAM');
  }
    
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchLeaveEntries = async (userName = null) => {
  let query = supabase
    .from('NMK_Leave')
    .select('*')
    .order('date', { ascending: false });

  if (userName) {
    query = query.eq('user_name', userName);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchProjects = async () => {
  const { data, error } = await supabase
    .from('NMK_Project')
    .select('id, name, key')
    .order('key');
    
  if (error) throw error;
  return data || [];
};

/**
 * Realtime Subscription Handler
 */
export const subscribeToTasks = (callback) => {
  return supabase
    .channel('public:NMK_Task')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'NMK_Task' }, payload => {
      callback(payload);
    })
    .subscribe();
};

/**
 * Offline Sync Wrapper
 * (Basic implementation: uses localStorage as fallback)
 */
export const getCachedData = (key) => {
  const cached = localStorage.getItem(`supabase_cache_${key}`);
  return cached ? JSON.parse(cached) : null;
};

export const setCachedData = (key, data) => {
  localStorage.setItem(`supabase_cache_${key}`, JSON.stringify(data));
};
