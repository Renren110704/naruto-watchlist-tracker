/**
 * Extracts the season / episode catalog from the source PDFs into data/catalog.json.
 *
 * The PDFs are checklist exports with this visual hierarchy (font size in pt):
 *   26  Series heading        e.g. "Naruto (0/220)"
 *   20  Season heading        e.g. "Season 1: 1st Stage (0/35)" or "List 1 (0/52)"
 *   16  Arc heading           e.g. "Land of Waves Escort"
 *   11  Bullet metadata (preceded by "●"): air dates, "N Episodes"
 *   11  Checklist items: an episode number, or a movie / OVA / special title
 *
 * Within an arc, consecutive episode numbers come in pairs that denote an inclusive
 * range (e.g. "6", "12" = episodes 6..12). A lone number is a single episode.
 * Movies / OVAs are listed between ranges in the recommended watch order.
 *
 * Usage: node scripts/extract-catalog.js [pdfDir] [outFile]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { validateCatalog } from '../services/catalogValidation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfDir = path.resolve(process.argv[2] || path.join(__dirname, '../../docs/source-pdfs'));
const outFile = path.resolve(process.argv[3] || path.join(__dirname, '../data/catalog.json'));

// Series order follows the franchise chronology; each file is one series.
const SOURCES = [
  { key: 'naruto', file: 'Naruto (0_220).pdf' },
  { key: 'shippuden', file: 'Naruto_ Shippuden (0_500).pdf' },
  { key: 'boruto', file: 'Boruto_ Naruto Next Generations (0_293).pdf' },
];

const SIZE = { series: 26, season: 20, arc: 16, body: 11 };

async function readLines(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await getDocument({ data, verbosity: 0 }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    for (const it of items) {
      if (!it.str.trim()) continue;
      const size = Math.round(it.transform[3]);
      const x = Math.round(it.transform[4]);
      const y = it.transform[5];
      const prev = lines[lines.length - 1];
      // Text runs on the same baseline belong to the same visual line.
      if (prev && prev.page === p && Math.abs(prev.y - y) < 1 && prev.size === size) {
        prev.text += it.str;
        continue;
      }
      lines.push({ page: p, text: it.str, size, x, y });
    }
  }
  return lines.map((l) => ({ ...l, text: l.text.replace(/\s+/g, ' ').trim() }));
}

function classifySpecial(title) {
  if (/\(OVA\)/i.test(title)) return 'ova';
  if (/movie/i.test(title)) return 'movie';
  return 'special';
}

const parseDates = (s) => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4}) - (\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? { start: `${m[3]}-${m[1]}-${m[2]}`, end: `${m[6]}-${m[4]}-${m[5]}` } : null;
};

function parseSeries(lines, source, counters, warnings) {
  const series = { key: source.key, sourceFile: source.file };
  const seasons = [];
  const episodes = [];
  let season = null;
  let arc = null;
  let numberRun = []; // pending episode numbers in the current arc segment
  let pendingBullet = false; // the next text is bullet metadata, not a checklist item

  const flushNumbers = () => {
    if (!numberRun.length) return;
    if (!season) throw new Error(`${source.file}: episode numbers before any season`);
    const ranges = [];
    for (let i = 0; i < numberRun.length; i += 2) {
      const start = numberRun[i];
      const end = numberRun[i + 1] ?? start;
      if (end < start) warnings.push(`${source.file}: descending range ${start}-${end} in "${arc}"`);
      ranges.push([start, end]);
    }
    if (numberRun.length > 2) {
      warnings.push(`${source.file}: ${numberRun.length} consecutive numbers in "${arc}" read as pairs`);
    }
    for (const [start, end] of ranges) {
      for (let n = start; n <= end; n++) {
        episodes.push({
          key: `${source.key}-e${String(n).padStart(3, '0')}`,
          seriesKey: source.key,
          seasonKey: season.key,
          kind: 'episode',
          episodeNumber: n,
          title: null,
          arc,
          orderIndex: counters.order++,
        });
      }
    }
    numberRun = [];
  };

  for (const line of lines) {
    const { size } = line;
    let { text } = line;
    if (text.startsWith('●')) {
      text = text.slice(1).trim();
      pendingBullet = true;
      if (!text) continue;
    }
    if (pendingBullet) {
      pendingBullet = false;
      const target = season || series;
      const dates = parseDates(text);
      if (dates) target.airDates = dates;
      else {
        const counts = text.match(/^(?:(\d+) Seasons \/ )?(\d+) Episodes$/);
        if (counts) {
          if (counts[1]) target.statedSeasonCount = Number(counts[1]);
          target.statedEpisodeCount = Number(counts[2]);
        } else warnings.push(`${source.file}: unrecognised bullet "${text}"`);
      }
      continue;
    }
    if (size === SIZE.series) {
      // Long series headings wrap onto a second line, e.g. "Boruto: ..." / "(0/293)".
      const heading = [series.title, text].filter(Boolean).join(' ');
      series.title = heading.replace(/\s*\(\d+\/\d+\)$/, '').trim();
      continue;
    }
    if (size === SIZE.season) {
      flushNumbers();
      arc = null;
      const m = text.match(/^(.*?) \((\d+)\/(\d+)\)$/);
      const title = m ? m[1] : text;
      const num = title.match(/^(?:Season|List) (\d+)/);
      if (!num) warnings.push(`${source.file}: season heading without a number "${text}"`);
      const seasonNumber = num ? Number(num[1]) : seasons.length + 1;
      const sub = title.match(/^(?:Season|List) \d+: (.+)$/);
      season = {
        key: `${source.key}-s${String(seasonNumber).padStart(2, '0')}`,
        seriesKey: source.key,
        seasonNumber,
        title,
        subtitle: sub ? sub[1] : null,
        orderIndex: counters.season++,
      };
      seasons.push(season);
      continue;
    }
    if (size === SIZE.arc) {
      flushNumbers();
      arc = text;
      continue;
    }
    if (size === SIZE.body) {
      if (/^\d+$/.test(text)) {
        numberRun.push(Number(text));
        continue;
      }
      // A movie / OVA / special checklist item, placed in watch order.
      flushNumbers();
      if (!season) throw new Error(`${source.file}: special "${text}" before any season`);
      const n = episodes.filter((e) => e.kind === 'special' && e.seasonKey === season.key).length + 1;
      episodes.push({
        key: `${season.key}-sp${n}`,
        seriesKey: source.key,
        seasonKey: season.key,
        kind: 'special',
        specialType: classifySpecial(text),
        episodeNumber: null,
        title: text,
        // Specials sit between arc ranges in watch order but are not part of an arc.
        arc: null,
        orderIndex: counters.order++,
      });
      continue;
    }
    warnings.push(`${source.file}: ignored line (size ${size}) "${text}"`);
  }
  flushNumbers();
  return { series, seasons, episodes };
}

async function main() {
  const counters = { order: 1, season: 1 };
  const warnings = [];
  const catalog = { generatedAt: new Date().toISOString(), series: [], seasons: [], episodes: [] };

  for (const [i, source] of SOURCES.entries()) {
    const file = path.join(pdfDir, source.file);
    if (!fs.existsSync(file)) throw new Error(`Missing source PDF: ${file}`);
    const lines = await readLines(file);
    const { series, seasons, episodes } = parseSeries(lines, source, counters, warnings);
    catalog.series.push({ ...series, orderIndex: i + 1 });
    catalog.seasons.push(...seasons);
    catalog.episodes.push(...episodes);
  }

  const report = validateCatalog(catalog);
  report.warnings.unshift(...warnings);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(catalog, null, 2) + '\n');

  console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
  console.log(report.summary);
  for (const w of report.warnings) console.warn(`WARN  ${w}`);
  for (const e of report.errors) console.error(`ERROR ${e}`);
  if (report.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
