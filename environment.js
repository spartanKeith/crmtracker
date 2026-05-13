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
    { username: 'spartan_keith', password: 'keithpogi', role: 'super_admin', display: 'Keith Garcia' }
  ],
  MEMBER_ACCOUNT_ROLES: [
    { value: 'viewer', label: 'Viewer' },
    { value: 'super_admin', label: 'Super Admin' }
  ]
};
