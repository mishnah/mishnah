'use strict';

const moment = require('moment');
const Hebcal = require('hebcal');
const { getCalendarRange, weeklyNoteForDate, validateYear } = require('./yearCalendar');

const MONTH_NAMES = {
  1: 'Nisan',
  2: 'Iyar',
  3: 'Sivan',
  4: 'Tammuz',
  5: 'Av',
  6: 'Elul',
  7: 'Tishrei',
  8: 'Cheshvan',
  9: 'Kislev',
  10: 'Tevet',
  11: 'Shevat'
};

let learningModules;

async function getLearningModules() {
  if (!learningModules) {
    learningModules = Promise.all([
      import('@hebcal/hdate'),
      import('@hebcal/learning/kitzurShulchanAruchBase')
    ]).then(([hdate, learning]) => ({
      HDate: hdate.HDate,
      months: hdate.months,
      kitzurShulchanAruch: learning.kitzurShulchanAruch
    }));
  }
  return learningModules;
}

function validateLeapOption(value) {
  const option = String(value || 'both').toUpperCase();
  if (!['A', 'B', 'BOTH'].includes(option)) {
    throw new Error('Leap option must be A, B, or both.');
  }
  return option === 'BOTH' ? 'both' : option;
}

function monthName(hdate, months) {
  const month = hdate.getMonth();
  if (month === months.ADAR_I) return hdate.isLeapYear() ? 'Adar I' : 'Adar';
  if (month === months.ADAR_II) return 'Adar II';
  return MONTH_NAMES[month] || hdate.getMonthName();
}

function correctedReading(hdate, option, reading, months) {
  if (!reading) return undefined;
  const day = hdate.getDate();
  const month = hdate.getMonth();

  // Corrections to unambiguous transcription/parsing errors in the upstream
  // lookup table, verified against the published Kitzur Yomi schedules.
  if (month === months.TISHREI && day === 3) return { b: '133:27', e: '134:1' };
  if (month === months.TISHREI && day === 18) return { b: '98:23', e: '98:32' };
  if (month === months.TISHREI && day === 20) return { b: '99:3', e: '100:4' };
  if (month === months.CHESHVAN && day === 1) return { b: '5:17', e: '6:3' };
  if (month === months.IYYAR && day === 2) return { b: '80:27', e: '80:35' };
  if (month === months.AV && day === 5) return { b: '123:3', e: '124:3' };
  if (month === months.ADAR_II && option === 'A' && day === 25) return { b: '54', e: '56' };
  if (month === months.ADAR_II && option === 'B' && day === 9) return { b: '17:8', e: '18:2' };
  if (month === months.ADAR_II && option === 'B' && day === 27) return { b: '55:2', e: '56:4' };
  return reading;
}

function formatReading(reading) {
  if (!reading) return '';
  const beginLabel = reading.b.replace(/(^|:)E$/, '$1End');
  if (!reading.e) return beginLabel;
  const endLabel = reading.e.replace(/(^|:)E$/, '$1End');
  const begin = reading.b.split(':');
  const end = reading.e.split(':');
  if (begin.length === 2 && end.length === 2 && begin[0] === end[0]) {
    return `${beginLabel}–${endLabel.split(':')[1]}`;
  }
  return `${beginLabel}–${endLabel}`;
}

async function readingForDate(date, leapOption) {
  const { HDate, months, kitzurShulchanAruch } = await getLearningModules();
  const hdate = date instanceof HDate ? date : new HDate(moment(date).hour(12).toDate());
  const inAdarII = hdate.isLeapYear() && hdate.getMonth() === months.ADAR_II;
  const option = validateLeapOption(leapOption);
  const readingA = correctedReading(hdate, 'A', kitzurShulchanAruch(hdate, 'A'), months);
  const readingB = inAdarII
    ? correctedReading(hdate, 'B', kitzurShulchanAruch(hdate, 'B'), months)
    : undefined;
  const includeA = option === 'both' || option === 'A';
  const includeB = inAdarII && (option === 'both' || option === 'B');
  return {
    hdate,
    inAdarII,
    primary: includeA ? formatReading(readingA) : formatReading(readingB),
    optionA: includeA ? formatReading(readingA) : '',
    optionB: includeB ? formatReading(readingB) : ''
  };
}

async function buildKitzurYearCalendar(year, options) {
  year = validateYear(year);
  options = options || {};
  const israel = Boolean(options.israel);
  const leapOption = validateLeapOption(options.leapOption);
  const { months } = await getLearningModules();
  const range = getCalendarRange(year, { israel });
  const weeks = [];
  let previousMonth;

  for (let weekStart = range.start.clone(); weekStart.isSameOrBefore(range.end, 'day'); weekStart.add(7, 'days')) {
    const days = [];
    const changedMonths = [];
    for (let offset = 0; offset < 7; offset++) {
      const date = weekStart.clone().add(offset, 'days');
      const reading = await readingForDate(date, leapOption);
      const currentMonth = monthName(reading.hdate, months);
      if (currentMonth !== previousMonth) {
        changedMonths.push(currentMonth);
        previousMonth = currentMonth;
      }
      days.push({
        date: date.toDate(),
        month: currentMonth,
        reading: reading.primary,
        optionA: reading.optionA,
        optionB: reading.optionB,
        inAdarII: reading.inAdarII,
        learning: reading.inAdarII && leapOption === 'both'
          ? `A ${reading.optionA}\nB ${reading.optionB}`
          : reading.primary
      });
    }
    weeks.push({
      start: days[0].date,
      end: days[6].date,
      days,
      months: changedMonths,
      activeMonth: days[0].month,
      note: weeklyNoteForDate(days[6].date, israel)
    });
  }

  return {
    year,
    hebrewYear: Hebcal.gematriya(year),
    start: range.start.toDate(),
    end: range.end.toDate(),
    weeks,
    leapOption,
    hasLeapTracks: weeks.some((week) => week.days.some((day) => day.inAdarII))
  };
}

module.exports = {
  buildKitzurYearCalendar,
  correctedReading,
  formatReading,
  readingForDate,
  validateLeapOption
};
