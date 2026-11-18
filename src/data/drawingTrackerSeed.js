// ============================================================================
// APEX DRAWING TRACKER — INITIAL SEED & DOMAIN HELPERS
// Linked 100% by UUID & PROJECT CODE (`key`) to Supabase `APEX_Project`
// ============================================================================

export const LEGACY_PROJECT_ID_TO_APEX_UUID = {
  p1: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', // AVENUE
  p2: 'e742d27c-aa9c-43d4-8181-d85e61a5a4df', // CW3
  p3: '2db8166a-a1cb-4dd1-9017-e5e88e1f671a', // DEAKIN
  p4: 'f6ccfd82-347a-4a70-83c7-bb1e6efbae54', // DLD
  p5: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', // ENCLAVE
  p6: '2654fbad-3e30-456e-8ae1-a7c5d0130f5f', // FGWB
  p7: 'c66187a1-a97f-4b2f-ba60-aae11cb3d8f6', // LEEDS
  p8: '45a962e0-4af9-4244-8bb4-b70b4159c7ea', // LOT 14
  p9: '8fd2a544-5521-42e9-8471-4f8de800ce06', // MAC
  p10: '9ea343db-e42b-4a99-bd01-ce1ab0158771', // MEL02
  p11: '65799e7b-60a6-4e26-8b8b-9c65450a659f'  // MEL03
};

export const TRACKER_SEED = {
  projects: [
    { id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', name: 'AVENUE', full_name: '31 The Avenue, Coburg', apex_project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', color: '#3730A3' },
    { id: 'e742d27c-aa9c-43d4-8181-d85e61a5a4df', name: 'CW3', full_name: 'Collins Wharf 3', apex_project_id: 'e742d27c-aa9c-43d4-8181-d85e61a5a4df', color: '#164E63' },
    { id: '2db8166a-a1cb-4dd1-9017-e5e88e1f671a', name: 'DEAKIN', full_name: 'Deakin Embassy', apex_project_id: '2db8166a-a1cb-4dd1-9017-e5e88e1f671a', color: '#1F2937' },
    { id: 'f6ccfd82-347a-4a70-83c7-bb1e6efbae54', name: 'DLD', full_name: 'District Living, Docklands', apex_project_id: 'f6ccfd82-347a-4a70-83c7-bb1e6efbae54', color: '#1E293B' },
    { id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', name: 'ENCLAVE', full_name: 'Enclave', apex_project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', color: '#3F3F46' },
    { id: '2654fbad-3e30-456e-8ae1-a7c5d0130f5f', name: 'FGWB', full_name: 'Fitzroy Gasworks Parcel B', apex_project_id: '2654fbad-3e30-456e-8ae1-a7c5d0130f5f', color: '#0080FF' },
    { id: 'c66187a1-a97f-4b2f-ba60-aae11cb3d8f6', name: 'LEEDS', full_name: 'Leeds St', apex_project_id: 'c66187a1-a97f-4b2f-ba60-aae11cb3d8f6', color: '#0F766E' },
    { id: '45a962e0-4af9-4244-8bb4-b70b4159c7ea', name: 'LOT 14', full_name: 'Lot Fourteen', apex_project_id: '45a962e0-4af9-4244-8bb4-b70b4159c7ea', color: '#008040' },
    { id: '8fd2a544-5521-42e9-8471-4f8de800ce06', name: 'MAC', full_name: 'Macaulay Road', apex_project_id: '8fd2a544-5521-42e9-8471-4f8de800ce06', color: '#7C2D12' },
    { id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', name: 'MEL02', full_name: 'Mel02', apex_project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', color: '#1E3A8A' },
    { id: '65799e7b-60a6-4e26-8b8b-9c65450a659f', name: 'MEL03', full_name: 'Mel03', apex_project_id: '65799e7b-60a6-4e26-8b8b-9c65450a659f', color: '#FF0080' }
  ],
  zones: [
    { id: 'p1-z2', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'GF', zone: '', sort: 2 },
    { id: 'p1-z3', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'L1', zone: '', sort: 3 },
    { id: 'p1-z4', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'L2', zone: '', sort: 4 },
    { id: 'p1-z5', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'L3', zone: '', sort: 5 },
    { id: 'p1-z6', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'L4', zone: '', sort: 6 },
    { id: 'p1-z7', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'L5', zone: '', sort: 7 },
    { id: 'p1-z8', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'L6', zone: '', sort: 8 },
    { id: 'p1-z9', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'L7', zone: '', sort: 9 },
    { id: 'p1-z10', project_id: 'e9132fa4-a399-4f7a-9bb8-a23018516c39', level: 'RF', zone: '', sort: 10 },
    { id: 'p2-z2', project_id: 'e742d27c-aa9c-43d4-8181-d85e61a5a4df', level: 'L26', zone: '', sort: 2 },
    { id: 'p2-z3', project_id: 'e742d27c-aa9c-43d4-8181-d85e61a5a4df', level: 'L27', zone: '', sort: 3 },
    { id: 'p2-z4', project_id: 'e742d27c-aa9c-43d4-8181-d85e61a5a4df', level: 'L4', zone: '', sort: 4 },
    { id: 'p3-z2', project_id: '2db8166a-a1cb-4dd1-9017-e5e88e1f671a', level: 'B1', zone: '', sort: 2 },
    { id: 'p3-z3', project_id: '2db8166a-a1cb-4dd1-9017-e5e88e1f671a', level: 'B2', zone: '', sort: 3 },
    { id: 'p4-z2', project_id: 'f6ccfd82-347a-4a70-83c7-bb1e6efbae54', level: 'GF', zone: '', sort: 2 },
    { id: 'p5-z2', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'B1', zone: '', sort: 2 },
    { id: 'p5-z3', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'B2', zone: '', sort: 3 },
    { id: 'p5-z4', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'B3', zone: '', sort: 4 },
    { id: 'p5-z5', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'GF', zone: '', sort: 5 },
    { id: 'p5-z6', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L1', zone: '', sort: 6 },
    { id: 'p5-z7', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L10', zone: '', sort: 7 },
    { id: 'p5-z8', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L11', zone: '', sort: 8 },
    { id: 'p5-z9', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L12', zone: '', sort: 9 },
    { id: 'p5-z10', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L13', zone: '', sort: 10 },
    { id: 'p5-z11', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L14', zone: '', sort: 11 },
    { id: 'p5-z12', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L15', zone: '', sort: 12 },
    { id: 'p5-z13', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L16', zone: '', sort: 13 },
    { id: 'p5-z14', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L17', zone: '', sort: 14 },
    { id: 'p5-z15', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L18', zone: '', sort: 15 },
    { id: 'p5-z16', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L19', zone: '', sort: 16 },
    { id: 'p5-z17', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L2', zone: '', sort: 17 },
    { id: 'p5-z18', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L20', zone: '', sort: 18 },
    { id: 'p5-z19', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L3', zone: '', sort: 19 },
    { id: 'p5-z20', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L4', zone: '', sort: 20 },
    { id: 'p5-z21', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L5', zone: '', sort: 21 },
    { id: 'p5-z22', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L6', zone: '', sort: 22 },
    { id: 'p5-z23', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L7', zone: '', sort: 23 },
    { id: 'p5-z24', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L8', zone: '', sort: 24 },
    { id: 'p5-z25', project_id: 'edf478c2-70a7-4e09-acc4-e389c77ec3a2', level: 'L9', zone: '', sort: 25 },
    { id: 'p6-z2', project_id: '2654fbad-3e30-456e-8ae1-a7c5d0130f5f', level: 'B1', zone: '', sort: 2 },
    { id: 'p6-z3', project_id: '2654fbad-3e30-456e-8ae1-a7c5d0130f5f', level: 'L2', zone: '', sort: 3 },
    { id: 'p7-z2', project_id: 'c66187a1-a97f-4b2f-ba60-aae11cb3d8f6', level: 'GF', zone: 'CD', sort: 2 },
    { id: 'p8-z2', project_id: '45a962e0-4af9-4244-8bb4-b70b4159c7ea', level: 'HIGH RISE', zone: '', sort: 2 },
    { id: 'p8-z3', project_id: '45a962e0-4af9-4244-8bb4-b70b4159c7ea', level: 'LOW RISE', zone: '', sort: 3 },
    { id: 'p9-z2', project_id: '8fd2a544-5521-42e9-8471-4f8de800ce06', level: 'L2', zone: '', sort: 2 },
    { id: 'p10-z2', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'A1', zone: '', sort: 2 },
    { id: 'p10-z3', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'B', zone: '', sort: 3 },
    { id: 'p10-z4', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'B1', zone: '', sort: 4 },
    { id: 'p10-z5', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'B2', zone: '', sort: 5 },
    { id: 'p10-z6', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'GF', zone: '', sort: 6 },
    { id: 'p10-z7', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'L1', zone: '', sort: 7 },
    { id: 'p10-z8', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'L1', zone: 'ZONE A', sort: 8 },
    { id: 'p10-z9', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'L1', zone: 'ZONE A2', sort: 9 },
    { id: 'p10-z10', project_id: '9ea343db-e42b-4a99-bd01-ce1ab0158771', level: 'L2', zone: '', sort: 10 },
    { id: 'p11-z2', project_id: '65799e7b-60a6-4e26-8b8b-9c65450a659f', level: 'GF', zone: '', sort: 2 },
    { id: 'p11-z3', project_id: '65799e7b-60a6-4e26-8b8b-9c65450a659f', level: 'L1', zone: '', sort: 3 },
    { id: 'p11-z4', project_id: '65799e7b-60a6-4e26-8b8b-9c65450a659f', level: 'L2', zone: '', sort: 4 },
    { id: 'p11-z5', project_id: '65799e7b-60a6-4e26-8b8b-9c65450a659f', level: 'L3', zone: '', sort: 5 },
    { id: 'p11-z6', project_id: '65799e7b-60a6-4e26-8b8b-9c65450a659f', level: 'ROOF', zone: '', sort: 6 }
  ],
  issues: [
    { id: 'p1-z2-4', zone_id: 'p1-z2', date: '2026-07-08', link: '', note: '', created_at: 0 },
    { id: 'p1-z2-5', zone_id: 'p1-z2', date: '2026-11-11', link: '', note: '', created_at: 0 },
    { id: 'p1-z2-9', zone_id: 'p1-z2', date: '2026-07-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z3-3', zone_id: 'p1-z3', date: '2026-11-06', link: '', note: '', created_at: 0 },
    { id: 'p1-z3-6', zone_id: 'p1-z3', date: '2026-07-14', link: '', note: '', created_at: 0 },
    { id: 'p1-z3-10', zone_id: 'p1-z3', date: '2026-10-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z3-11', zone_id: 'p1-z3', date: '2026-10-21', link: '', note: '', created_at: 0 },
    { id: 'p1-z4-3', zone_id: 'p1-z4', date: '2026-11-06', link: '', note: '', created_at: 0 },
    { id: 'p1-z4-7', zone_id: 'p1-z4', date: '2026-07-15', link: '', note: '', created_at: 0 },
    { id: 'p1-z4-10', zone_id: 'p1-z4', date: '2026-10-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z4-11', zone_id: 'p1-z4', date: '2026-10-21', link: '', note: '', created_at: 0 },
    { id: 'p1-z5-3', zone_id: 'p1-z5', date: '2026-11-06', link: '', note: '', created_at: 0 },
    { id: 'p1-z5-7', zone_id: 'p1-z5', date: '2026-07-15', link: '', note: '', created_at: 0 },
    { id: 'p1-z5-10', zone_id: 'p1-z5', date: '2026-10-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z5-11', zone_id: 'p1-z5', date: '2026-10-21', link: '', note: '', created_at: 0 },
    { id: 'p1-z6-3', zone_id: 'p1-z6', date: '2026-11-06', link: '', note: '', created_at: 0 },
    { id: 'p1-z6-8', zone_id: 'p1-z6', date: '2026-09-15', link: '', note: '', created_at: 0 },
    { id: 'p1-z6-10', zone_id: 'p1-z6', date: '2026-10-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z6-11', zone_id: 'p1-z6', date: '2026-10-21', link: '', note: '', created_at: 0 },
    { id: 'p1-z7-3', zone_id: 'p1-z7', date: '2026-11-06', link: '', note: '', created_at: 0 },
    { id: 'p1-z7-8', zone_id: 'p1-z7', date: '2026-09-15', link: '', note: '', created_at: 0 },
    { id: 'p1-z7-10', zone_id: 'p1-z7', date: '2026-10-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z7-11', zone_id: 'p1-z7', date: '2026-10-21', link: '', note: '', created_at: 0 },
    { id: 'p1-z8-3', zone_id: 'p1-z8', date: '2026-11-06', link: '', note: '', created_at: 0 },
    { id: 'p1-z8-8', zone_id: 'p1-z8', date: '2026-09-15', link: '', note: '', created_at: 0 },
    { id: 'p1-z8-10', zone_id: 'p1-z8', date: '2026-10-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z8-11', zone_id: 'p1-z8', date: '2026-10-21', link: '', note: '', created_at: 0 },
    { id: 'p1-z9-3', zone_id: 'p1-z9', date: '2026-11-06', link: '', note: '', created_at: 0 },
    { id: 'p1-z9-8', zone_id: 'p1-z9', date: '2026-09-15', link: '', note: '', created_at: 0 },
    { id: 'p1-z9-10', zone_id: 'p1-z9', date: '2026-10-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z9-11', zone_id: 'p1-z9', date: '2026-10-21', link: '', note: '', created_at: 0 },
    { id: 'p1-z10-3', zone_id: 'p1-z10', date: '2026-11-06', link: '', note: '', created_at: 0 },
    { id: 'p1-z10-8', zone_id: 'p1-z10', date: '2026-09-15', link: '', note: '', created_at: 0 },
    { id: 'p1-z10-10', zone_id: 'p1-z10', date: '2026-10-16', link: '', note: '', created_at: 0 },
    { id: 'p1-z10-11', zone_id: 'p1-z10', date: '2026-10-21', link: '', note: '', created_at: 0 },
    { id: 'p2-z2-3', zone_id: 'p2-z2', date: '2026-07-27', link: '', note: '', created_at: 0 },
    { id: 'p2-z3-3', zone_id: 'p2-z3', date: '2026-07-27', link: '', note: '', created_at: 0 },
    { id: 'p2-z4-4', zone_id: 'p2-z4', date: '2026-10-27', link: '', note: '', created_at: 0 },
    { id: 'p3-z2-3', zone_id: 'p3-z2', date: '2026-09-08', link: '', note: '', created_at: 0 },
    { id: 'p3-z3-3', zone_id: 'p3-z3', date: '2026-09-08', link: '', note: '', created_at: 0 },
    { id: 'p4-z2-3', zone_id: 'p4-z2', date: '2026-03-26', link: '', note: '', created_at: 0 },
    { id: 'p5-z2-8', zone_id: 'p5-z2', date: '2026-01-30', link: '', note: '', created_at: 0 },
    { id: 'p5-z3-8', zone_id: 'p5-z3', date: '2026-01-30', link: '', note: '', created_at: 0 },
    { id: 'p5-z4-5', zone_id: 'p5-z4', date: '2026-02-13', link: '', note: '', created_at: 0 },
    { id: 'p5-z5-8', zone_id: 'p5-z5', date: '2026-01-30', link: '', note: '', created_at: 0 },
    { id: 'p5-z6-3', zone_id: 'p5-z6', date: '2026-07-04', link: '', note: '', created_at: 0 },
    { id: 'p5-z7-4', zone_id: 'p5-z7', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z8-4', zone_id: 'p5-z8', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z9-4', zone_id: 'p5-z9', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z10-4', zone_id: 'p5-z10', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z11-4', zone_id: 'p5-z11', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z12-4', zone_id: 'p5-z12', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z13-4', zone_id: 'p5-z13', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z14-4', zone_id: 'p5-z14', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z15-4', zone_id: 'p5-z15', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z16-4', zone_id: 'p5-z16', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z17-7', zone_id: 'p5-z17', date: '2026-03-27', link: '', note: '', created_at: 0 },
    { id: 'p5-z18-4', zone_id: 'p5-z18', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z19-4', zone_id: 'p5-z19', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z20-4', zone_id: 'p5-z20', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z21-4', zone_id: 'p5-z21', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z22-4', zone_id: 'p5-z22', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z23-4', zone_id: 'p5-z23', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z23-6', zone_id: 'p5-z23', date: '2026-03-20', link: '', note: '', created_at: 0 },
    { id: 'p5-z24-4', zone_id: 'p5-z24', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p5-z25-4', zone_id: 'p5-z25', date: '2026-03-06', link: '', note: '', created_at: 0 },
    { id: 'p6-z2-3', zone_id: 'p6-z2', date: '2026-11-02', link: '', note: '', created_at: 0 },
    { id: 'p6-z3-4', zone_id: 'p6-z3', date: '2026-11-13', link: '', note: '', created_at: 0 },
    { id: 'p7-z2-3', zone_id: 'p7-z2', date: '2026-01-08', link: '', note: '', created_at: 0 },
    { id: 'p8-z2-3', zone_id: 'p8-z2', date: '2026-08-12', link: '', note: '', created_at: 0 },
    { id: 'p8-z2-4', zone_id: 'p8-z2', date: '2026-07-28', link: '', note: '', created_at: 0 },
    { id: 'p8-z3-3', zone_id: 'p8-z3', date: '2026-08-12', link: '', note: '', created_at: 0 },
    { id: 'p8-z3-4', zone_id: 'p8-z3', date: '2026-07-28', link: '', note: '', created_at: 0 },
    { id: 'p9-z2-3', zone_id: 'p9-z2', date: '2026-08-14', link: '', note: '', created_at: 0 },
    { id: 'p10-z2-5', zone_id: 'p10-z2', date: '2026-02-10', link: '', note: '', created_at: 0 },
    { id: 'p10-z3-3', zone_id: 'p10-z3', date: '2026-03-04', link: '', note: '', created_at: 0 },
    { id: 'p10-z4-3', zone_id: 'p10-z4', date: '2026-03-04', link: '', note: '', created_at: 0 },
    { id: 'p10-z5-3', zone_id: 'p10-z5', date: '2026-03-04', link: '', note: '', created_at: 0 },
    { id: 'p10-z6-6', zone_id: 'p10-z6', date: '2026-03-10', link: '', note: '', created_at: 0 },
    { id: 'p10-z7-4', zone_id: 'p10-z7', date: '2026-05-04', link: '', note: '', created_at: 0 },
    { id: 'p10-z8-5', zone_id: 'p10-z8', date: '2026-02-10', link: '', note: '', created_at: 0 },
    { id: 'p10-z9-3', zone_id: 'p10-z9', date: '2026-03-04', link: '', note: '', created_at: 0 },
    { id: 'p10-z10-4', zone_id: 'p10-z10', date: '2026-05-04', link: '', note: '', created_at: 0 },
    { id: 'p11-z2-3', zone_id: 'p11-z2', date: '2026-11-09', link: '', note: '', created_at: 0 },
    { id: 'p11-z3-4', zone_id: 'p11-z3', date: '2026-11-13', link: '', note: '', created_at: 0 },
    { id: 'p11-z4-5', zone_id: 'p11-z4', date: '2026-11-17', link: '', note: '', created_at: 0 }
  ],
  plans: [
    { id: 'p11-z5-p1', zone_id: 'p11-z5', date: '2026-11-19', note: '', created_at: 0 },
    { id: 'p11-z6-p1', zone_id: 'p11-z6', date: '2026-11-23', note: '', created_at: 0 }
  ]
};

export const getFreshTrackerSeed = () => JSON.parse(JSON.stringify(TRACKER_SEED));

export const uid = () => Math.random().toString(36).slice(2, 10);

export const pad2 = (n) => String(n).padStart(2, '0');

export const ymd = (d = new Date()) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const fmtShort = (s) => {
  if (!s) return '—';
  const [, m, d] = s.split('-');
  return `${+d}/${+m}`;
};

export const fmtLong = (s) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

export const toDate = (s) => {
  const [y, m, d] = s.split('-');
  return new Date(+y, +m - 1, +d);
};

export const daysAgo = (s, refDate = new Date()) => {
  const cleanRef = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  return Math.floor((cleanRef - toDate(s)) / 86400000);
};

export const isPlanLate = (plan, todayStr = ymd()) => Boolean(plan && plan.date < todayStr);

export const isUrl = (s) => /^https?:\/\//i.test(String(s || '').trim());

export const lvKey = (s) => {
  const str = String(s || '').toUpperCase().trim();
  let m = str.match(/^B(\d+)$/);
  if (m) return -Number(m[1]);
  if (/^(GF|G|GROUND)\b/.test(str)) return 0;
  m = str.match(/^L(\d+)/);
  if (m) return Number(m[1]);
  if (/^(RF|ROOF)\b/.test(str)) return 900;
  return 500;
};

export const lvlSort = (a, b) =>
  lvKey(a) - lvKey(b) || String(a).localeCompare(String(b), undefined, { numeric: true });

export const formatZoneLabel = (z) => (z?.zone ? `${z.level} · ${z.zone}` : z?.level || '');

export const PALETTE_COLORS = [
  '#3730A3', '#0284C7', '#059669', '#D97706', '#E11D48',
  '#7C3AED', '#0D9488', '#4F46E5', '#EA580C', '#2563EB', '#BE185D'
];
