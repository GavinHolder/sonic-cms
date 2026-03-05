/**
 * Create Demo Users for Client Meeting
 *
 * HOW TO RUN:
 *   1. Open http://localhost:3000/admin/login and log in as admin
 *   2. Open browser DevTools → Console tab
 *   3. Paste this script and press Enter
 *
 * CREATES:
 *   client    / CmsDemo2026  (VIEWER — read only, no editing)
 *   assistant / CmsDemo2026  (VIEWER — read only, no editing)
 *
 * ADMIN URL: http://localhost:3000/admin/login
 */

(async function createDemoUsers() {

  async function createUser(username, firstName, lastName, email, password, role = 'VIEWER') {
    const res = await fetch('/api/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, firstName, lastName, role }),
    });
    const j = await res.json();
    if (j.success) {
      console.log(`  ✅ Created: ${username} (${role}) — password: ${password}`);
    } else if (j.error && (j.error.includes('already taken') || j.error.includes('already registered'))) {
      console.log(`  ℹ️  Skipped: ${username} already exists`);
    } else {
      console.error(`  ❌ Failed: ${username}`, j.error || JSON.stringify(j));
    }
  }

  console.log('\n👤 Creating demo users...');

  await createUser('client',    'Client',    'Demo',      'client@yourcompany.co.za',    'CmsDemo2026', 'SUPER_ADMIN');
  await createUser('assistant', 'Assistant', 'Demo',      'assistant@yourcompany.co.za', 'CmsDemo2026', 'SUPER_ADMIN');

  console.log('\n🎉 Done!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin login:     http://localhost:3000/admin/login');
  console.log('');
  console.log('  Username: client       Password: CmsDemo2026');
  console.log('  Username: assistant    Password: CmsDemo2026');
  console.log('');
  console.log('  Both accounts are SUPER_ADMIN — full access.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

})();
