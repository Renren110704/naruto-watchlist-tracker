import { body, param, query } from 'express-validator';
import { CHARACTER_STATUSES, JUTSU_STATUSES } from '../models/EpisodeNote.js';

const KEY = /^[a-z0-9-]{1,40}$/;

export const seasonIdParam = param('seasonId').matches(KEY).withMessage('Invalid season id');
export const episodeIdParam = param('episodeId').matches(KEY).withMessage('Invalid episode id');

export const listQuery = [
  query('status').optional().isIn(['all', 'watched', 'unwatched']).withMessage('status must be all, watched or unwatched'),
  query('kind').optional().isIn(['all', 'episode', 'special']).withMessage('kind must be all, episode or special'),
  query('q').optional().isString().trim().isLength({ max: 100 }).withMessage('Search is too long'),
  query('series').optional().matches(KEY).withMessage('Invalid series id'),
  query('season').optional().matches(KEY).withMessage('Invalid season id'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be 1–200').toInt(),
];

const text = (field, max = 5000) =>
  body(field).optional({ values: 'null' }).isString().withMessage('Must be text').trim()
    .isLength({ max }).withMessage(`Must be at most ${max} characters`);

export const noteBody = [
  ...['summary', 'importantEvents', 'favoriteScene', 'personalNotes', 'newAbilities', 'lore', 'relationships', 'openQuestions']
    .map((f) => text(f)),
  body('rating').optional({ values: 'null' }).isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5 stars').toInt(),

  body('characters').optional().isArray({ max: 50 }).withMessage('Up to 50 characters per episode'),
  body('characters.*.name').isString().withMessage('Character name is required').trim()
    .notEmpty().withMessage('Character name is required').isLength({ max: 100 }).withMessage('Name is too long'),
  body('characters.*.status').optional().isIn(CHARACTER_STATUSES).withMessage('Invalid character type'),
  text('characters.*.affiliation', 100),
  text('characters.*.description', 2000),

  body('jutsu').optional().isArray({ max: 50 }).withMessage('Up to 50 jutsu per episode'),
  body('jutsu.*.name').isString().withMessage('Jutsu name is required').trim()
    .notEmpty().withMessage('Jutsu name is required').isLength({ max: 120 }).withMessage('Name is too long'),
  body('jutsu.*.status').optional().isIn(JUTSU_STATUSES).withMessage('Invalid jutsu type'),
  text('jutsu.*.category', 100),
  text('jutsu.*.usedBy', 100),
  text('jutsu.*.description', 2000),
];
