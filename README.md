# Mishnah Study Library

This node package is used to generate Mishnah learning calendars. It was primarily
built for [Mishnah Yomit](http://www.mishnahyomit.com) but can be used to build 
calendars for other learning structures.


## Install

```
$ npm install mishnah -S
```

## Usage

```
var mishnah = require("mishnah");

//The total number of Mishanayot. 
mishnah.total;

//An array of the names of all the tractates.
mishnah.names;

//An object of the structure of the Mishnah.
//Each key is the name of the tractate with the value an array of total mishnayot per perek.
mishnah.structure;

```

## Functions 

### mishnah.getToday(date,pretty)

The function returns the Mishnayot to be studied on the given `date` according
to the Mishnah Yomit program.

The function will return a mishnah range which is structured as follows, e.g.

```
 [{
    t: 0, // tractate index (use the mishnah.names property)
    p: 1, // perek number
    m: 1, // mishnah number
 },{
    t: 0, // tractate index (use the mishnah.names property)
    p: 1, // perek number
    m: 2, // mishnah number
 }]
```

If the value of `pretty` is `true` then a readable version will be returned, e.g.

```
Parah 12:6-7`
```

### mishnah.buildCalendar(o)

The function builds a daily Mishnah learning calendar.

The argument is an optional object:

```
  {
     start: new Date(),  // starting date (defaults to  10 July 2010)
     per_day: 2,         // mishnayot to be learnt per day (default: 2)
     cycles:  1,         // cycles to generate (default: 1) 
     perakim:  false,    // build a perakim based learning schedule (default: false) 
     sun2thurs:  false,  // build a schedule for Sunday to Thursday only (default: false) 
  }
```

The function returns the following array:

```
[{
   d: [{
      t: 0, // tractate index (use the mishnah.names property)
      p: 1, // perek number
      m: 1, // mishnah number
   },{
      t: 0, // tractate index (use the mishnah.names property)
      p: 1, // perek number
      m: 2, // mishnah number
   }],  
   date: Date, // date object
   english: "Monday, September 7th 2015" // nicely formated english date
   hebrew: "23 Elul 5775", // nicely formatted hebrew date
   pretty: "Berachot 1:1-2" // nicely formated mishnayot to study
}, { ...]
```

### mishnah.prettyFormat(d)

Returns a pretty format of a Mishnah range (as already described above).

### Credits

The original sheet with the breakdown of mishnayot per perek was taken from [here](https://docs.google.com/spreadsheets/d/11ITaH8qPFPIo1xvX13X0m7iCUfSgtLMIxP8A-Y39SuE/edit).
