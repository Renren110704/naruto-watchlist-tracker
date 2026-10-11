import { api } from './api'

const data = (p) => p.then((r) => r.data)

export const authApi = {
  me: () => data(api.get('/auth/me', { skipAuthRedirect: true })),
  signup: (body) => data(api.post('/auth/signup', body, { skipAuthRedirect: true })),
  signin: (body) => data(api.post('/auth/signin', body, { skipAuthRedirect: true })),
  logout: () => data(api.post('/auth/logout')),
  updateProfile: (body) => data(api.patch('/auth/me', body)),
  changePassword: (body) => data(api.patch('/auth/password', body)),
  deleteAccount: (password) => data(api.delete('/auth/me', { data: { password } })),
}

export const catalogApi = {
  series: () => data(api.get('/series')),
  seasons: (params) => data(api.get('/seasons', { params })),
  season: (id) => data(api.get(`/seasons/${id}`)),
  seasonEpisodes: (id, params) => data(api.get(`/seasons/${id}/episodes`, { params })),
  episodes: (params) => data(api.get('/episodes', { params })),
  episode: (id) => data(api.get(`/episodes/${id}`)),
}

export const progressApi = {
  stats: () => data(api.get('/progress/stats')),
  list: (params) => data(api.get('/progress', { params })),
  setWatched: (episodeId, watched) => data(api.patch(`/progress/${episodeId}`, { watched })),
  setSeasonWatched: (seasonId, watched, includeSpecials = true) =>
    data(api.patch(`/progress/seasons/${seasonId}`, { watched, includeSpecials })),
}

export const notesApi = {
  list: (params) => data(api.get('/notes', { params })),
  get: (episodeId) => data(api.get(`/episodes/${episodeId}/notes`)),
  create: (episodeId, body) => data(api.post(`/episodes/${episodeId}/notes`, body)),
  update: (episodeId, body) => data(api.put(`/episodes/${episodeId}/notes`, body)),
  remove: (episodeId) => data(api.delete(`/episodes/${episodeId}/notes`)),
}
