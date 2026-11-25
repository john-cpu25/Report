import { supabase } from '../supabaseClient.js';
import {
  getFreshTrackerSeed,
  normalizeTeamId,
  getSeedForTeam,
  LEGACY_PROJECT_ID_TO_APEX_UUID
} from '../data/drawingTrackerSeed.js';

const LOCAL_STORAGE_KEY_PREFIX = 'apex-drawing-tracker-v2';
const KV_TABLE = 'APEX_App_Setting';

export const getTeamKVKeys = (team = 'MODELLING') => {
  const norm = normalizeTeamId(team);
  const safe = norm.replace(/[^a-zA-Z0-9_]/g, '_');
  return {
    team: norm,
    safeTeam: safe,
    zones: `dt_zones_${safe}`,
    issues: `dt_issues_${safe}`,
    plans: `dt_plans_${safe}`
  };
};

export const TRACKER_TABLES = {
  zones: 'APEX_Tracker_Zone',
  issues: 'APEX_Tracker_Issue',
  plans: 'APEX_Tracker_Plan'
};

const COLS = {
  zones: ['id', 'project_id', 'level', 'zone', 'sort'],
  issues: ['id', 'zone_id', 'date', 'link', 'note', 'created_at'],
  plans: ['id', 'zone_id', 'date', 'note', 'created_at']
};

let activeChannel = null;
let storageBackend = 'kv'; // 'relational' | 'kv'

const remapProjectId = (pid) => LEGACY_PROJECT_ID_TO_APEX_UUID[pid] || pid;

const getLocalStorageKey = (team = 'MODELLING') => {
  const norm = normalizeTeamId(team);
  return `${LOCAL_STORAGE_KEY_PREFIX}_${norm.replace(/[^a-zA-Z0-9_]/g, '_')}`;
};

export const normalizeRecord = (key, row) => {
  const cols = COLS[key];
  const out = {};
  cols.forEach((c) => {
    if (c === 'project_id') {
      out[c] = remapProjectId(row[c]);
    } else if (c === 'sort' || c === 'created_at') {
      out[c] = Number(row[c] ?? 0);
    } else if (c === 'zone' || c === 'link' || c === 'note') {
      out[c] = String(row[c] ?? '');
    } else {
      out[c] = row[c] ?? null;
    }
  });
  return out;
};

export const takeSnapshot = (data) => {
  const snap = {};
  Object.keys(TRACKER_TABLES).forEach((k) => {
    const map = new Map();
    (data[k] || []).forEach((r) => {
      map.set(r.id, JSON.stringify(normalizeRecord(k, r)));
    });
    snap[k] = map;
  });
  return snap;
};

export const saveLocalBackup = (data, team = 'MODELLING') => {
  const norm = normalizeTeamId(team);
  try {
    const key = getLocalStorageKey(norm);
    localStorage.setItem(key, JSON.stringify(data));
    if (norm === 'MODELLING') {
      localStorage.setItem('apex-drawing-tracker-v2', JSON.stringify(data));
    }
  } catch (err) {
    console.warn('[DrawingTracker] LocalStorage backup skipped:', err);
  }
};

export const loadLocalBackup = (team = 'MODELLING') => {
  const norm = normalizeTeamId(team);
  try {
    const key = getLocalStorageKey(norm);
    let raw = localStorage.getItem(key);
    if (!raw && norm === 'MODELLING') {
      raw = localStorage.getItem('apex-drawing-tracker-v2');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.zones) && parsed.zones.length > 0 && Array.isArray(parsed.issues)) {
        parsed.projects = Array.isArray(parsed.projects) ? parsed.projects : getFreshTrackerSeed(norm).projects;
        parsed.zones = parsed.zones.map((z) => ({ ...z, project_id: remapProjectId(z.project_id) }));
        parsed.plans = Array.isArray(parsed.plans) ? parsed.plans : [];
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[DrawingTracker] Invalid LocalStorage backup, using seed:', err);
  }
  const fresh = getFreshTrackerSeed(norm);
  saveLocalBackup(fresh, norm);
  return fresh;
};

/**
 * Đọc trực tiếp toàn bộ PROJECT CODE (`key`) từ bảng `APEX_Project` trên Supabase
 */
export async function fetchApexProjectsList() {
  const { data, error } = await supabase
    .from('APEX_Project')
    .select('id, key, name, color');

  if (error) throw error;

  return (data || [])
    .map((ap) => {
      const code = String(ap.key || ap.name || 'UNASSIGNED').trim().toUpperCase();
      return {
        id: ap.id,
        name: code, // Hiển thị PROJECT CODE trực tiếp
        full_name: String(ap.name || code).trim(),
        apex_project_id: ap.id,
        color: ap.color || null
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function fetchAllRelationalRows(key) {
  const table = TRACKER_TABLES[key];
  const selectCols = COLS[key].join(',');
  let out = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectCols)
      .range(from, from + 999);

    if (error) throw error;
    out = out.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function pushToRelational(projects, dataset) {
  // Đảm bảo khóa ngoại trên APEX_Tracker_Project nếu dùng bảng quan hệ
  const projRows = projects.map((p) => ({
    id: p.id,
    name: p.name,
    apex_project_id: p.id,
    color: p.color || null
  }));
  for (let i = 0; i < projRows.length; i += 400) {
    await supabase.from('APEX_Tracker_Project').upsert(projRows.slice(i, i + 400));
  }

  for (const key of ['zones', 'issues', 'plans']) {
    const table = TRACKER_TABLES[key];
    const rows = (dataset[key] || []).map((r) => normalizeRecord(key, r));
    for (let i = 0; i < rows.length; i += 400) {
      const chunk = rows.slice(i, i + 400);
      if (chunk.length > 0) {
        const { error } = await supabase.from(table).upsert(chunk);
        if (error) throw error;
      }
    }
  }
}

async function loadFromSupabaseKV(team = 'MODELLING') {
  const norm = normalizeTeamId(team);
  const kvKeys = getTeamKVKeys(norm);

  const queryKeys = [
    kvKeys.zones, kvKeys.issues, kvKeys.plans,
    `dt_zones_${norm}`, `dt_issues_${norm}`, `dt_plans_${norm}`
  ];
  if (norm === 'MODELLING') {
    queryKeys.push('dt_zones', 'dt_issues', 'dt_plans');
  }

  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('key, value')
    .in('key', queryKeys);

  if (error) throw error;

  const byKey = {};
  (data || []).forEach((row) => {
    try {
      byKey[row.key] = JSON.parse(row.value || '[]');
    } catch {
      byKey[row.key] = [];
    }
  });

  let rawZones = byKey[kvKeys.zones] || byKey[`dt_zones_${norm}`];
  let rawIssues = byKey[kvKeys.issues] || byKey[`dt_issues_${norm}`];
  let rawPlans = byKey[kvKeys.plans] || byKey[`dt_plans_${norm}`];

  // For MODELLING: fallback to legacy keys if team keys don't exist yet
  if (norm === 'MODELLING' && (!Array.isArray(rawZones) || rawZones.length === 0)) {
    rawZones = byKey['dt_zones'];
    rawIssues = byKey['dt_issues'];
    rawPlans = byKey['dt_plans'];
  }

  const hasCloudZones = Array.isArray(rawZones) && rawZones.length > 0;

  if (!hasCloudZones) {
    const initial = getFreshTrackerSeed(norm);
    await saveToSupabaseKV(initial, norm);
    return {
      zones: initial.zones,
      issues: initial.issues,
      plans: initial.plans
    };
  }

  // Tự động nâng cấp các project_id cũ ('p1'..'p11') sang UUID chuẩn của APEX_Project
  let needsRemapSave = false;
  const zones = (rawZones || []).map((z) => {
    const mapped = remapProjectId(z.project_id);
    if (mapped !== z.project_id) needsRemapSave = true;
    return { ...z, project_id: mapped };
  });

  const result = {
    zones,
    issues: rawIssues || [],
    plans: rawPlans || []
  };

  if (needsRemapSave) {
    await saveToSupabaseKV(result, norm);
  }

  return result;
}

async function saveToSupabaseKV(dataset, team = 'MODELLING') {
  const norm = normalizeTeamId(team);
  const kvKeys = getTeamKVKeys(norm);

  const normalized = {
    zones: (dataset.zones || []).map((r) => normalizeRecord('zones', r)),
    issues: (dataset.issues || []).map((r) => normalizeRecord('issues', r)),
    plans: (dataset.plans || []).map((r) => normalizeRecord('plans', r))
  };

  const rows = [
    { key: kvKeys.zones, value: JSON.stringify(normalized.zones) },
    { key: kvKeys.issues, value: JSON.stringify(normalized.issues) },
    { key: kvKeys.plans, value: JSON.stringify(normalized.plans) }
  ];

  if (norm !== kvKeys.safeTeam) {
    rows.push(
      { key: `dt_zones_${norm}`, value: JSON.stringify(normalized.zones) },
      { key: `dt_issues_${norm}`, value: JSON.stringify(normalized.issues) },
      { key: `dt_plans_${norm}`, value: JSON.stringify(normalized.plans) }
    );
  }

  // Nếu là team MODELLING thì đồng bộ cả key legacy dt_zones, dt_issues, dt_plans để tương thích
  if (norm === 'MODELLING') {
    rows.push(
      { key: 'dt_zones', value: JSON.stringify(normalized.zones) },
      { key: 'dt_issues', value: JSON.stringify(normalized.issues) },
      { key: 'dt_plans', value: JSON.stringify(normalized.plans) }
    );
  }

  const { error } = await supabase.from(KV_TABLE).upsert(rows, { onConflict: 'key' });
  if (error) throw error;

  if (activeChannel) {
    activeChannel.send({
      type: 'broadcast',
      event: 'tracker-updated',
      payload: { team: norm, ts: Date.now() }
    });
  }
}

export async function loadTrackerData(team = 'MODELLING') {
  const norm = normalizeTeamId(team);
  try {
    // 1. Luôn lấy danh sách PROJECT CODE chuẩn từ bảng APEX_Project trên Supabase
    const projects = await fetchApexProjectsList();

    // 2. Đọc từ kho KV trên Supabase theo team
    try {
      storageBackend = 'kv';
      const kvData = await loadFromSupabaseKV(norm);
      const full = { projects, ...kvData };
      saveLocalBackup(full, norm);
      return { data: full, mode: 'supabase', team: norm, error: null };
    } catch (kvErr) {
      console.warn(`[DrawingTracker] Supabase KV read error for team ${norm}:`, kvErr);
      const fallback = loadLocalBackup(norm);
      return { data: fallback, mode: 'local', team: norm, error: kvErr };
    }
  } catch (err) {
    const fallback = loadLocalBackup(norm);
    return { data: fallback, mode: 'local', team: norm, error: err };
  }
}

export async function syncTrackerChanges(prevSnap, currentData, team = 'MODELLING') {
  const norm = normalizeTeamId(team);
  saveLocalBackup(currentData, norm);

  if (storageBackend === 'kv') {
    await saveToSupabaseKV(currentData, norm);
    return takeSnapshot(currentData);
  }

  const ups = {};
  const dels = {};

  Object.keys(TRACKER_TABLES).forEach((k) => {
    const oldMap = prevSnap?.[k] || new Map();
    const seen = new Set();
    ups[k] = [];

    (currentData[k] || []).forEach((r) => {
      const normalized = normalizeRecord(k, r);
      const serialized = JSON.stringify(normalized);
      seen.add(r.id);
      if (oldMap.get(r.id) !== serialized) {
        ups[k].push(normalized);
      }
    });

    dels[k] = [...oldMap.keys()].filter((id) => !seen.has(id));
  });

  const deleteChunks = async (key) => {
    const ids = dels[key];
    const table = TRACKER_TABLES[key];
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from(table).delete().in('id', ids.slice(i, i + 200));
      if (error) throw error;
    }
  };

  const upsertChunks = async (key) => {
    const rows = ups[key];
    const table = TRACKER_TABLES[key];
    for (let i = 0; i < rows.length; i += 400) {
      const { error } = await supabase.from(table).upsert(rows.slice(i, i + 400));
      if (error) throw error;
    }
  };

  // Đảm bảo Project cha tồn tại trên APEX_Tracker_Project trước khi upsert Zone
  if (ups.zones.length > 0) {
    const usedProjIds = new Set(ups.zones.map((z) => z.project_id));
    const projToSync = (currentData.projects || [])
      .filter((p) => usedProjIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        apex_project_id: p.id,
        color: p.color || null
      }));
    if (projToSync.length > 0) {
      await supabase.from('APEX_Tracker_Project').upsert(projToSync);
    }
  }

  await deleteChunks('issues');
  await deleteChunks('plans');
  await upsertChunks('zones');
  await upsertChunks('issues');
  await upsertChunks('plans');
  await deleteChunks('zones');

  if (activeChannel) {
    activeChannel.send({
      type: 'broadcast',
      event: 'tracker-updated',
      payload: { team: norm, ts: Date.now() }
    });
  }

  return takeSnapshot(currentData);
}

export function subscribeTrackerRealtime(onRemoteChange) {
  let debounceTimer = null;
  const trigger = (payload) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onRemoteChange?.(payload);
    }, 600);
  };

  const channel = supabase.channel('apex-drawing-tracker-realtime', {
    config: { broadcast: { self: false } }
  });

  channel.on('broadcast', { event: 'tracker-updated' }, (msg) => trigger(msg?.payload));

  // Lắng nghe cả APEX_Project (khi thêm/đổi PROJECT CODE) và kho lưu trữ Tracker
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'APEX_Project' },
    () => trigger()
  );

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: KV_TABLE },
    () => trigger()
  );

  Object.values(TRACKER_TABLES).forEach((table) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => trigger()
    );
  });

  channel.subscribe();
  activeChannel = channel;

  return () => {
    clearTimeout(debounceTimer);
    if (activeChannel === channel) activeChannel = null;
    supabase.removeChannel(channel);
  };
}
