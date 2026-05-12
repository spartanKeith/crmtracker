// ============================================================
//  ENVIRONMENT CONFIGURATION
//  Note: This front-end environment file is readable in the browser.
//  For production, move authentication to a backend/API.
// ============================================================

window.APP_ENV = {
  APP_NAME: 'Spartan BTY — CRM Department',
  STORAGE_KEYS: {
    members: 'spartan_members',
    sasRecords: 'spartan_sas',
    sessionUser: 'spartan_user'
  },
  ACCOUNTS: [
    { username: 'spartan_chard', password: 'keithpogi', role: 'super_admin', display: 'Chard' },
    { username: 'spartan_keith', password: 'keithpogi', role: 'super_admin', display: 'Keith' },
    { username: 'spartan_gift', password: 'keithpogi', role: 'viewer', display: 'Gifthel' },
    { username: 'spartan_rich', password: 'keithpogi', role: 'viewer', display: 'Richelle' }
  ],
  MEMBER_ACCOUNT_ROLES: [
    { value: 'viewer', label: 'Viewer' },
    { value: 'super_admin', label: 'Super Admin' }
  ]
};
