var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var moment = require('moment');
var eng2heb = require('./lib/eng2heb');
var request = require('request');

// loading the data
var json = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'mishnah.json'))
);
var flatArray = _.chain(json).values().flatten().value();
var total_p = flatArray.length;
var total_m = _.reduce(
  flatArray,
  function (memo, num) {
    return memo + parseInt(num, 10);
  },
  0
);

//extract names
var names = _.keys(json);
var hebrew = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'hebrew.json'))
);

// Sedarim
var seder = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'sedarim.json'))
);

//basic incrementer
function increment(index, perakim) {
  if (perakim) {
    index.p++;
  } else {
    index.m++;
  }

  if (+json[names[index.t]][index.p] === index.m) {
    index.m = 0;
    index.p++;
  }
  if (json[names[index.t]].length === index.p) {
    index.m = 0;
    index.p = 0;
    index.t++;
    if (index.t === names.length) {
      index.t = 0;
    }
  }
  return index;
}
function buildList(perDay, perakim, sederName) {
  var ret = [];
  let index = { t: 0, p: 0, m: 0 };

  var allowedMasechtos = [];
  if (sederName && seder[sederName]) {
    allowedMasechtos = _.map(seder[sederName], function (masechtaName) {
      return _.indexOf(names, masechtaName);
    });
  }

  for (var i = 0; i < (perakim ? total_p : total_m) / perDay; i++) {
    // Limit the schedule to a particular seder only if requested
    if (sederName && allowedMasechtos.length > 0) {
      while (
        allowedMasechtos.indexOf(index.t) === -1 &&
        index.t < names.length
      ) {
        index.t++;
      }
      if (allowedMasechtos.indexOf(index.t) === -1) {
        break;
      }
    }

    var day = [];
    day.push({ t: index.t, p: index.p + 1, m: index.m + 1 });
    if (perDay > 1) {
      for (var j = 1; j < perDay; j++) {
        index = increment(index, perakim);
      }
      day.push({ t: index.m, p: index.p + 1, m: index.m + 1 });
    }
    index = increment(index, perakim);
    ret.push(day);
  }
  return ret;
}

function prettyLine(d, display_only_first, show_perek, only_perakim) {
  return (
    ((d.p === 1 && d.m === 1) || !display_only_first ? names[d.t] + ' ' : '') +
    (d.m === 1 || show_perek ? d.p + (!only_perakim ? ':' : '') : '') +
    (!only_perakim ? d.m : '')
  );
}

function prettyFormat(d, display_only_first, only_perakim) {
  return (
    prettyLine(d[0], display_only_first, true, only_perakim) +
    (d[1] !== undefined
      ? (d[1].t !== d[0].t ? ' - ' : '-') +
        prettyLine(
          d[1],
          d[1].t === d[0].t,
          d[1].t !== d[0].t || d[1].p !== d[0].p,
          only_perakim
        )
      : '')
  );
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
  var day = new moment(o.start || moment([2010, 6, 4]));

  var list = buildList(o.per_day || 2, o.perakim, o.seder);

  var data = [];
  function addDay(d) {
    var ret = {
      d: d,
      pretty: prettyFormat(d, false, o.perakim),
      date: new Date(day.toDate()),
      english: day.format('dddd, MMMM Do YYYY'),
      hebrew: eng2heb.convert(day.toDate())
    };
    day.add(1, 'd');
    if (o.sun2thurs && day.day() === 5) {
      day.add(1, 'd');
    }
    if ((o.sun2fri || o.sun2thurs) && day.day() === 6) {
      day.add(1, 'd');
    }

    data.push(ret);
  }
  for (var i = 0; i < (o.cycles || 1); i++) {
    list.forEach(addDay);
  }
  return data;
};

exports.buildTargetCalendar = function (start_date, end_date, current_d) {
  var start = moment(start_date).startOf('day');
  var end = moment(end_date).startOf('day');
  var days = end.diff(start, 'days') + 1;

  let mishnah_left = 0;
  Object.keys(json).forEach(function (masechta, idx) {
    if (idx >= current_d.t) {
      let perakim = [...json[masechta]];
      if (idx === current_d.t) {
        perakim = perakim.slice(current_d.p - 1);
        perakim[0] = perakim[0] - (current_d.m - 1);
      }
      mishnah_left += perakim.reduce((a, b) => a + +b, 0);
    }
  });

  let average = mishnah_left / days;
  let index = { t: current_d.t, p: current_d.p - 1, m: current_d.m - 1 };
  let running_average = 0;
  let list = [];
  for (var i = 0; i < days; i++) {
    let step;
    if (running_average < average) {
      step = Math.ceil(average);
    } else {
      step = Math.floor(average);
    }

    var day = [];
    day.push({ t: index.t, p: index.p + 1, m: index.m + 1 });

    if (step > 1) {
      for (var j = 1; j < step; j++) {
        index = increment(index);
      }
      day.push({ t: index.t, p: index.p + 1, m: index.m + 1 });
    }
    list.push(day);

    index = increment(index);
    running_average = (running_average * i) / (i + 1) + step / (i + 1);
  }

  var day = new moment(start_date);

  var data = [];
  function addDay(d) {
    var ret = {
      d: d,
      pretty: prettyFormat(d),
      date: new Date(day.toDate()),
      english: day.format('dddd, MMMM Do YYYY'),
      hebrew: eng2heb.convert(day.toDate())
    };
    day.add(1, 'd');
    data.push(ret);
  }
  list.forEach(addDay);
  return { average, data };
};

let in_a_year = exports.buildTargetCalendar(
  new Date(),
  moment().add(1, 'year').toDate(),
  {
    t: 0,
    p: 1,
    m: 1
  }
);

exports.source = function (o, callback) {
  var masechet = hebrew.names[o.t];
  var perek = hebrew.values[o.p];
  var mishnah = hebrew.values[o.m];
  var menukad = o.menukad;

  var encoded_page = encodeURI(
    'משנה_' + masechet + '_' + perek + '_' + mishnah
  );
  var url = 'https://www.sefaria.org/api/texts/' + encoded_page;
  function getMishnah(cb) {
    request(url, function (err, reponse, body) {
      if (err) {
        return cb(err);
      }
      var json = JSON.parse(body);
      if (!json || !json.he || !json.he[o.m - 1]) {
        return cb('Not Found');
      }
      var content = json.he[o.m - 1];
      var complete = `
      <div style="direction: rtl;">${content}</div>
      <small><a href="https://www.mishnahyomit.com/learn/?t=${o.t}&p=${o.p}&m=${o.m}">Full Text and Commentary</a></small>
      `;
      cb(null, complete);
    });
  }
  if (callback) {
    return getMishnah(callback);
  }
  return new Promise((resolve, reject) => {
    getMishnah((err, content) => {
      if (err) {
        return reject(err);
      }
      resolve(content);
    });
  });
};
