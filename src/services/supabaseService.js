
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

export const fetchPersonalSpaceData = async (userObj, limit = 50000) => {
  if (!userObj) return [];
  const { id, name, email, username, isAdmin, isLeader, team } = userObj;
  
  let filterStr = null;

  if (!isAdmin) {
    if (team) {
      // Team members see their entire team's tasks
      // First, find all users in this team to get their identifiers
      const teamSlug = team.split(' ')[0]; // Use first word for broader matching if needed
      const { data: teamUsers } = await supabase
        .from('NMK_User')
        .select('id, name, email')
        .ilike('team', `%${teamSlug}%`);

      const teamIdentifiers = [];
      teamUsers?.forEach(u => {
        if (u.id) teamIdentifiers.push(u.id);
        if (u.name) teamIdentifiers.push(u.name);
        if (u.email) teamIdentifiers.push(u.email);
      });

      if (teamIdentifiers.length > 0) {
        // Filter by any of the team member identifiers in user_id or create_by
        filterStr = teamIdentifiers.map(val => `user_id.eq."${val}",create_by.eq."${val}"`).join(',');
      } else {
        // Fallback to own tasks if team lookup fails
        const identifiers = [id, name, email, username].filter(Boolean);
        filterStr = identifiers.map(val => `user_id.eq."${val}",create_by.eq."${val}"`).join(',');
      }
    } else {
      // Default: User without team sees only their own tasks
      const identifiers = [id, name, email, username].filter(Boolean);
      if (identifiers.length === 0) return [];
      filterStr = identifiers.map(val => `user_id.eq."${val}",create_by.eq."${val}"`).join(',');
    }
  }

  let allData = [];
  let from = 0;
  let chunkSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('NMK_Task')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + chunkSize - 1);
      
    if (filterStr) {
      query = query.or(filterStr);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += chunkSize;
      // If we got fewer rows than requested, we've hit the end of the table
      if (data.length < chunkSize || allData.length >= limit) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allData.slice(0, limit);
};

export const fetchOrgChartData = async () => {
  const { data, error } = await supabase
    .from('NMK_User')
    .select('id, email, full_name, position, is_assistant, level, manager_id, team_name, location, layout, offset_xy')
    .order('level');
    
  if (error) throw error;
  return data || [];
};

export const updateUserOrgNode = async (userId, updates) => {
  const { error } = await supabase
    .from('NMK_User')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
};

export const fetchUsers = async (vietnamOnly = false) => {
  let query = supabase
    .from('NMK_User')
    .select('id, name, email, team, location')
    .order('name');
    
  if (vietnamOnly) {
    query = query.or('location.ilike.VIETNAM,location.ilike.VIET NAM');
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

// ============================================
// LIBRARY FUNCTIONS
// ============================================

/**
 * Fetch all Library Rooms
 * Returns rooms sorted by division order: STR → PT → MTO → ARCH
 */
export const fetchLibraryRooms = async () => {
  const divisionOrder = ['STR', 'PT', 'MTO', 'ARCH'];
  const { data, error } = await supabase
    .from('NMK_Library_Room')
    .select('*');
  if (error) throw error;
  // Sort by predefined division order
  return (data || []).sort((a, b) => 
    divisionOrder.indexOf(a.division) - divisionOrder.indexOf(b.division)
  );
};

/**
 * Fetch workflows for a specific room
 */
export const fetchLibraryWorkflows = async (roomId) => {
  const { data, error } = await supabase
    .from('NMK_Library_Workflow')
    .select('*')
    .eq('room_id', roomId);
  if (error) throw error;
  return data || [];
};

/**
 * Fetch spreads for a specific workflow
 */
export const fetchLibrarySpreads = async (workflowId) => {
  const { data, error } = await supabase
    .from('NMK_Library_Spread')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('spread_index');
  if (error) throw error;
  return data || [];
};

/**
 * Fetch ALL library data in one shot (preload)
 * Returns: { rooms, workflows, spreads } nested
 */
export const fetchFullLibrary = async () => {
  const divisionOrder = ['STR', 'PT', 'MTO', 'ARCH'];
  
  const [roomsRes, workflowsRes, spreadsRes] = await Promise.all([
    supabase.from('NMK_Library_Room').select('*'),
    supabase.from('NMK_Library_Workflow').select('*'),
    supabase.from('NMK_Library_Spread').select('*').order('spread_index')
  ]);

  if (roomsRes.error) throw roomsRes.error;
  if (workflowsRes.error) throw workflowsRes.error;
  if (spreadsRes.error) throw spreadsRes.error;

  const rooms = (roomsRes.data || []).sort((a, b) =>
    divisionOrder.indexOf(a.division) - divisionOrder.indexOf(b.division)
  );
  const workflows = workflowsRes.data || [];
  const spreads = spreadsRes.data || [];

  // Nest: room → workflows → spreads
  return rooms.map(room => ({
    ...room,
    workflows: workflows
      .filter(w => w.room_id === room.id)
      .map(w => ({
        ...w,
        spreads: spreads
          .filter(s => s.workflow_id === w.id)
          .sort((a, b) => a.spread_index - b.spread_index)
          .map(s => ({
            spreadId: s.id,
            left: s.left_page,
            right: s.right_page
          }))
      }))
  }));
};

/**
 * Seed local hardcoded Library data into Supabase
 * @param {Object} defaultRooms - The hardcoded rooms object from defaultLibraryRooms.js
 * @param {Object} iconMap - Map of icon name strings to Lucide components (for reverse lookup)
 */
export const seedLibraryToSupabase = async (defaultRooms, iconMap = {}) => {
  // Build reverse icon map: Component → string name
  const reverseIcon = new Map();
  Object.entries(iconMap).forEach(([name, component]) => {
    reverseIcon.set(component, name);
  });
  const toIconName = (icon) => {
    if (typeof icon === 'string') return icon;
    return reverseIcon.get(icon) || 'HelpCircle';
  };

  // Division key mapping
  const divisionMap = { str: 'STR', pt: 'PT', mto: 'MTO', arch: 'ARCH' };

  // Process page JSONB: convert step icon components to string names
  const processPage = (page) => {
    if (!page) return null;
    const p = { ...page };
    if (p.steps) {
      p.steps = p.steps.map(s => ({
        ...s,
        icon: toIconName(s.icon)
      }));
    }
    return p;
  };

  console.log('[SEED] Starting library seed to Supabase...');

  for (const [roomKey, room] of Object.entries(defaultRooms)) {
    const division = divisionMap[roomKey] || roomKey.toUpperCase();

    // 1. Insert Room
    const { data: roomData, error: roomErr } = await supabase
      .from('NMK_Library_Room')
      .upsert({
        division,
        title: room.title,
        icon: toIconName(room.icon),
        color: room.color
      }, { onConflict: 'division,title' })
      .select()
      .single();

    if (roomErr) {
      console.error(`[SEED] Room "${room.title}" error:`, roomErr);
      continue;
    }
    console.log(`[SEED] Room "${room.title}" → ${roomData.id}`);

    // 2. Insert Workflows
    for (const wf of Object.values(room.workflows)) {
      const { data: wfData, error: wfErr } = await supabase
        .from('NMK_Library_Workflow')
        .insert({
          room_id: roomData.id,
          title: wf.title,
          color: wf.color
        })
        .select()
        .single();

      if (wfErr) {
        console.error(`[SEED] Workflow "${wf.title}" error:`, wfErr);
        continue;
      }
      console.log(`[SEED]   Workflow "${wf.title}" → ${wfData.id}`);

      // 3. Insert Spreads
      if (wf.spreads && wf.spreads.length > 0) {
        const spreadRows = wf.spreads.map((spread, idx) => ({
          workflow_id: wfData.id,
          spread_index: idx,
          left_page: processPage(spread.left),
          right_page: processPage(spread.right)
        }));

        const { error: spreadErr } = await supabase
          .from('NMK_Library_Spread')
          .insert(spreadRows);

        if (spreadErr) {
          console.error(`[SEED]   Spreads error:`, spreadErr);
        } else {
          console.log(`[SEED]   ${spreadRows.length} spreads inserted`);
        }
      }
    }
  }

  console.log('[SEED] Library seed complete!');
};

// ============================================
// LIBRARY UPDATE FUNCTIONS (Admin only)
// ============================================

/**
 * Update a spread's left_page or right_page JSONB
 */
export const updateLibrarySpread = async (spreadId, updates) => {
  const { data, error } = await supabase
    .from('NMK_Library_Spread')
    .update(updates)
    .eq('id', spreadId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Create a new spread in Supabase
 */
export const createLibrarySpread = async (workflowId, spreadIndex, leftPage, rightPage) => {
  const { data, error } = await supabase
    .from('NMK_Library_Spread')
    .insert({
      workflow_id: workflowId,
      spread_index: spreadIndex,
      left_page: leftPage,
      right_page: rightPage
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Delete a spread and re-order remaining spreads of the workflow
 */
export const deleteAndReorderSpreads = async (spreadId, workflowId) => {
  // 1. Delete the spread
  const { error: delErr } = await supabase
    .from('NMK_Library_Spread')
    .delete()
    .eq('id', spreadId);
  if (delErr) throw delErr;

  // 2. Fetch remaining spreads for this workflow
  const { data: spreads, error: fetchErr } = await supabase
    .from('NMK_Library_Spread')
    .select('id, spread_index')
    .eq('workflow_id', workflowId)
    .order('spread_index');
  if (fetchErr) throw fetchErr;

  // 3. Update their indexes to be sequential
  const updates = spreads.map((s, idx) => {
    return supabase
      .from('NMK_Library_Spread')
      .update({ spread_index: idx })
      .eq('id', s.id);
  });

  await Promise.all(updates);
};

/**
 * Update a workflow (title, color)
 */
export const updateLibraryWorkflow = async (workflowId, updates) => {
  const { data, error } = await supabase
    .from('NMK_Library_Workflow')
    .update(updates)
    .eq('id', workflowId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Update a room (title, icon, color)
 */
export const updateLibraryRoom = async (roomId, updates) => {
  const { data, error } = await supabase
    .from('NMK_Library_Room')
    .update(updates)
    .eq('id', roomId)
    .select()
    .single();
  if (error) throw error;
  return data;
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
