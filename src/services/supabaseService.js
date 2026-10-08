import { supabase } from '../supabaseClient.js';
import { getThreeMonthsAgoISO } from '../utils/timeUtils.js';

/**
 * Supabase Service v1.0
 * Centralized data fetching and synchronization logic.
 */

export const fetchTasks = async (options = {}) => {
  const { startDate, endDate, limit = 2000 } = options;
  const effectiveStartDate = startDate || getThreeMonthsAgoISO(3);
  
  // Ưu tiên tải từ APEX_Task (giới hạn 3 tháng)
  try {
    let apexQuery = supabase
      .from('APEX_Task')
      .select('*')
      .order('created_at', { ascending: false });

    if (effectiveStartDate) apexQuery = apexQuery.gte('created_at', effectiveStartDate);
    if (endDate) apexQuery = apexQuery.lte('created_at', endDate);
    if (limit) apexQuery = apexQuery.limit(limit);

    const { data: apexData, error: apexErr } = await apexQuery;
    if (!apexErr && apexData && apexData.length > 0) return apexData;
  } catch (e) {
    console.warn('Fallback to NMK_Task in fetchTasks:', e);
  }

  let query = supabase
    .from('NMK_Task')
    .select('*')
    .order('created_at', { ascending: false });

  if (effectiveStartDate) query = query.gte('created_at', effectiveStartDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const updateApexTaskReview = async (taskId, reviewTime) => {
  if (!taskId) return;
  const { data, error } = await supabase
    .from('APEX_Task')
    .update({ review_comment: reviewTime })
    .eq('id', taskId);
  if (error) {
    console.error('Lỗi cập nhật review_comment trên APEX_Task:', error);
    throw error;
  }
  return data;
};

export const fetchPersonalSpaceData = async (userObj, limit = 50000) => {
  if (!userObj) return [];

  const threeMonthsAgoIso = getThreeMonthsAgoISO(3);

  // 1. Lấy thông tin phụ trợ từ APEX_Project và APEX_User để mapping tên
  let projectsMap = {};
  let usersMap = {};
  let userTeamMap = {};
  try {
    const [pRes, uRes] = await Promise.all([
      supabase.from('APEX_Project').select('id, name, key, color'),
      supabase.from('APEX_User').select('id, name, email, team')
    ]);

    if (pRes.data) {
      pRes.data.forEach(p => {
        const projectKey = (p.key && p.key.trim()) || (p.name && p.name.trim()) || 'UNASSIGNED';
        projectsMap[p.id] = projectKey;
        if (p.key) projectsMap[p.key.trim().toUpperCase()] = projectKey;
        if (p.name) projectsMap[p.name.trim().toUpperCase()] = projectKey;
      });
    }

    if (uRes.data) {
      uRes.data.forEach(u => {
        if (u.id) {
          usersMap[u.id] = u.name;
          usersMap[u.id.toLowerCase()] = u.name;
          userTeamMap[u.id] = u.team;
          userTeamMap[u.id.toLowerCase()] = u.team;
        }
        if (u.email) {
          usersMap[u.email.toLowerCase()] = u.name;
          userTeamMap[u.email.toLowerCase()] = u.team;
        }
        if (u.name) {
          userTeamMap[u.name.toLowerCase().trim()] = u.team;
        }
      });
    }
  } catch (err) {
    console.warn('Cảnh báo khi tải metadata APEX:', err);
  }

  // 2. Tải dữ liệu từ bảng APEX_Task theo từng chunk (giới hạn 3 tháng gần nhất)
  let allApexTasks = [];
  let from = 0;
  const chunkSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('APEX_Task')
      .select('*')
      .gte('created_at', threeMonthsAgoIso)
      .order('created_at', { ascending: false })
      .range(from, from + chunkSize - 1);

    if (error) {
      console.error('Lỗi khi fetch APEX_Task:', error.message);
      break;
    }

    if (data && data.length > 0) {
      allApexTasks = [...allApexTasks, ...data];
      from += chunkSize;
      if (data.length < chunkSize || allApexTasks.length >= limit) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  // Nếu đã có dữ liệu APEX_Task, map các trường cho view Personal
  if (allApexTasks.length > 0) {
    return allApexTasks.slice(0, limit).map(row => {
      const parts = (row.name || '').toString().split(':');
      // Lấy project_id từ task, tra qua bảng APEX_Project để lấy project key thay cho project name
      const mappedProject = (row.project_id && projectsMap[row.project_id])
        ? projectsMap[row.project_id]
        : (projectsMap[(parts[0] || '').toString().trim().toUpperCase()] || (parts[0] || '').toString().trim() || 'UNASSIGNED');
      const mappedUser = usersMap[row.assigned_to_id] || usersMap[row.assigned_to_id?.toLowerCase()] || (row.assigned_to_id ? row.assigned_to_id : 'UNKNOWN');
      const mappedCreator = usersMap[row.create_by_id] || (row.create_by ? (usersMap[row.create_by.toLowerCase()] || row.create_by.split('@')[0]) : 'UNKNOWN');
      const mappedTeam = userTeamMap[row.assigned_to_id] || userTeamMap[mappedUser?.toLowerCase()] || 'UNASSIGNED';

      return {
        ...row,
        project: mappedProject,
        _isApex: true,
        _projectName: mappedProject,
        _userName: mappedUser,
        _creatorName: mappedCreator,
        _team: mappedTeam
      };
    });
  }

  // Fallback nếu APEX_Task rỗng: lấy từ NMK_Task (giới hạn 3 tháng)
  const { data: fallbackData } = await supabase
    .from('NMK_Task')
    .select('*')
    .gte('created_at', threeMonthsAgoIso)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (fallbackData) {
    return fallbackData.map(row => {
      const parts = (row.name || '').toString().split(':');
      const mappedProject = (row.project_id && projectsMap[row.project_id])
        ? projectsMap[row.project_id]
        : (projectsMap[(parts[0] || '').toString().trim().toUpperCase()] || (parts[0] || '').toString().trim() || 'UNASSIGNED');
      return {
        ...row,
        project: mappedProject,
        _projectName: mappedProject
      };
    });
  }

  return [];
};

export const fetchOrgChartData = async () => {
  try {
    const { data, error } = await supabase
      .from('NMK_User')
      .select('id, email, full_name, position, is_assistant, level, manager_id, team_name, location, layout, offset_xy')
      .order('level');
      
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    console.warn('Fallback to APEX_User for OrgChart:', e);
  }

  // Fallback to APEX_User
  const { data: apexUsers, error: apexErr } = await supabase
    .from('APEX_User')
    .select('id, email, full_name, name, position, level, manager_id, team, location, layout')
    .order('level');

  if (apexErr) throw apexErr;
  return (apexUsers || []).map(u => ({
    ...u,
    full_name: u.full_name || u.name,
    team_name: u.team
  }));
};

export const updateUserOrgNode = async (userId, updates) => {
  const { error } = await supabase
    .from('NMK_User')
    .update(updates)
    .eq('id', userId);
  if (error) {
    // Also try updating APEX_User if layout or position changed
    await supabase.from('APEX_User').update(updates).eq('id', userId);
  }
};

export const fetchUsers = async (vietnamOnly = false) => {
  let query = supabase
    .from('APEX_User')
    .select('id, name, full_name, email, team, location')
    .order('name');
    
  if (vietnamOnly) {
    query = query.or('location.ilike.VIETNAM,location.ilike.VIET NAM');
  }
    
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchLeaveEntries = async (userName = null) => {
  const threeMonthsAgoIso = getThreeMonthsAgoISO(3);
  let query = supabase
    .from('NMK_Leave')
    .select('*')
    .gte('created_at', threeMonthsAgoIso)
    .order('date', { ascending: false });

  if (userName) {
    query = query.eq('user_name', userName);
  }

  const { data, error } = await query;
  if (!error && data && data.length > 0) return data;

  // Fallback to APEX_Leave and APEX_Leave_Span (3 months)
  try {
    const [leaveRes, spanRes] = await Promise.all([
      supabase.from('APEX_Leave').select('*').gte('created_at', threeMonthsAgoIso),
      supabase.from('APEX_Leave_Span').select('*').gte('start_at', threeMonthsAgoIso)
    ]);
    if (leaveRes.data && spanRes.data) {
      const leaveMap = {};
      leaveRes.data.forEach(l => { leaveMap[l.id] = l; });
      return spanRes.data.map(span => {
        const parent = leaveMap[span.leave_id] || {};
        return {
          id: span.id,
          create_by: parent.user_id,
          user_id: parent.user_id,
          start_at: span.start_at,
          end_at: span.end_at,
          date: span.start_at ? span.start_at.split('T')[0] : null,
          status: parent.status,
          reason: parent.reason,
          kind: parent.kind
        };
      });
    }
  } catch (e) {
    console.warn('Fallback to APEX_Leave error:', e);
  }

  return [];
};

export const fetchProjects = async () => {
  try {
    const { data: apexData } = await supabase
      .from('APEX_Project')
      .select('id, name, key, color')
      .order('key');
    if (apexData && apexData.length > 0) return apexData;
  } catch (e) {
    console.warn('Fallback to NMK_Project:', e);
  }

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
 * Fetch all temporary tasks for Weekly Planner
 */
export const fetchTemporaryTasks = async () => {
  const { data, error } = await supabase
    .from('NMK_Task_Temporary')
    .select('*')
    .order('created_at', { ascending: true });
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

// ============================================
// DRAWING REGISTER FUNCTIONS (NMK_DrawingRegister)
// ============================================

/**
 * Fetch Drawing Register data for a specific project
 * Data is stored as JSON string in the `attachments` text column.
 * @param {string} projectId - UUID of the project
 * @returns {object|null} Parsed register data or null
 */
export const fetchDrawingRegister = async (projectId) => {
  if (!projectId) return null;
  const { data, error } = await supabase
    .from('NMK_DrawingRegister')
    .select('id, project_id, attachments, created_at, updated_at')
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    console.error("Error fetching drawing register:", error);
    return null;
  }

  // Parse the JSON string stored in `attachments`
  if (data?.attachments) {
    try {
      return JSON.parse(data.attachments);
    } catch (e) {
      console.error("Error parsing attachments JSON:", e);
      return null;
    }
  }
  return null;
};

/**
 * Upsert Drawing Register data for a project.
 * Serializes registerData to JSON string and stores in `attachments`.
 * @param {string} projectId - UUID of the project
 * @param {object} registerData - The full register object to store
 */
export const upsertDrawingRegister = async (projectId, registerData) => {
  if (!projectId) throw new Error("Missing projectId");

  const attachmentsJson = JSON.stringify(registerData);

  const { data, error } = await supabase
    .from('NMK_DrawingRegister')
    .upsert(
      {
        id: projectId, // use project_id as the row id (PK)
        project_id: projectId,
        attachments: attachmentsJson,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// ISSUE FUNCTIONS (NMK_Issue)
// Stores links between drawing files (PDF/CAD) and their
// Google Drive URLs, keyed by project + sheet + revision.
// ============================================

/**
 * Fetch all Issue records for a given project.
 * Used to map download URLs onto the Drawing Register table.
 * @param {number} projectId - The project_id (bigint)
 * @returns {Array} Array of issue records
 */
export const fetchIssuesByProject = async (projectId) => {
  if (!projectId) return [];
  const { data, error } = await supabase
    .from('NMK_Issue')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching issues:", error);
    return [];
  }
  return data || [];
};

/**
 * Find issue records (pdf and/or dwg) for a specific sheet + revision.
 * Returns { pdf: record|null, dwg: record|null }
 */
export const findIssueUrl = (issueRecords, sheetNumber, revDate, revValue) => {
  if (!issueRecords || issueRecords.length === 0) return { pdf: null, dwg: null };
  const matches = issueRecords.filter(record =>
    record.sheet_number === sheetNumber &&
    record.rev_date     === revDate &&
    record.rev_value    === revValue
  );
  return {
    pdf: matches.find(r => r.type === 'pdf') || null,
    dwg: matches.find(r => r.type === 'dwg') || null,
  };
};

/**
 * Upsert a single Issue record keyed by (project_id, sheet_number, rev_value, type).
 * Prevents duplicate rows for the same file type on the same sheet+revision.
 * @param {object} issueData - { project_id, sheet_number, sheet_name, rev_date, rev_value, type, url }
 */
export const upsertIssue = async (issueData) => {
  // First try to find existing record
  const { data: existing } = await supabase
    .from('NMK_Issue')
    .select('id')
    .eq('project_id',   issueData.project_id)
    .eq('sheet_number', issueData.sheet_number)
    .eq('rev_value',    issueData.rev_value)
    .eq('type',         issueData.type)
    .maybeSingle();

  if (existing?.id) {
    // Update existing
    const { data, error } = await supabase
      .from('NMK_Issue')
      .update({
        url:        issueData.url,
        rev_date:   issueData.rev_date,
        sheet_name: issueData.sheet_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('NMK_Issue')
      .insert({
        ...issueData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
