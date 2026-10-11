import { Router } from 'express';
import { body, query } from 'express-validator';
import * as catalog from '../controllers/catalogController.js';
import * as progress from '../controllers/progressController.js';
import * as notes from '../controllers/notesController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { episodeIdParam, listQuery, noteBody, seasonIdParam } from './validators.js';

const router = Router();
router.use(requireAuth);

// Catalog (read-only, merged with the caller's own progress)
router.get('/series', catalog.listSeries);
router.get('/seasons', validate([query('series').optional().matches(/^[a-z0-9-]+$/)]), catalog.listSeasons);
router.get('/seasons/:seasonId', validate([seasonIdParam]), catalog.getSeason);
router.get('/seasons/:seasonId/episodes', validate([seasonIdParam, ...listQuery]), catalog.listSeasonEpisodes);
router.get('/episodes', validate(listQuery), catalog.listEpisodes);
router.get('/episodes/:episodeId', validate([episodeIdParam]), catalog.getEpisode);

// Watch progress
router.get('/progress/stats', progress.getStats);
router.get(
  '/progress',
  validate([...listQuery, query('sort').optional().isIn(['order', 'recent'])]),
  progress.listProgress,
);
router.patch(
  '/progress/seasons/:seasonId',
  validate([
    seasonIdParam,
    body('watched').isBoolean({ strict: true }).withMessage('watched must be true or false'),
    body('includeSpecials').optional().isBoolean({ strict: true }),
  ]),
  progress.updateSeasonProgress,
);
router.patch(
  '/progress/:episodeId',
  validate([episodeIdParam, body('watched').isBoolean({ strict: true }).withMessage('watched must be true or false')]),
  progress.updateEpisodeProgress,
);

// Episode notes (always scoped to req.user)
router.get('/notes', validate([...listQuery, query('sort').optional().isIn(['updated', 'order', 'rating'])]), notes.listNotes);
router.get('/episodes/:episodeId/notes', validate([episodeIdParam]), notes.getEpisodeNote);
router.post('/episodes/:episodeId/notes', validate([episodeIdParam, ...noteBody]), notes.createEpisodeNote);
router.put('/episodes/:episodeId/notes', validate([episodeIdParam, ...noteBody]), notes.updateEpisodeNote);
router.delete('/episodes/:episodeId/notes', validate([episodeIdParam]), notes.deleteEpisodeNote);

export default router;
