'use strict';

const assert = require('assert');
const moment = require('moment');
const { buildYearCalendar, getCalendarRange } = require('../lib/yearCalendar');

const range = getCalendarRange(5786);
assert.strictEqual(range.start.format('YYYY-MM-DD'), '2025-09-14');
assert.strictEqual(range.end.format('YYYY-MM-DD'), '2026-10-10');

const calendar = buildYearCalendar(5786);
assert.strictEqual(calendar.weeks.length, 56);
assert.strictEqual(calendar.weeks[0].days.length, 7);
assert.strictEqual(calendar.weeks.at(-1).days.length, 7);
assert.strictEqual(calendar.weeks[0].note, 'נצבים');
assert.strictEqual(calendar.weeks[1].note, 'וילך');
assert.strictEqual(calendar.weeks[2].note, 'האזינו');
assert.strictEqual(calendar.weeks[3].note, 'סוכות');

const dates = calendar.weeks.flatMap((week) => week.days.map((day) => moment(day.date)));
assert.strictEqual(dates.length, 392);
dates.slice(1).forEach((date, index) => {
  assert.strictEqual(date.diff(dates[index], 'days'), 1, 'calendar dates must be continuous');
});

console.log('yearCalendar tests passed');
