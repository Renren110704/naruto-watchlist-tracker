import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { UserEpisodeProgress } from '../models/UserEpisodeProgress.js';
import { EpisodeNote } from '../models/EpisodeNote.js';
import { ApiError } from '../utils/ApiError.js';
import { clearAuthCookie, issueCsrfToken, setAuthCookie, signToken } from '../utils/auth.js';

// Used to equalise timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-password', 10);

function startSession(res, user) {
  setAuthCookie(res, signToken(user));
}

export function getCsrf(req, res) {
  res.json({ csrfToken: issueCsrfToken(res) });
}

export async function signup(req, res) {
  const { username, email, password } = req.body;
  const conflicts = {};
  const [emailTaken, nameTaken] = await Promise.all([
    User.exists({ email }),
    User.exists({ usernameLower: username.toLowerCase() }),
  ]);
  if (emailTaken) conflicts.email = 'An account with this email already exists';
  if (nameTaken) conflicts.username = 'This username is already taken';
  if (Object.keys(conflicts).length) throw ApiError.validation(conflicts, 'Account details already in use');

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const user = await User.create({ username, email, passwordHash });
  startSession(res, user);
  res.status(201).json({ user: user.toPublic(), message: `Welcome to the Hidden Leaf, ${user.username}!` });
}

export async function signin(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    throw ApiError.unauthorized('Incorrect email or password', { code: 'INVALID_CREDENTIALS' });
  }
  startSession(res, user);
  res.json({ user: user.toPublic(), message: `Welcome back, ${user.username}!` });
}

export function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: 'Signed out' });
}

export function me(req, res) {
  res.json({ user: req.user.toPublic() });
}

export async function updateProfile(req, res) {
  const { username, email, preferences } = req.body;
  const user = req.user;
  const notMe = mongoose.trusted({ $ne: user._id }); // operator filter written by us, not user input
  const conflicts = {};
  if (email && email !== user.email && (await User.exists({ email, _id: notMe }))) {
    conflicts.email = 'An account with this email already exists';
  }
  if (
    username &&
    username.toLowerCase() !== user.usernameLower &&
    (await User.exists({ usernameLower: username.toLowerCase(), _id: notMe }))
  ) {
    conflicts.username = 'This username is already taken';
  }
  if (Object.keys(conflicts).length) throw ApiError.validation(conflicts);

  if (username) user.username = username;
  if (email) user.email = email;
  if (preferences && typeof preferences.includeSpecials === 'boolean') {
    user.preferences.includeSpecials = preferences.includeSpecials;
  }
  await user.save();
  res.json({ user: user.toPublic(), message: 'Profile updated' });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.validation({ currentPassword: 'Current password is incorrect' });
  }
  user.passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  user.tokenVersion += 1; // signs out every other session
  await user.save();
  startSession(res, user);
  res.json({ message: 'Password changed. Other sessions have been signed out.' });
}

export async function deleteAccount(req, res) {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.validation({ password: 'Password is incorrect' });
  }
  await Promise.all([
    UserEpisodeProgress.deleteMany({ userId: user._id }),
    EpisodeNote.deleteMany({ userId: user._id }),
  ]);
  await user.deleteOne();
  clearAuthCookie(res);
  res.json({ message: 'Your account and all of its data have been deleted.' });
}
