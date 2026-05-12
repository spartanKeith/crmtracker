// ============================================================
//  DATA
// ============================================================
// ============================================================
//  ENVIRONMENT CONFIG
// ============================================================
const APP_ENV = window.APP_ENV || {};
const ACCOUNTS = APP_ENV.ACCOUNTS || [];
const STORAGE_KEYS = APP_ENV.STORAGE_KEYS || {
  members: 'spartan_members',
  sasRecords: 'spartan_sas',
  sessionUser: 'spartan_user'
};

let state = {
  user: null,
  members: [],
  sasRecords: [],
};

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  members: 'CRM Members',
  monitoring: '4SAS Monitoring',
  reports: 'Reports / Export',
  about: 'About',
};

// ============================================================
//  STORAGE
// ============================================================
function loadStorage() {
  try {
    const m = localStorage.getItem(STORAGE_KEYS.members);
    const s = localStorage.getItem(STORAGE_KEYS.sasRecords);
    if (m) state.members = JSON.parse(m);
    if (s) state.sasRecords = JSON.parse(s);
  } catch(e) {}
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(state.members));
  localStorage.setItem(STORAGE_KEYS.sasRecords, JSON.stringify(state.sasRecords));
}

// ============================================================
//  AUTH
// ============================================================
function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const account = getAllAccounts().find(a => a.username === username && a.password === password);
  if (!account) {
    document.getElementById('login-error').style.display = 'block';
    return;
  }
  document.getElementById('login-error').style.display = 'none';
  state.user = account;
  sessionStorage.setItem(STORAGE_KEYS.sessionUser, JSON.stringify(account));
  showApp();
  if (account.memberId && account.passwordChangeRequired) {
    openForcePasswordModal();
  }
}

function handleLogout() {
  state.user = null;
  sessionStorage.removeItem(STORAGE_KEYS.sessionUser);
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function isSuperAdmin() {
  return state.user && state.user.role === 'super_admin';
}

function formatRole(role) {
  const labels = {
    super_admin: 'Super Admin',
    viewer: 'Viewer'
  };
  return labels[role] || role || '—';
}

function getAllAccounts() {
  const memberAccounts = state.members
    .filter(m => m.username && m.password && m.status === 'Active')
    .map(m => ({
      username: m.username,
      password: m.password,
      role: m.accountRole || 'viewer',
      display: m.name || m.username,
      memberId: m.id,
      passwordChangeRequired: m.passwordChangeRequired === true
    }));

  return [...ACCOUNTS, ...memberAccounts];
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  const u = state.user;
  document.getElementById('sidebar-avatar').textContent = u.display[0].toUpperCase();
  document.getElementById('sidebar-name').textContent = u.display;
  document.getElementById('sidebar-role').textContent = formatRole(u.role);

  const badge = document.getElementById('header-role-badge');
  badge.textContent = formatRole(u.role);
  badge.className = 'role-badge ' + u.role;

  // Apply access rules
  const adminOnly = isSuperAdmin();
  document.getElementById('btn-add-member').style.display = adminOnly ? '' : 'none';
  document.getElementById('btn-add-4sas').style.display = adminOnly ? '' : 'none';
  document.getElementById('btn-export').style.display = adminOnly ? '' : 'none';
  document.getElementById('members-actions-th').style.display = adminOnly ? '' : 'none';
  document.getElementById('sas-actions-th').style.display = adminOnly ? '' : 'none';

  navigate('dashboard');
}

// ============================================================
//  NAVIGATION
// ============================================================
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const items = document.querySelectorAll('.nav-item');
  const pageIndex = ['dashboard','members','monitoring','reports','about'];
  items[pageIndex.indexOf(page)]?.classList.add('active');

  document.getElementById('header-title').textContent = PAGE_TITLES[page] || page;

  closeSidebar();

  if (page === 'dashboard') renderDashboard();
  if (page === 'members') renderMembers();
  if (page === 'monitoring') render4SAS();
  if (page === 'reports') renderReports();
}

// ============================================================
//  SIDEBAR MOBILE
// ============================================================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ============================================================
//  DASHBOARD FILTERS
// ============================================================
function onDashFilterTypeChange() {
  const type = document.getElementById('dash-filter-type').value;
  document.getElementById('dash-single-date-wrap').style.display = (type === 'date_covered' || type === 'stamp_date') ? 'flex' : 'none';
  document.getElementById('dash-range-wrap').style.display = type === 'date_range' ? 'flex' : 'none';
  document.getElementById('dash-month-wrap').style.display = type === 'month' ? 'flex' : 'none';

  const labelEl = document.getElementById('dash-single-date-label');
  if (type === 'stamp_date') labelEl.textContent = 'Stamp Date';
  else labelEl.textContent = 'Date Covered';

  renderDashboard();
}

function clearDashFilters() {
  document.getElementById('dash-filter-type').value = 'all';
  document.getElementById('dash-single-date').value = '';
  document.getElementById('dash-range-from').value = '';
  document.getElementById('dash-range-to').value = '';
  document.getElementById('dash-month').value = '';
  document.getElementById('dash-cat-filter').value = '';
  onDashFilterTypeChange();
}

function getDashFiltered() {
  const type = document.getElementById('dash-filter-type')?.value || 'all';
  const singleDate = document.getElementById('dash-single-date')?.value || '';
  const rangeFrom = document.getElementById('dash-range-from')?.value || '';
  const rangeTo = document.getElementById('dash-range-to')?.value || '';
  const month = document.getElementById('dash-month')?.value || '';
  const cat = document.getElementById('dash-cat-filter')?.value || '';

  let filtered = [...state.sasRecords];

  // Category filter
  if (cat) filtered = filtered.filter(r => r.category === cat);

  // Date filter
  if (type === 'date_covered' && singleDate) {
    filtered = filtered.filter(r => r.dateCovered === singleDate);
  } else if (type === 'stamp_date' && singleDate) {
    filtered = filtered.filter(r => r.stampDate === singleDate);
  } else if (type === 'date_range') {
    if (rangeFrom) filtered = filtered.filter(r => r.dateCovered >= rangeFrom);
    if (rangeTo)   filtered = filtered.filter(r => r.dateCovered <= rangeTo);
  } else if (type === 'month' && month) {
    filtered = filtered.filter(r => r.dateCovered && r.dateCovered.startsWith(month));
  }

  return { filtered, type, singleDate, rangeFrom, rangeTo, month, cat };
}

function buildFilterLabel(type, singleDate, rangeFrom, rangeTo, month, cat) {
  let parts = [];
  if (type === 'date_covered' && singleDate) parts.push(`Date Covered: ${singleDate}`);
  else if (type === 'stamp_date' && singleDate) parts.push(`Stamp Date: ${singleDate}`);
  else if (type === 'date_range') {
    if (rangeFrom || rangeTo) parts.push(`Range: ${rangeFrom||'…'} → ${rangeTo||'…'}`);
  } else if (type === 'month' && month) {
    const d = new Date(month + '-01');
    parts.push(`Month: ${d.toLocaleString('default',{month:'long',year:'numeric'})}`);
  }
  if (cat) parts.push(`Category: ${cat}`);
  return parts.join(' · ');
}

// ============================================================
//  DASHBOARD
// ============================================================
function renderDashboard() {
  const { filtered, type, singleDate, rangeFrom, rangeTo, month, cat } = getDashFiltered();

  const isFiltered = type !== 'all' || !!cat;
  const filterLabel = buildFilterLabel(type, singleDate, rangeFrom, rangeTo, month, cat);

  // Subtitle & filter indicator
  const indicatorEl = document.getElementById('dash-filter-indicator');
  const filterLabelEl = document.getElementById('dash-filter-label');
  if (isFiltered && filterLabel) {
    indicatorEl.style.display = 'flex';
    filterLabelEl.textContent = filterLabel;
  } else {
    indicatorEl.style.display = 'none';
  }
  document.getElementById('dash-subtitle').textContent = isFiltered
    ? `Showing filtered data — ${filtered.length} record${filtered.length !== 1 ? 's' : ''} matched.`
    : "Welcome back! Here's your CRM overview.";

  const totalExported  = filtered.reduce((s,r) => s + (r.exported||0), 0);
  const totalProcessed = filtered.reduce((s,r) => s + (r.processed||0), 0);
  const totalPending   = filtered.reduce((s,r) => s + (r.pending||0), 0);

  const newRec = filtered.filter(r => r.category === 'New');
  const retRec = filtered.filter(r => r.category === 'Retention');

  // Stats cards
  const statsEl = document.getElementById('dashboard-stats');
  statsEl.innerHTML = `
    <div class="stat-card blue">
      <div class="stat-icon blue">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div class="stat-label">Total Exported 4SAS</div>
      <div class="stat-value">${totalExported.toLocaleString()}</div>
      <div class="stat-sub">${filtered.length} record${filtered.length!==1?'s':''} ${isFiltered?'in filter':'total'}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon green">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="stat-label">Total Processed 4SAS</div>
      <div class="stat-value">${totalProcessed.toLocaleString()}</div>
      <div class="stat-sub">Across ${isFiltered?'filtered':'all'} categories</div>
    </div>
    <div class="stat-card red">
      <div class="stat-icon red">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="stat-label">Total Pending 4SAS</div>
      <div class="stat-value">${totalPending.toLocaleString()}</div>
      <div class="stat-sub">Awaiting processing</div>
    </div>
    <div class="stat-card teal">
      <div class="stat-icon teal">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div class="stat-label">CRM Members</div>
      <div class="stat-value">${state.members.length}</div>
      <div class="stat-sub">${state.members.filter(m=>m.status==='Active').length} active</div>
    </div>
  `;

  // Summary cards
  const summaryEl = document.getElementById('dashboard-summary');
  const newExported  = newRec.reduce((s,r)=>s+(r.exported||0),0);
  const newProcessed = newRec.reduce((s,r)=>s+(r.processed||0),0);
  const newPending   = newRec.reduce((s,r)=>s+(r.pending||0),0);
  const retExported  = retRec.reduce((s,r)=>s+(r.exported||0),0);
  const retProcessed = retRec.reduce((s,r)=>s+(r.processed||0),0);
  const retPending   = retRec.reduce((s,r)=>s+(r.pending||0),0);
  summaryEl.innerHTML = `
    <div class="summary-card">
      <h3>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        New 4SAS Summary
      </h3>
      <div class="summary-row"><span class="label">Exported</span><span class="value">${newExported.toLocaleString()}</span></div>
      <div class="summary-row"><span class="label">Processed</span><span class="value">${newProcessed.toLocaleString()}</span></div>
      <div class="summary-row"><span class="label">Pending</span><span class="value" style="color:var(--danger)">${newPending.toLocaleString()}</span></div>
      <div class="summary-row"><span class="label">Records</span><span class="value">${newRec.length}</span></div>
    </div>
    <div class="summary-card">
      <h3>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        Retention 4SAS Summary
      </h3>
      <div class="summary-row"><span class="label">Exported</span><span class="value">${retExported.toLocaleString()}</span></div>
      <div class="summary-row"><span class="label">Processed</span><span class="value">${retProcessed.toLocaleString()}</span></div>
      <div class="summary-row"><span class="label">Pending</span><span class="value" style="color:var(--danger)">${retPending.toLocaleString()}</span></div>
      <div class="summary-row"><span class="label">Records</span><span class="value">${retRec.length}</span></div>
    </div>
  `;

  // Records table
  const sorted = [...filtered].sort((a,b)=>b.id-a.id);
  const display = isFiltered ? sorted : sorted.slice(0, 10);

  document.getElementById('dash-table-title').textContent = isFiltered ? 'Filtered 4SAS Records' : 'Recent 4SAS Records';
  document.getElementById('dash-record-count').textContent = isFiltered
    ? `${display.length} record${display.length!==1?'s':''}`
    : display.length < sorted.length ? `Showing ${display.length} of ${sorted.length}` : `${display.length} record${display.length!==1?'s':''}`;

  const tbody = document.getElementById('dashboard-recent-table');
  if (!display.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No records match the current filter.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = display.map((r,i)=>`
    <tr>
      <td style="color:var(--text3);font-size:12px;">${i+1}</td>
      <td><span class="badge badge-${r.category.toLowerCase()}">${r.category}</span></td>
      <td>${r.exported.toLocaleString()}</td>
      <td>${r.processed.toLocaleString()}</td>
      <td style="color:var(--danger);font-weight:700">${r.pending.toLocaleString()}</td>
      <td>${r.dateCovered}</td>
      <td>${r.stampDate}</td>
      <td>${r.savedBy}</td>
    </tr>
  `).join('');
}

// ============================================================
//  CRM MEMBERS
// ============================================================
function renderMembers() {
  const search = (document.getElementById('member-search')?.value || '').toLowerCase();
  const statusF = document.getElementById('member-status-filter')?.value || '';
  let filtered = state.members.filter(m => {
    const matchSearch = [m.name, m.username, formatRole(m.accountRole)].join(' ').toLowerCase().includes(search);
    const matchStatus = !statusF || m.status === statusF;
    return matchSearch && matchStatus;
  });

  const tbody = document.getElementById('members-table');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>No members found.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map((m, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${m.name}</strong></td>
      <td><strong>${m.username || '—'}</strong></td>
      <td><span class="badge badge-role">${formatRole(m.accountRole)}</span></td>
      <td><span class="badge badge-${m.status === 'Active' ? 'active' : 'inactive'}">${m.status}</span></td>
      <td>${m.dateAdded}</td>
      ${isSuperAdmin() ? `
      <td class="actions-cell">
        <button class="btn btn-outline btn-sm" onclick="editMember(${m.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDelete('member', ${m.id})">Delete</button>
      </td>` : '<td></td>'}
    </tr>
  `).join('');
}

function openMemberModal(id) {
  document.getElementById('member-modal-title').textContent = id ? 'Edit Member' : 'Add CRM Member';
  document.getElementById('member-edit-id').value = id || '';
  document.getElementById('member-name').value = '';
    document.getElementById('member-status').value = 'Active';
  document.getElementById('member-username').value = '';
  document.getElementById('member-password').value = '';
  document.getElementById('member-account-role').value = 'viewer';

  if (id) {
    const m = state.members.find(x => x.id === id);
    if (m) {
      document.getElementById('member-name').value = m.name;
      document.getElementById('member-status').value = m.status;
      document.getElementById('member-username').value = m.username || '';
      document.getElementById('member-password').value = m.password || '';
      document.getElementById('member-account-role').value = m.accountRole || 'viewer';
    }
  }
  document.getElementById('member-modal').classList.add('open');
}

function closeMemberModal() {
  document.getElementById('member-modal').classList.remove('open');
}

function editMember(id) { openMemberModal(id); }

function saveMember() {
  const name = document.getElementById('member-name').value.trim();
  const status = document.getElementById('member-status').value;
  const username = document.getElementById('member-username').value.trim();
  const password = document.getElementById('member-password').value;
  const accountRole = document.getElementById('member-account-role').value;
  const editId = document.getElementById('member-edit-id').value;

  if (!name || !username || !password || !accountRole) {
    showToast('Please fill in all required fields, including account username, password, and access role.', 'error');
    return;
  }

  const normalizedUsername = username.toLowerCase();
  const reservedAccount = ACCOUNTS.some(a => a.username.toLowerCase() === normalizedUsername);
  const duplicateMember = state.members.some(m =>
    m.username &&
    m.username.toLowerCase() === normalizedUsername &&
    (!editId || m.id !== parseInt(editId))
  );

  if (reservedAccount || duplicateMember) {
    showToast('Username already exists. Please use a different username.', 'error');
    return;
  }

  if (editId) {
    const idx = state.members.findIndex(m => m.id === parseInt(editId));
    if (idx !== -1) {
      state.members[idx] = { ...state.members[idx], name, status, username, password, accountRole };
    }
    showToast('Member updated successfully!', 'success');
  } else {
    const id = Date.now();
    state.members.push({ id, name, status, username, password, accountRole, passwordChangeRequired: true, dateAdded: today() });
    showToast('Member added successfully! The new user must change their password on first login.', 'success');
  }

  saveStorage();
  closeMemberModal();
  renderMembers();
}


// ============================================================
//  FORCE PASSWORD CHANGE
// ============================================================
function openForcePasswordModal() {
  const modal = document.getElementById('force-password-modal');
  if (!modal) return;
  document.getElementById('force-current-username').textContent = state.user?.username || '—';
  document.getElementById('force-new-password').value = '';
  document.getElementById('force-confirm-password').value = '';
  document.getElementById('force-password-error').style.display = 'none';
  modal.classList.add('open');

  setTimeout(() => document.getElementById('force-new-password')?.focus(), 100);
}

function saveForcedPassword() {
  const newPassword = document.getElementById('force-new-password').value;
  const confirmPassword = document.getElementById('force-confirm-password').value;
  const errorBox = document.getElementById('force-password-error');

  if (!newPassword || !confirmPassword) {
    errorBox.textContent = 'Please enter and confirm your new password.';
    errorBox.style.display = 'block';
    return;
  }

  if (newPassword.length < 3) {
    errorBox.textContent = 'Password must be at least 3 characters.';
    errorBox.style.display = 'block';
    return;
  }

  if (newPassword !== confirmPassword) {
    errorBox.textContent = 'Password confirmation does not match.';
    errorBox.style.display = 'block';
    return;
  }

  const memberId = state.user?.memberId;
  const memberIndex = state.members.findIndex(m => m.id === memberId);

  if (memberIndex === -1) {
    errorBox.textContent = 'Unable to update this account. Please contact a Super Admin.';
    errorBox.style.display = 'block';
    return;
  }

  state.members[memberIndex].password = newPassword;
  state.members[memberIndex].passwordChangeRequired = false;
  saveStorage();

  state.user.password = newPassword;
  state.user.passwordChangeRequired = false;
  sessionStorage.setItem(STORAGE_KEYS.sessionUser, JSON.stringify(state.user));

  document.getElementById('force-password-modal').classList.remove('open');
  showToast('Password changed successfully. You may now continue.', 'success');
}

// ============================================================
//  4SAS
// ============================================================
function computePending() {
  const exp = parseFloat(document.getElementById('sas-exported').value) || 0;
  const proc = parseFloat(document.getElementById('sas-processed').value) || 0;
  const pending = exp - proc;
  document.getElementById('sas-pending-display').textContent = pending >= 0 ? pending.toLocaleString() : '—';
}

function render4SAS() {
  const catF = document.getElementById('sas-cat-filter')?.value || '';
  const dateCovF = document.getElementById('sas-date-covered-filter')?.value || '';
  const stampF = document.getElementById('sas-stamp-filter')?.value || '';

  let filtered = state.sasRecords.filter(r => {
    const matchCat = !catF || r.category === catF;
    const matchDate = !dateCovF || r.dateCovered === dateCovF;
    const matchStamp = !stampF || r.stampDate === stampF;
    return matchCat && matchDate && matchStamp;
  });

  const tbody = document.getElementById('sas-table');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><p>No records found.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.sort((a,b)=>b.id-a.id).map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td><span class="badge badge-${r.category.toLowerCase()}">${r.category}</span></td>
      <td>${r.exported.toLocaleString()}${r.lastUpdated ? `<br><span style="font-size:10px;color:var(--text3);">updated ${r.lastUpdated}</span>` : ''}</td>
      <td>${r.processed.toLocaleString()}</td>
      <td style="color:var(--danger);font-weight:700">${r.pending.toLocaleString()}</td>
      <td>${r.dateCovered}</td>
      <td>${r.stampDate}</td>
      <td>${r.savedBy}${r.lastUpdatedBy && r.lastUpdatedBy !== r.savedBy ? `<br><span style="font-size:10px;color:var(--text3);">edited by ${r.lastUpdatedBy}</span>` : ''}</td>
      ${isSuperAdmin() ? `
      <td class="actions-cell">
        <button class="btn btn-accent btn-sm" onclick="openAddToModal(${r.id})" title="Add to this record">+ Add</button>
        <button class="btn btn-outline btn-sm" onclick="edit4SAS(${r.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDelete('sas', ${r.id})">Delete</button>
      </td>` : '<td></td>'}
    </tr>
  `).join('');
}

function clearSASFilters() {
  document.getElementById('sas-cat-filter').value = '';
  document.getElementById('sas-date-covered-filter').value = '';
  document.getElementById('sas-stamp-filter').value = '';
  render4SAS();
}

function open4SASModal(id) {
  document.getElementById('sas-modal-title').textContent = id ? 'Edit 4SAS Record' : 'Add 4SAS Record';
  document.getElementById('sas-edit-id').value = id || '';
  document.getElementById('sas-category').value = 'New';
  document.getElementById('sas-exported').value = '';
  document.getElementById('sas-processed').value = '';
  document.getElementById('sas-pending-display').textContent = '—';
  document.getElementById('sas-date-covered').value = today();
  document.getElementById('sas-stamp-date').value = today();

  if (id) {
    const r = state.sasRecords.find(x => x.id === id);
    if (r) {
      document.getElementById('sas-category').value = r.category;
      document.getElementById('sas-exported').value = r.exported;
      document.getElementById('sas-processed').value = r.processed;
      document.getElementById('sas-pending-display').textContent = r.pending.toLocaleString();
      document.getElementById('sas-date-covered').value = r.dateCovered;
      document.getElementById('sas-stamp-date').value = r.stampDate;
    }
  }
  document.getElementById('sas-modal').classList.add('open');
}

function close4SASModal() {
  document.getElementById('sas-modal').classList.remove('open');
}

function edit4SAS(id) { open4SASModal(id); }

// ============================================================
//  ADD TO EXISTING RECORD
// ============================================================
let addToCurrentRecord = null;

function openAddToModal(id) {
  if (!isSuperAdmin()) { showToast('Access denied.', 'error'); return; }
  const r = state.sasRecords.find(x => x.id === id);
  if (!r) return;
  addToCurrentRecord = r;

  document.getElementById('addto-record-id').value = id;
  document.getElementById('addto-category-display').textContent = r.category;
  document.getElementById('addto-datecovered-display').textContent = r.dateCovered;
  document.getElementById('addto-cur-exported').textContent = r.exported.toLocaleString();
  document.getElementById('addto-cur-processed').textContent = r.processed.toLocaleString();
  document.getElementById('addto-cur-pending').textContent = r.pending.toLocaleString();

  document.getElementById('addto-add-exported').value = '';
  document.getElementById('addto-add-processed').value = '';
  document.getElementById('addto-res-exported').textContent = r.exported.toLocaleString();
  document.getElementById('addto-res-processed').textContent = r.processed.toLocaleString();
  document.getElementById('addto-res-pending').textContent = r.pending.toLocaleString();

  document.getElementById('addto-modal').classList.add('open');
}

function closeAddToModal() {
  document.getElementById('addto-modal').classList.remove('open');
  addToCurrentRecord = null;
}

function computeAddToResult() {
  if (!addToCurrentRecord) return;
  const addExp = parseFloat(document.getElementById('addto-add-exported').value) || 0;
  const addProc = parseFloat(document.getElementById('addto-add-processed').value) || 0;
  const newExported = addToCurrentRecord.exported + addExp;
  const newProcessed = addToCurrentRecord.processed + addProc;
  const newPending = newExported - newProcessed;
  document.getElementById('addto-res-exported').textContent = newExported.toLocaleString();
  document.getElementById('addto-res-processed').textContent = newProcessed.toLocaleString();
  document.getElementById('addto-res-pending').textContent = newPending.toLocaleString();
}

function applyAddTo() {
  if (!isSuperAdmin()) { showToast('Access denied.', 'error'); return; }
  const addExp = parseFloat(document.getElementById('addto-add-exported').value) || 0;
  const addProc = parseFloat(document.getElementById('addto-add-processed').value) || 0;

  if (addExp === 0 && addProc === 0) {
    showToast('Please enter at least one value to add.', 'error');
    return;
  }

  const id = parseInt(document.getElementById('addto-record-id').value);
  const idx = state.sasRecords.findIndex(r => r.id === id);
  if (idx === -1) { showToast('Record not found.', 'error'); return; }

  const rec = state.sasRecords[idx];
  const newExported = rec.exported + addExp;
  const newProcessed = rec.processed + addProc;
  const newPending = newExported - newProcessed;

  state.sasRecords[idx] = {
    ...rec,
    exported: newExported,
    processed: newProcessed,
    pending: newPending,
    lastUpdatedBy: state.user.display,
    lastUpdated: today(),
  };

  saveStorage();
  closeAddToModal();
  render4SAS();
  showToast(`Record updated! +${addExp.toLocaleString()} Exported, +${addProc.toLocaleString()} Processed.`, 'success');
}

function save4SAS() {
  const category = document.getElementById('sas-category').value;
  const exported = parseFloat(document.getElementById('sas-exported').value);
  const processed = parseFloat(document.getElementById('sas-processed').value);
  const dateCovered = document.getElementById('sas-date-covered').value;
  const stampDate = document.getElementById('sas-stamp-date').value || today();
  const editId = document.getElementById('sas-edit-id').value;

  if (!dateCovered) { showToast('Please select a Date Covered.', 'error'); return; }
  if (isNaN(exported) || isNaN(processed)) { showToast('Please enter valid numbers.', 'error'); return; }

  const pending = exported - processed;

  if (editId) {
    const idx = state.sasRecords.findIndex(r => r.id === parseInt(editId));
    if (idx !== -1) {
      state.sasRecords[idx] = { ...state.sasRecords[idx], category, exported, processed, pending, dateCovered, stampDate };
    }
    showToast('Record updated!', 'success');
  } else {
    state.sasRecords.push({
      id: Date.now(),
      category, exported, processed, pending,
      dateCovered, stampDate,
      savedBy: state.user.display,
    });
    showToast('Record saved!', 'success');
  }

  saveStorage();
  close4SASModal();
  render4SAS();
}

// ============================================================
//  REPORTS
// ============================================================
function renderReports() {
  const catF = document.getElementById('rpt-cat-filter')?.value || '';
  const dateF = document.getElementById('rpt-date-filter')?.value || '';

  let filtered = state.sasRecords.filter(r => {
    const matchCat = !catF || r.category === catF;
    const matchDate = !dateF || r.dateCovered === dateF;
    return matchCat && matchDate;
  });

  const totalExp = filtered.reduce((s,r)=>s+(r.exported||0),0);
  const totalProc = filtered.reduce((s,r)=>s+(r.processed||0),0);
  const totalPend = filtered.reduce((s,r)=>s+(r.pending||0),0);

  document.getElementById('reports-stats').innerHTML = `
    <div class="stat-card blue">
      <div class="stat-icon blue"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <div class="stat-label">Total Exported</div>
      <div class="stat-value">${totalExp.toLocaleString()}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon green"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div class="stat-label">Total Processed</div>
      <div class="stat-value">${totalProc.toLocaleString()}</div>
    </div>
    <div class="stat-card red">
      <div class="stat-icon red"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
      <div class="stat-label">Total Pending</div>
      <div class="stat-value">${totalPend.toLocaleString()}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon orange"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      <div class="stat-label">Filtered Records</div>
      <div class="stat-value">${filtered.length}</div>
    </div>
  `;

  const tbody = document.getElementById('reports-table');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No records match the current filters.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.sort((a,b)=>b.id-a.id).map((r,i) => `
    <tr>
      <td>${i+1}</td>
      <td><span class="badge badge-${r.category.toLowerCase()}">${r.category}</span></td>
      <td>${r.exported.toLocaleString()}</td>
      <td>${r.processed.toLocaleString()}</td>
      <td style="color:var(--danger);font-weight:700">${r.pending.toLocaleString()}</td>
      <td>${r.dateCovered}</td>
      <td>${r.stampDate}</td>
      <td>${r.savedBy}</td>
    </tr>
  `).join('');
}

function exportToExcel() {
  if (!isSuperAdmin()) { showToast('Access denied.', 'error'); return; }
  const catF = document.getElementById('rpt-cat-filter')?.value || '';
  const dateF = document.getElementById('rpt-date-filter')?.value || '';

  let filtered = state.sasRecords.filter(r => {
    const matchCat = !catF || r.category === catF;
    const matchDate = !dateF || r.dateCovered === dateF;
    return matchCat && matchDate;
  });

  if (!filtered.length) { showToast('No data to export.', 'info'); return; }

  const rows = filtered.map(r => ({
    'Category': r.category,
    'Total Exported 4SAS': r.exported,
    'Total Processed 4SAS': r.processed,
    'Total Pending 4SAS': r.pending,
    'Date Covered': r.dateCovered,
    'Stamp Date': r.stampDate,
    'Saved By': r.savedBy,
    'Last Updated By': r.lastUpdatedBy || '',
    'Last Updated Date': r.lastUpdated || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '4SAS Data');
  XLSX.writeFile(wb, `SpartanBTY_4SAS_${today()}.xlsx`);
  showToast('Export successful!', 'success');
}

// ============================================================
//  DELETE CONFIRM
// ============================================================
let pendingDeleteType = null;
let pendingDeleteId = null;

function confirmDelete(type, id) {
  pendingDeleteType = type;
  pendingDeleteId = id;
  document.getElementById('confirm-text').textContent = 'Are you sure you want to delete this record? This action cannot be undone.';
  document.getElementById('confirm-ok-btn').onclick = executeDelete;
  document.getElementById('confirm-modal').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-modal').classList.remove('open');
  pendingDeleteType = null;
  pendingDeleteId = null;
}

function executeDelete() {
  if (pendingDeleteType === 'member') {
    state.members = state.members.filter(m => m.id !== pendingDeleteId);
    saveStorage();
    renderMembers();
    showToast('Member deleted.', 'success');
  } else if (pendingDeleteType === 'sas') {
    state.sasRecords = state.sasRecords.filter(r => r.id !== pendingDeleteId);
    saveStorage();
    render4SAS();
    showToast('Record deleted.', 'success');
  }
  closeConfirm();
}

// ============================================================
//  TOAST
// ============================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2980b9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icons[type] || ''} ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ============================================================
//  UTILS
// ============================================================
function today() {
  return new Date().toISOString().split('T')[0];
}

// ============================================================
//  INIT
// ============================================================
function init() {
  loadStorage();
  // Check session
  const saved = sessionStorage.getItem(STORAGE_KEYS.sessionUser);
  if (saved) {
    try {
      const savedUser = JSON.parse(saved);
      if (savedUser.memberId) {
        const member = state.members.find(m => m.id === savedUser.memberId && m.status === 'Active');
        if (member) {
          state.user = {
            username: member.username,
            password: member.password,
            role: member.accountRole || 'viewer',
            display: member.name || member.username,
            memberId: member.id,
            passwordChangeRequired: member.passwordChangeRequired === true
          };
        } else {
          sessionStorage.removeItem(STORAGE_KEYS.sessionUser);
        }
      } else {
        state.user = savedUser;
      }
      if (state.user) {
        showApp();
        if (state.user.memberId && state.user.passwordChangeRequired) {
          openForcePasswordModal();
        }
        return;
      }
    } catch(e) {}
  }
  // Show login
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';

  // Login on Enter
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('login-username').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-password').focus();
  });
}

init();
