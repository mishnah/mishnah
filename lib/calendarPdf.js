'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PAGE_WIDTH = 1728;
const PAGE_HEIGHT = 2592;
const NAVY = '#29256f';
const NAVY_DARK = '#24205f';
const GOLD = '#caa052';
const GOLD_LIGHT = '#f3dfae';
const GRID = '#b8bfd0';
const PALE = '#f1f2f8';
const INK = '#20213b';
const DAYS = [
  ['Sun', 'א׳'], ['Mon', 'ב׳'], ['Tue', 'ג׳'], ['Wed', 'ד׳'],
  ['Thurs', 'ה׳'], ['Fri', 'ו׳'], ['Shabbat', 'שבת']
];

const ASSET_DIR = path.join(__dirname, '..', 'assets');
const LOGO = path.join(ASSET_DIR, 'calendar-logo.png');
const BOTTOM = path.join(ASSET_DIR, 'calendar-bottom.png');
const SHOFAR = path.join(ASSET_DIR, 'ShofarRegular.ttf');
const MONTSERRAT_REGULAR = require.resolve(
  '@fontsource/montserrat/files/montserrat-latin-400-normal.woff'
);
const MONTSERRAT_MEDIUM = require.resolve(
  '@fontsource/montserrat/files/montserrat-latin-500-normal.woff'
);
const MONTSERRAT_SEMIBOLD = require.resolve(
  '@fontsource/montserrat/files/montserrat-latin-600-normal.woff'
);

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
    size -= 1;
  }
  doc.fontSize(size);
  lines = hebrewLines(doc, text, width);
  lineHeight = doc.currentLineHeight(true);
  let lineY = y + Math.max(0, (height - lines.length * lineHeight) / 2) + (config.yOffset || 0);
  doc.fillColor(config.color);

  lines.forEach((line) => {
    const space = doc.widthOfString(' ');
    let right = config.align === 'right'
      ? x + width
      : x + (width + line.width) / 2;
    // Draw one word at a time so PDFKit shapes each word RTL while we retain
    // the logical (right-to-left) word order ourselves.
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
    { font: 'Montserrat', size: 16, minSize: 9, align: 'center', color: INK },
    options || {}
  );
  if (containsHebrew(text)) {
    fitHebrewText(doc, text, x, y, width, height, config);
    return;
  }
  let size = config.size;
  doc.font(config.font);
  while (size > config.minSize) {
    doc.fontSize(size);
    if (doc.heightOfString(text, { width, align: config.align }) <= height) break;
    size -= 1;
  }
  doc.fontSize(size);
  const textHeight = doc.heightOfString(text, { width, align: config.align });
  doc.fillColor(config.color).text(text, x, y + Math.max(0, (height - textHeight) / 2), {
    width, height, align: config.align, ellipsis: true, lineGap: 0
  });
}

function drawHeader(doc, calendar) {
  doc.image(LOGO, 90, 45, { fit: [455, 320], align: 'center', valign: 'center' });
  doc.save().lineWidth(4).strokeColor(GOLD).moveTo(640, 65).lineTo(640, 330).stroke().restore();
  fitText(doc, 'לוח משנה יומית', 678, 70, 1000, 115, {
    font: 'Shofar', size: 118, minSize: 96, color: NAVY_DARK
  });
  doc.font('MontserratMedium').fontSize(39).fillColor(NAVY)
    .text('M I S H N A H   Y O M I T   C A L E N D A R', 693, 182, { width: 970, align: 'center' });

  doc.save().strokeColor(GOLD).lineWidth(3);
  doc.moveTo(770, 302).lineTo(930, 302).stroke();
  doc.moveTo(1370, 302).lineTo(1585, 302).stroke();
  doc.restore();
  fitText(doc, calendar.hebrewYear, 950, 267, 175, 70, {
    font: 'Shofar', size: 44, minSize: 34, color: NAVY, yOffset: -3
  });
  doc.roundedRect(1145, 269, 205, 66, 30).fill(GOLD);
  fitText(doc, String(calendar.year), 1145, 269, 205, 66, {
    font: 'MontserratMedium', size: 34, minSize: 29, color: '#ffffff'
  });
}

function drawTable(doc, weeks, x, y, width, height) {
  const tractateWidth = 118;
  const noteWidth = 124;
  const dayWidth = (width - tractateWidth - noteWidth) / 7;
  const headerHeight = 82;
  const rowHeight = (height - headerHeight) / weeks.length;
  const radius = 15;

  doc.save();
  doc.roundedRect(x, y, width, height, radius).clip();
  doc.rect(x, y, width, height).fill('#ffffff');
  doc.rect(x, y, width, headerHeight).fill(NAVY);
  doc.rect(x, y + headerHeight, tractateWidth, height - headerHeight).fill(PALE);
  doc.rect(x + width - noteWidth, y + headerHeight, noteWidth, height - headerHeight).fill(GOLD_LIGHT);
  weeks.forEach((week, row) => {
    if (row % 2 === 1) {
      doc.fillOpacity(0.25)
        .rect(x + tractateWidth, y + headerHeight + row * rowHeight, width - tractateWidth - noteWidth, rowHeight)
        .fill(PALE).fillOpacity(1);
    }
  });
  doc.strokeColor(GRID).lineWidth(1);
  doc.moveTo(x + tractateWidth, y).lineTo(x + tractateWidth, y + height).stroke();
  for (let col = 1; col < 7; col++) {
    const gridX = x + tractateWidth + col * dayWidth;
    doc.moveTo(gridX, y).lineTo(gridX, y + height).stroke();
  }
  doc.moveTo(x + width - noteWidth, y).lineTo(x + width - noteWidth, y + height).stroke();
  for (let row = 0; row <= weeks.length; row++) {
    const gridY = y + headerHeight + row * rowHeight;
    doc.moveTo(x, gridY).lineTo(x + width, gridY).stroke();
  }
  doc.restore();

  DAYS.forEach((day, index) => {
    const dayX = x + tractateWidth + index * dayWidth;
    fitText(doc, day[0], dayX + 3, y + 10, dayWidth - 6, 31, {
      font: 'MontserratSemibold', size: 18, minSize: 13, color: '#ffffff'
    });
    fitText(doc, day[1], dayX + 3, y + 43, dayWidth - 6, 27, {
      font: 'Shofar', size: 21, minSize: 14, color: '#ffffff'
    });
  });

  weeks.forEach((week, row) => {
    const rowY = y + headerHeight + row * rowHeight;
    const tractateLabel = week.tractates.length
      ? week.tractates.join(' / ')
      : (row === 0 ? week.activeTractate : '');
    fitText(doc, tractateLabel, x + 5, rowY + 2, tractateWidth - 10, rowHeight - 4, {
      font: 'MontserratSemibold', size: 15, minSize: 9, color: NAVY_DARK
    });
    week.days.forEach((day, index) => {
      fitText(doc, day.learning, x + tractateWidth + index * dayWidth + 2, rowY + 2, dayWidth - 4, rowHeight - 4, {
        font: 'Montserrat', size: 15, minSize: 9, color: INK
      });
    });
    fitText(doc, week.note, x + width - noteWidth + 5, rowY + 2, noteWidth - 10, rowHeight - 4, {
      font: 'Shofar', size: 17, minSize: 10, color: INK
    });
  });
  doc.save().roundedRect(x, y, width, height, radius).lineWidth(2).strokeColor(NAVY).stroke().restore();
}

function drawFooter(doc) {
  doc.image(BOTTOM, 0, PAGE_HEIGHT - 250, { width: PAGE_WIDTH, height: 248 });
  const dedicationY = PAGE_HEIGHT - 212;
  const dedicationCenterY = dedicationY + 28;
  doc.save().strokeColor(GOLD).lineWidth(3);
  doc.moveTo(410, dedicationCenterY).lineTo(560, dedicationCenterY).stroke();
  doc.moveTo(1168, dedicationCenterY).lineTo(1318, dedicationCenterY).stroke();
  doc.restore();
  fitText(doc, 'לע״נ יחזקאל זעליג בן ישראל ע״ה', 585, dedicationY, 558, 56, {
    font: 'Shofar', size: 31, minSize: 24, color: NAVY
  });
  doc.font('Montserrat').fontSize(22).fillColor(NAVY)
    .text('www.mishnahyomit.com', 590, PAGE_HEIGHT - 151, {
      width: 550, align: 'center', link: 'https://www.mishnahyomit.com'
    });
}

function writeCalendarPdf(calendar, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      compress: true,
      info: { Title: `Mishnah Yomit Calendar ${calendar.year}`, Author: 'Mishnah Yomit' }
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
    drawHeader(doc, calendar);
    const split = Math.ceil(calendar.weeks.length / 2);
    drawTable(doc, calendar.weeks.slice(0, split), 38, 400, 814, 1915);
    drawTable(doc, calendar.weeks.slice(split), 876, 400, 814, 1915);
    drawFooter(doc);
    doc.end();
  });
}

module.exports = { writeCalendarPdf };
