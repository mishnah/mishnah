var path = require("path");
var fs = require("fs");
var _ = require("underscore");
var moment = require("moment");
var eng2heb = require("./lib/eng2heb");
var cheerio = require("cheerio");
var request = require("request");

// loading the data
var json = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "mishnah.json")));
var flatArray = _.chain(json).values().flatten().value();
var total_p = flatArray.length;
var total_m = _.reduce(flatArray, function(memo, num){ return memo + parseInt(num, 10); }, 0);

//extract names
var names = _.keys(json);
var hebrew = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "hebrew.json")));

//build daily data
var mas_index = 0;
var perek_index = 0;
var mish_index = 0;

// basic incrementer
function increment(perakim) {
  if (perakim) {
    perek_index++;
  } else {
    mish_index++;
  }

  if (+json[names[mas_index]][perek_index] === mish_index) {
    mish_index = 0;
    perek_index++;
  }
  if (json[names[mas_index]].length === perek_index) {
    mish_index = 0;
    perek_index = 0;
    mas_index++;
    if (mas_index === names.length) {
      mas_index = 0;
    }
  }
}
function buildList(perDay, perakim) {
  var ret = [];
  for (var i = 0; i < (perakim ? total_p : total_m) / perDay; i++) {
    var day = [];
    day.push({ t: mas_index, p: (perek_index + 1), m: (mish_index + 1) });
    if (perDay > 1) {
      for (var j = 1; j < perDay; j++) {
        increment(perakim);
      }
      day.push({ t: mas_index, p: (perek_index + 1), m: (mish_index + 1) });
    }
    increment(perakim);
    ret.push(day);
  }
  return ret;
}

function prettyLine(d, display_only_first, show_perek, only_perakim) {
  return ((d.p === 1 && d.m === 1) || !display_only_first ? names[d.t] + " " : "") +
    (d.m === 1 || show_perek ? d.p + (!only_perakim ? ":" : "") : "") +
    (!only_perakim ? d.m : "");
}

function prettyFormat(d, display_only_first, only_perakim) {
  return prettyLine(d[0], display_only_first, true, only_perakim) +
    (d[1] !== undefined ?
      (d[1].t !== d[0].t ? " - " : "-") +
      prettyLine(d[1], d[1].t === d[0].t, d[1].t !== d[0].t || d[1].p !== d[0].p, only_perakim) : "");
}

exports.structure = json;
exports.names = names;
exports.total = total_m;
exports.prettyFormat = prettyFormat;

var mishnah_yomit = buildList(2);
exports.getToday = function (_date, pretty) {
  var start = moment([2010, 6, 4]);
  var date = moment(_date);
  var mish = mishnah_yomit[+date.diff(start, 'days') % mishnah_yomit.length];
  return pretty ? prettyFormat(mish) : mish;
};

exports.buildCalendar = function (o) {
  mas_index = 0;
  perek_index = 0;
  mish_index = 0;

  var day = new moment(o.start || moment([2010, 6, 4]));
  var list = buildList(o.per_day || 2, o.perakim);
  var data = [];
  function addDay(d) {
    var ret = {
      d: d,
      pretty: prettyFormat(d, false, o.perakim),
      date: new Date(day.toDate()),
      english: day.format("dddd, MMMM Do YYYY"),
      hebrew: eng2heb.convert(day.toDate()),
    };
    day.add(1, 'd');
    if (o.sun2thurs && day.day() === 5) { day.add(1, 'd'); }
    if (o.sun2thurs && day.day() === 6) { day.add(1, 'd'); }

    data.push(ret);
  }
  for (var i = 0; i < (o.cycles || 1); i++) {
    list.forEach(addDay);
  }
  return data;
};

exports.source = function (o, callback) {
  var masechet = hebrew.names[o.t];
  var perek = hebrew.values[o.p];
  var mishnah = hebrew.values[o.m];
  var encoded_page = encodeURI('משנה_' + masechet + "_" + perek + "_" + mishnah);
  var url = 'https://he.wikisource.org/w/api.php?action=parse&format=json&section=0&prop=text&page=' + encoded_page;
  function getMishnah(cb) {
    request(url, function (err, reponse, body) {
      if (err) { return cb(err) }
      var json = JSON.parse(body);
      if (!json || !json.parse || !json.parse.text) {
        return cb("Not Found");
      }
      var content = json.parse.text['*'];
      var $ = cheerio.load(content);

      var mishnah_div = $("div").filter(function () {
        return $(this).css("font-size") == "120%"
      });;

      var complete = `
      <div style="direction: rtl;">${mishnah_div.html()}</div>
      <small>Source <a href="https://he.wikisource.org/wiki/${encoded_page}">Wikisource</a></small>
      `
      cb(null, complete);
    })
  }
  if (callback) {
    return getMishnah(callback);
  }
  return new Promise((resolve, reject) => {
    getMishnah((err, content) => {
      if (err) { return reject(err)}
      resolve(content);
    })
  });

}



