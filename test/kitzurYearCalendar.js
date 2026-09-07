'use strict';

const assert = require('assert');
const moment = require('moment');
const { buildKitzurYearCalendar, readingForDate } = require('../lib/kitzurYearCalendar');

(async () => {
  const { HDate, months } = await import('@hebcal/hdate');

  const ordinary = await buildKitzurYearCalendar(5786);
  assert.strictEqual(ordinary.weeks.length, 56);
  assert.strictEqual(ordinary.hasLeapTracks, false);
  assert.ok(ordinary.weeks.flatMap((week) => week.days).every((day) => !day.optionB));

  const leap = await buildKitzurYearCalendar(5787);
  assert.strictEqual(leap.weeks.length, 61);
  assert.strictEqual(leap.hasLeapTracks, true);
  assert.strictEqual(moment(leap.start).format('YYYY-MM-DD'), '2026-08-30');
  assert.strictEqual(moment(leap.end).format('YYYY-MM-DD'), '2027-10-30');

  const first = await readingForDate(new HDate(1, months.TISHREI, 5787), 'both');
  assert.strictEqual(first.primary, '133:17–21');

  const correctedTishrei = await readingForDate(new HDate(3, months.TISHREI, 5787), 'both');
  assert.strictEqual(correctedTishrei.primary, '133:27–134:1');

  const completeTishrei = await readingForDate(new HDate(20, months.TISHREI, 5787), 'both');
  assert.strictEqual(completeTishrei.primary, '99:3–100:4');

  const longCheshvan = await readingForDate(new HDate(30, months.CHESHVAN, 5787), 'both');
  assert.strictEqual(longCheshvan.primary, '');

  const endAdarI = await readingForDate(new HDate(30, months.ADAR_I, 5787), 'both');
  assert.strictEqual(endAdarI.primary, '');

  const adarII = await readingForDate(new HDate(1, months.ADAR_II, 5787), 'both');
  assert.strictEqual(adarII.optionA, '1–4');
  assert.strictEqual(adarII.optionB, '6:1–4');

  const correctedLeapA = await readingForDate(new HDate(25, months.ADAR_II, 5787), 'both');
  assert.strictEqual(correctedLeapA.optionA, '54–56');

  const correctedLeapB = await readingForDate(new HDate(9, months.ADAR_II, 5787), 'both');
  assert.strictEqual(correctedLeapB.optionB, '17:8–18:2');

  const endLabel = await readingForDate(new HDate(9, months.TISHREI, 5787), 'both');
  assert.strictEqual(endLabel.primary, '135:13–End');

  const adarDay = leap.weeks.flatMap((week) => week.days).find((day) => {
    const hdate = new HDate(moment(day.date).hour(12).toDate());
    return hdate.getMonth() === months.ADAR_II && hdate.getDate() === 1;
  });
  assert.strictEqual(adarDay.learning, 'A 1–4\nB 6:1–4');

  console.log('kitzurYearCalendar tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
