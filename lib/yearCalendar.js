'use strict';

const Hebcal = require('hebcal');
const moment = require('moment');
const mishnah = require('../index');

const REGULAR_PARSHIOT = new Set(Hebcal.parshiot.map((parsha) => parsha[2]));

const IMPORTANT_HOLIDAYS = [
  'ראש השנה', 'צום גדליה', 'יום כיפור', 'סוכות', 'הושענא רבה',
  'שמיני עצרת', 'שמחת תורה', 'חנוכה', 'עשרה בטבת', 'ט״ו בשבט',
  'ט"ו בשבט', 'תענית אסתר', 'פורים', 'פסח', 'יום השואה',
  'יום הזכרון', 'יום העצמאות', 'ל״ג בעומר', 'ל"ג בעומר',
  'יום ירושלים', 'שבועות', 'י״ז בתמוז', 'י"ז בתמוז',
  'תשעה באב', 'ט״ו באב', 'ט"ו באב', 'ראש חודש'
];

function validateYear(year) {
  const parsed = Number(year);
  if (!Number.isInteger(parsed) || parsed < 5000 || parsed > 7000) {
    throw new Error('Jewish year must be an integer between 5000 and 7000.');
  }
  return parsed;
}

function startOfSundayWeek(date) {
  return moment(date).startOf('day').subtract(moment(date).day(), 'days');
}

function getCalendarRange(year, options) {
  year = validateYear(year);
  options = options || {};
  const roshHashana = moment(new Hebcal.HDate(1, 7, year).greg()).startOf('day');
  const start = startOfSundayWeek(roshHashana).subtract(7, 'days');

  // Finish the complete week containing Simchat Torah (diaspora) or Shemini
  // Atzeret/Simchat Torah (Israel), so the final table row is never partial.
  const lastFestivalDay = options.israel ? 22 : 23;
  const sukkotEnd = moment(new Hebcal.HDate(lastFestivalDay, 7, year + 1).greg()).startOf('day');
  const end = sukkotEnd.clone().add(6 - sukkotEnd.day(), 'days');
  return { start, end };
}

function formatMishnahRange(range) {
  const first = range[0];
  const last = range[range.length - 1];
  if (first.t !== last.t || first.p !== last.p) {
    return `${first.p}:${first.m}–${last.p}:${last.m}`;
  }
  return `${first.p}:${first.m}–${last.m}`;
}

function normalizeHoliday(label) {
  if (label.includes('ראש השנה')) return 'ראש השנה';
  if (label.includes('סוכות')) return 'סוכות';
  if (label.includes('הושנע רבה') || label.includes('הושענא רבה')) return 'הושענא רבה';
  if (label.includes('חנוכה')) return 'חנוכה';
  if (label.includes('פסח')) return 'פסח';
  if (label.includes('שבועות')) return 'שבועות';
  if (label.includes('ראש חודש')) return 'ראש חודש';
  return label;
}

function holidaysForDate(date, israel) {
  const hdate = new Hebcal.HDate(date.toDate());
  return hdate.holidays(true)
    .filter((event) => (israel ? !event.CHUL_ONLY : !event.IL_ONLY))
    .map((event) => event.getDesc('h'))
    .filter((label) => !label.startsWith('ערב ') && IMPORTANT_HOLIDAYS.some((holiday) => label.includes(holiday)))
    .map(normalizeHoliday);
}

function unique(values) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function buildYearCalendar(year, options) {
  year = validateYear(year);
  options = options || {};
  const israel = Boolean(options.israel);
  const range = getCalendarRange(year, { israel });
  const weeks = [];
  let previousTractate = null;

  for (let weekStart = range.start.clone(); weekStart.isSameOrBefore(range.end, 'day'); weekStart.add(7, 'days')) {
    const days = [];
    const tractates = [];

    for (let offset = 0; offset < 7; offset++) {
      const date = weekStart.clone().add(offset, 'days');
      const study = mishnah.getToday(date);
      unique(study.map((item) => item.t)).forEach((tractate) => {
        if (tractate !== previousTractate) {
          tractates.push(mishnah.names[tractate]);
          previousTractate = tractate;
        }
      });
      days.push({ date: date.toDate(), study, learning: formatMishnahRange(study) });
    }

    const shabbat = new Hebcal.HDate(days[6].date);
    if (israel) shabbat.setCity('Jerusalem');
    const sedra = shabbat.getSedra('h');
    const hasRegularParsha = sedra.length > 0 && sedra.every((name) => REGULAR_PARSHIOT.has(name));
    const shabbatHolidays = holidaysForDate(moment(days[6].date), israel);
    const note = hasRegularParsha
      ? sedra.join('–')
      : (shabbatHolidays[0] || normalizeHoliday(sedra.join('–')));
    weeks.push({
      start: days[0].date,
      end: days[6].date,
      days,
      tractates,
      activeTractate: mishnah.names[days[0].study[0].t],
      note
    });
  }

  return {
    year,
    hebrewYear: Hebcal.gematriya(year),
    start: range.start.toDate(),
    end: range.end.toDate(),
    weeks
  };
}

function getDefaultJewishYear(now) {
  const today = new Hebcal.HDate(now || new Date());
  return today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() + 1;
}

module.exports = {
  buildYearCalendar,
  formatMishnahRange,
  getCalendarRange,
  getDefaultJewishYear,
  validateYear
};
