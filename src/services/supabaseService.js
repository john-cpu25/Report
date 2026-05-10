
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

export const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('NMK_User')
    .select('id, name, email, team, location')
    .order('name');
    
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
