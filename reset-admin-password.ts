import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_INITIAL_PASSWORD?.trim();

if (!email || !password) {
  throw new Error(
    'ADMIN_EMAIL or ADMIN_INITIAL_PASSWORD is missing from .env'
  );
}

const dbPath = path.resolve('data', 'freightplus_db.json');

if (!fs.existsSync(dbPath)) {
  throw new Error(`Database file not found: ${dbPath}`);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const admin = db.users.find(
  (user: any) =>
    user.email?.trim().toLowerCase() === email &&
    user.role === 'admin'
);

if (!admin) {
  throw new Error(
    'No administrator matches ADMIN_EMAIL in the database.'
  );
}

// Back up the database before making any changes.
const backupPath = `${dbPath}.backup-${Date.now()}`;
fs.copyFileSync(dbPath, backupPath);

// Update only the existing administrator's password.
admin.passwordHash = bcrypt.hashSync(password, 12);

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

console.log('Administrator password reset successfully.');
console.log(`Administrator email: ${admin.email}`);
console.log(`Database backup: ${backupPath}`);