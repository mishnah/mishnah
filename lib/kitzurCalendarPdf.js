'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PAGE_WIDTH = 1728;
const PAGE_HEIGHT = 2592;
const BURGUNDY = '#6d1a24';
const BURGUNDY_DARK = '#501019';
const GOLD = '#ce9854';
const GOLD_LIGHT = '#f2dfc5';
const GRID = '#cfbfba';
const PALE = '#f6efed';
const PAPER = '#fffdfb';
const INK = '#33292b';
const DAYS = [
  ['Sun', 'א׳'], ['Mon', 'ב׳'], ['Tue', 'ג׳'], ['Wed', 'ד׳'],
  ['Thurs', 'ה׳'], ['Fri', 'ו׳'], ['Shabbat', 'שבת']
];

const ASSET_DIR = path.join(__dirname, '..', 'assets');
const LOGO = path.join(ASSET_DIR, 'kitzur-logo.png');
const SHOFAR = path.join(ASSET_DIR, 'ShofarRegular.ttf');
const MONTSERRAT_REGULAR = require.resolve('@fontsource/montserrat/files/montserrat-latin-400-normal.woff');
const MONTSERRAT_MEDIUM = require.resolve('@fontsource/montserrat/files/montserrat-latin-500-normal.woff');
const MONTSERRAT_SEMIBOLD = require.resolve('@fontsource/montserrat/files/montserrat-latin-600-normal.woff');

function containsHebrew(text) {
  return /[\u0590-\u05ff]/.test(text);
}

function hebrewLines(doc, text, width) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const space = doc.widthOfString(' ');
  const lines = [];
  let line = [];
  let lineWidth = 0;
  words.forEach((word) => {
    const wordWidth = doc.widthOfString(word);
    const nextWidth = lineWidth + (line.length ? space : 0) + wordWidth;
    if (line.length && nextWidth > width) {
      lines.push({ words: line, width: lineWidth });
      line = [word];
      lineWidth = wordWidth;
    } else {
      line.push(word);
      lineWidth = nextWidth;
    }
  });
  if (line.length) lines.push({ words: line, width: lineWidth });
  return lines;
}

function fitHebrewText(doc, text, x, y, width, height, config) {
  let size = config.size;
  let lines;
  let lineHeight;
  doc.font(config.font);
  while (size > config.minSize) {
    doc.fontSize(size);
    lines = hebrewLines(doc, text, width);
    lineHeight = doc.currentLineHeight(true);
    if (lines.length * lineHeight <= height) break;
    size--;
  }
  doc.fontSize(size);
  lines = hebrewLines(doc, text, width);
  lineHeight = doc.currentLineHeight(true);
  let lineY = y + Math.max(0, (height - lines.length * lineHeight) / 2) + (config.yOffset || 0);
  doc.fillColor(config.color);
  lines.forEach((line) => {
    const space = doc.widthOfString(' ');
    let right = config.align === 'right' ? x + width : x + (width + line.width) / 2;
    line.words.forEach((word) => {
      const wordWidth = doc.widthOfString(word);
      doc.text(word, right - wordWidth, lineY, { lineBreak: false });
      right -= wordWidth + space;
    });
    lineY += lineHeight;
  });
}

function fitText(doc, text, x, y, width, height, options) {
  const config = Object.assign(
    { font: 'Montserrat', size: 16, minSize: 8, align: 'center', color: INK },
    options || {}
  );
  if (!text) return;
  if (containsHebrew(text)) return fitHebrewText(doc, text, x, y, width, height, config);
  let size = config.size;
  doc.font(config.font);
  while (size > config.minSize) {
    doc.fontSize(size);
    if (doc.heightOfString(text, { width, align: config.align }) <= height) break;
    size--;
  }
  doc.fontSize(size);
  const textHeight = doc.heightOfString(text, { width, align: config.align });
  doc.fillColor(config.color).text(text, x, y + Math.max(0, (height - textHeight) / 2), {
    width, height, align: config.align, ellipsis: true, lineGap: 0
  });
}

function drawHeader(doc, calendar) {
  doc.image(LOGO, 115, 42, { fit: [390, 305], align: 'center', valign: 'center' });
  doc.save().lineWidth(4).strokeColor(GOLD).moveTo(610, 65).lineTo(610, 330).stroke().restore();
  fitText(doc, 'לוח קיצור שולחן ערוך יומי', 640, 68, 1025, 118, {
    font: 'Shofar', size: 101, minSize: 78, color: BURGUNDY_DARK
  });
  doc.font('MontserratMedium').fontSize(30).fillColor(BURGUNDY)
    .text('KITZUR SHULCHAN ARUCH YOMI CALENDAR', 665, 187, {
      width: 990, align: 'center', characterSpacing: 4
    });
  doc.save().strokeColor(GOLD).lineWidth(3);
  doc.moveTo(750, 302).lineTo(920, 302).stroke();
  doc.moveTo(1365, 302).lineTo(1580, 302).stroke();
  doc.restore();
  fitText(doc, calendar.hebrewYear, 945, 267, 180, 70, {
    font: 'Shofar', size: 44, minSize: 34, color: BURGUNDY, yOffset: -3
  });
  doc.roundedRect(1140, 269, 205, 66, 30).fill(GOLD);
  fitText(doc, String(calendar.year), 1140, 269, 205, 66, {
    font: 'MontserratMedium', size: 34, minSize: 29, color: '#ffffff'
  });
}

function drawTable(doc, weeks, x, y, width, height) {
  const monthWidth = 106;
  const noteWidth = 124;
  const dayWidth = (width - monthWidth - noteWidth) / 7;
  const headerHeight = 82;
  const rowHeight = (height - headerHeight) / weeks.length;

  doc.save();
  doc.roundedRect(x, y, width, height, 15).clip();
  doc.rect(x, y, width, height).fill(PAPER);
  doc.rect(x, y, width, headerHeight).fill(BURGUNDY);
  doc.rect(x, y + headerHeight, monthWidth, height - headerHeight).fill(PALE);
  doc.rect(x + width - noteWidth, y + headerHeight, noteWidth, height - headerHeight).fill(GOLD_LIGHT);
  weeks.forEach((week, row) => {
    if (row % 2 === 1) {
      doc.fillOpacity(0.3)
        .rect(x + monthWidth, y + headerHeight + row * rowHeight, width - monthWidth - noteWidth, rowHeight)
        .fill(PALE).fillOpacity(1);
    }
  });
  doc.strokeColor(GRID).lineWidth(1);
  doc.moveTo(x + monthWidth, y).lineTo(x + monthWidth, y + height).stroke();
  for (let column = 1; column < 7; column++) {
    const gridX = x + monthWidth + column * dayWidth;
    doc.moveTo(gridX, y).lineTo(gridX, y + height).stroke();
  }
  doc.moveTo(x + width - noteWidth, y).lineTo(x + width - noteWidth, y + height).stroke();
  for (let row = 0; row <= weeks.length; row++) {
    const gridY = y + headerHeight + row * rowHeight;
    doc.moveTo(x, gridY).lineTo(x + width, gridY).stroke();
  }
  doc.restore();

  DAYS.forEach((day, index) => {
    const dayX = x + monthWidth + index * dayWidth;
    fitText(doc, day[0], dayX + 3, y + 10, dayWidth - 6, 31, {
      font: 'MontserratSemibold', size: 18, minSize: 13, color: '#ffffff'
    });
    fitText(doc, day[1], dayX + 3, y + 43, dayWidth - 6, 27, {
      font: 'Shofar', size: 21, minSize: 14, color: '#ffffff'
    });
  });

  weeks.forEach((week, row) => {
    const rowY = y + headerHeight + row * rowHeight;
    const monthLabel = week.months.length ? week.months.join(' / ') : (row === 0 ? week.activeMonth : '');
    fitText(doc, monthLabel, x + 4, rowY + 2, monthWidth - 8, rowHeight - 4, {
      font: 'MontserratSemibold', size: 14, minSize: 8, color: BURGUNDY_DARK
    });
    week.days.forEach((day, index) => {
      const cellX = x + monthWidth + index * dayWidth;
      if (!day.learning) {
        doc.fillColor('#e4dcda').rect(cellX + 1, rowY + 1, dayWidth - 2, rowHeight - 2).fill();
      } else {
        fitText(doc, day.learning, cellX + 2, rowY + 2, dayWidth - 4, rowHeight - 4, {
          font: day.inAdarII && day.optionB ? 'MontserratMedium' : 'Montserrat',
          size: day.inAdarII && day.optionB ? 12 : 15,
          minSize: 7,
          color: INK
        });
      }
    });
    fitText(doc, week.note, x + width - noteWidth + 5, rowY + 2, noteWidth - 10, rowHeight - 4, {
      font: 'Shofar', size: 17, minSize: 10, color: BURGUNDY_DARK
    });
  });
  doc.save().roundedRect(x, y, width, height, 15).lineWidth(2).strokeColor(BURGUNDY).stroke().restore();
}

function drawFooter(doc, calendar) {
  const top = PAGE_HEIGHT - 250;
  if (calendar.hasLeapTracks && calendar.leapOption === 'both') {
    doc.font('MontserratMedium').fontSize(16).fillColor(BURGUNDY)
      .text('ADAR II   A: Hilchot Zera’im   •   B: Review of Brachot & Tefilah', 390, top - 14, {
        width: 948, align: 'center'
      });
  }
  const dedicationY = top + 22;
  const dedicationCenterY = dedicationY + 28;
  doc.save().strokeColor(GOLD).lineWidth(3);
  doc.moveTo(380, dedicationCenterY).lineTo(545, dedicationCenterY).stroke();
  doc.moveTo(1183, dedicationCenterY).lineTo(1348, dedicationCenterY).stroke();
  doc.restore();
  fitText(doc, 'לע״נ דוד יעקב ע״ה בן מנחם חיים שיחי׳', 565, dedicationY, 598, 56, {
    font: 'Shofar', size: 30, minSize: 22, color: BURGUNDY
  });
  doc.font('Montserrat').fontSize(20).fillColor(BURGUNDY)
    .text('www.mishnahyomit.com', 614, top + 78, {
      width: 500, align: 'center', link: 'https://www.mishnahyomit.com'
    });

  doc.save();
  doc.moveTo(0, top + 142)
    .bezierCurveTo(250, top + 95, 470, top + 210, 800, top + 176)
    .bezierCurveTo(1110, top + 143, 1395, top + 96, PAGE_WIDTH, top + 154)
    .lineTo(PAGE_WIDTH, PAGE_HEIGHT).lineTo(0, PAGE_HEIGHT).closePath().fill(BURGUNDY);
  doc.moveTo(0, top + 124)
    .bezierCurveTo(280, top + 79, 500, top + 190, 800, top + 158)
    .bezierCurveTo(1130, top + 123, 1410, top + 78, PAGE_WIDTH, top + 136)
    .lineWidth(7).strokeColor(GOLD).stroke();
  doc.restore();
}

function writeKitzurCalendarPdf(calendar, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      compress: true,
      info: {
        Title: `Kitzur Shulchan Aruch Yomi Calendar ${calendar.year}`,
        Author: 'Kitzur Shulchan Aruch Yomi'
      }
    });
    const stream = fs.createWriteStream(outputPath);
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);
    doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
    doc.registerFont('Shofar', SHOFAR);
    doc.registerFont('Montserrat', MONTSERRAT_REGULAR);
    doc.registerFont('MontserratMedium', MONTSERRAT_MEDIUM);
    doc.registerFont('MontserratSemibold', MONTSERRAT_SEMIBOLD);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(PAPER);
    drawHeader(doc, calendar);
    const split = Math.ceil(calendar.weeks.length / 2);
    drawTable(doc, calendar.weeks.slice(0, split), 38, 400, 814, 1870);
    drawTable(doc, calendar.weeks.slice(split), 876, 400, 814, 1870);
    drawFooter(doc, calendar);
    doc.end();
  });
}

module.exports = { writeKitzurCalendarPdf };
