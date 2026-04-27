import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const USERS_PATH = path.join(__dirname, '../../data/office-users.json');

interface UserRecord {
  username: string;
  passwordHash: string;
  playerId: string;
}

interface UsersData {
  users: Record<string, UserRecord>; // keyed by username
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function loadUsers(): UsersData {
  try {
    if (fs.existsSync(USERS_PATH)) {
      return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
    }
  } catch {}
  return { users: {} };
}

function saveUsers(data: UsersData) {
  const dir = path.dirname(USERS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_PATH, JSON.stringify(data));
}

const usersData = loadUsers();

export function register(username: string, password: string): { ok: true; playerId: string } | { ok: false; error: string } {
  if (!username || username.length < 2 || username.length > 8) {
    return { ok: false, error: '用户名需要2-8个字符' };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: '密码至少4个字符' };
  }
  if (usersData.users[username]) {
    return { ok: false, error: '用户名已被占用' };
  }

  const playerId = 'op_' + crypto.randomBytes(4).toString('hex');
  usersData.users[username] = {
    username,
    passwordHash: hashPassword(password),
    playerId,
  };
  saveUsers(usersData);
  return { ok: true, playerId };
}

export function login(username: string, password: string): { ok: true; playerId: string } | { ok: false; error: string } {
  const user = usersData.users[username];
  if (!user) {
    return { ok: false, error: '用户不存在' };
  }
  if (user.passwordHash !== hashPassword(password)) {
    return { ok: false, error: '密码错误' };
  }
  return { ok: true, playerId: user.playerId };
}

export function getUsername(playerId: string): string | null {
  for (const user of Object.values(usersData.users)) {
    if (user.playerId === playerId) return user.username;
  }
  return null;
}
