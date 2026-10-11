/**
 * Integrity checks for the extracted catalog. Used by the extractor, the
 * standalone validate script and the seed script (which refuses to import on errors).
 */
export function validateCatalog(catalog) {
  const errors = [];
  const warnings = [];
  const { series = [], seasons = [], episodes = [] } = catalog;

  const dupes = (list, label) => {
    const seen = new Set();
    for (const item of list) {
      if (seen.has(item.key)) errors.push(`Duplicate ${label} key "${item.key}"`);
      seen.add(item.key);
    }
  };
  dupes(series, 'series');
  dupes(seasons, 'season');
  dupes(episodes, 'episode');

  const seriesByKey = new Map(series.map((s) => [s.key, s]));
  const seasonByKey = new Map(seasons.map((s) => [s.key, s]));

  for (const s of seasons) {
    if (!seriesByKey.has(s.seriesKey)) errors.push(`Season ${s.key} references unknown series ${s.seriesKey}`);
    if (!s.title) errors.push(`Season ${s.key} has no title`);
  }

  const orderSeen = new Set();
  for (const e of episodes) {
    const season = seasonByKey.get(e.seasonKey);
    if (!season) errors.push(`Episode ${e.key} references unknown season ${e.seasonKey}`);
    else if (season.seriesKey !== e.seriesKey) {
      errors.push(`Episode ${e.key} is in series ${e.seriesKey} but season ${e.seasonKey} belongs to ${season.seriesKey}`);
    }
    if (e.kind === 'special' && !e.title) errors.push(`Special ${e.key} has no title`);
    if (e.kind === 'episode' && !Number.isInteger(e.episodeNumber)) errors.push(`Episode ${e.key} has no episode number`);
    if (orderSeen.has(e.orderIndex)) errors.push(`Duplicate orderIndex ${e.orderIndex} (${e.key})`);
    orderSeen.add(e.orderIndex);
  }

  const summaryLines = [];
  for (const s of series) {
    const eps = episodes.filter((e) => e.seriesKey === s.key && e.kind === 'episode');
    const specials = episodes.filter((e) => e.seriesKey === s.key && e.kind === 'special');
    const nums = eps.map((e) => e.episodeNumber);
    const seen = new Set();
    for (const n of nums) {
      if (seen.has(n)) errors.push(`${s.title}: duplicate episode number ${n}`);
      seen.add(n);
    }
    const max = Math.max(0, ...nums);
    const missing = [];
    for (let n = 1; n <= max; n++) if (!seen.has(n)) missing.push(n);
    if (missing.length) errors.push(`${s.title}: missing episode numbers ${missing.join(', ')}`);
    for (let i = 1; i < eps.length; i++) {
      if (eps[i].episodeNumber < eps[i - 1].episodeNumber) {
        warnings.push(`${s.title}: episode ${eps[i].episodeNumber} listed after ${eps[i - 1].episodeNumber}`);
      }
    }
    if (s.statedEpisodeCount != null && s.statedEpisodeCount !== eps.length) {
      errors.push(`${s.title}: PDF states ${s.statedEpisodeCount} episodes, extracted ${eps.length}`);
    }
    const ss = seasons.filter((x) => x.seriesKey === s.key);
    if (s.statedSeasonCount != null && s.statedSeasonCount !== ss.length) {
      errors.push(`${s.title}: PDF states ${s.statedSeasonCount} seasons, extracted ${ss.length}`);
    }
    for (const season of ss) {
      const count = eps.filter((e) => e.seasonKey === season.key).length;
      if (season.statedEpisodeCount != null && season.statedEpisodeCount !== count) {
        errors.push(`${s.title} / ${season.title}: PDF states ${season.statedEpisodeCount} episodes, extracted ${count}`);
      }
    }
    summaryLines.push(`  ${s.title}: ${ss.length} seasons, ${eps.length} episodes, ${specials.length} movies/OVAs/specials`);
  }

  const untitled = episodes.filter((e) => e.kind === 'episode' && !e.title).length;
  if (untitled) {
    warnings.push(`${untitled} episodes have no title in the source PDFs (they list episode-number ranges per arc only); titles are left empty rather than invented`);
  }

  const summary = [
    `Catalog: ${series.length} series, ${seasons.length} seasons, ${episodes.length} entries`,
    ...summaryLines,
    `Validation: ${errors.length} error(s), ${warnings.length} warning(s)`,
  ].join('\n');
  return { errors, warnings, summary };
}
