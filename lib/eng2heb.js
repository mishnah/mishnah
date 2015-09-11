//code copied from: http://www.dafaweek.com/hebcal/todayheb.php

function MonSinceFirstMolad(nYearH) {
  var nMonSinceFirstMolad
  nYearH --

    nMonSinceFirstMolad = Math.floor(nYearH / 19) * 235
  nYearH = nYearH % 19
  nMonSinceFirstMolad += 12 * nYearH
  if (nYearH >= 17) {
    nMonSinceFirstMolad += 6
  } else if  (nYearH >= 14) {
    nMonSinceFirstMolad += 5
  } else if  (nYearH >= 11) {
    nMonSinceFirstMolad += 4
  } else if  (nYearH >= 8) {
    nMonSinceFirstMolad += 3
  } else if  (nYearH >= 6) {
    nMonSinceFirstMolad += 2
  } else if  (nYearH >= 3) {
    nMonSinceFirstMolad += 1
  }
  return nMonSinceFirstMolad
}

function IsLeapYear(nYearH) {
  var nYearInCycle

  nYearInCycle = nYearH % 19
  return ( nYearInCycle ==  3 ||
          nYearInCycle ==  6 ||
          nYearInCycle ==  8 ||
          nYearInCycle == 11 ||
          nYearInCycle == 14 ||
          nYearInCycle == 17 ||
          nYearInCycle == 0)
}

function Tishrei1(nYearH) {
  var nMonthsSinceFirstMolad
  var nChalakim
  var nHours
  var nDays
  var nDayOfWeek
  var dTishrei1

  nMonthsSinceFirstMolad = MonSinceFirstMolad(nYearH)
  nChalakim = 793 * nMonthsSinceFirstMolad
  nChalakim += 204
  nHours = Math.floor(nChalakim / 1080)
  nChalakim = nChalakim % 1080

  nHours += nMonthsSinceFirstMolad * 12
  nHours += 5

  nDays = Math.floor(nHours / 24)
  nHours = nHours % 24

  nDays += 29 * nMonthsSinceFirstMolad
  nDays += 2

  nDayOfWeek = nDays % 7

  if (!IsLeapYear(nYearH) &&
      nDayOfWeek == 3 &&
        (nHours * 1080) + nChalakim >= (9 * 1080) + 204) {
    nDayOfWeek = 5
  nDays += 2
  }
  else if ( IsLeapYear(nYearH - 1) &&
           nDayOfWeek == 2 &&
             (nHours * 1080) + nChalakim >= (15 * 1080) + 589 ) {
    nDayOfWeek = 3
  nDays += 1
  }
  else {
    if (nHours >= 18) {
      nDayOfWeek += 1
      nDayOfWeek = nDayOfWeek % 7
      nDays += 1
    }
    if (nDayOfWeek == 1 ||
        nDayOfWeek == 4 ||
          nDayOfWeek == 6) {
      nDayOfWeek += 1
    nDayOfWeek = nDayOfWeek % 7
    nDays += 1
    }
  }

  nDays -= 2067025
  dTishrei1 = new Date(1900, 0, 1)
  dTishrei1.setDate(dTishrei1.getDate() + nDays)

  return dTishrei1
}

function LengthOfYear(nYearH) {
  var dThisTishrei1
  var dNextTishrei1
  var diff

  dThisTishrei1 = Tishrei1(nYearH)
  dNextTishrei1 = Tishrei1(nYearH + 1)
  diff = (dNextTishrei1 - dThisTishrei1) / ( 1000 * 60 * 60 * 24)
  return Math.round(diff)
}

function GregToHeb(dGreg) {
  var nYearH
  var nMonthH
  var nDateH
  var nOneMolad
  var nAvrgYear
  var nDays
  var dTishrei1
  var nLengthOfYear
  var bLeap
  var bHaser
  var bShalem
  var nMonthLen
  var bWhile
  var d1900 = new Date(1900, 0, 1)

  nOneMolad = 29 + (12 / 24) + (793 / (1080 * 24))
  nAvrgYear = nOneMolad * (235 / 19)
  nDays = Math.round((dGreg - d1900) / (24 * 60 * 60 * 1000))
  nDays += 2067025
  nYearH = Math.floor(nDays / nAvrgYear) + 1
  dTishrei1 = Tishrei1(nYearH)

  if (SameDate(dTishrei1, dGreg)) {
    nMonthH = 1
    nDateH = 1
  }
  else  {
    if (dTishrei1 < dGreg) {
      while (Tishrei1(nYearH + 1) <= dGreg) {
        nYearH += 1
      }
    }
    else {
      nYearH -= 1
      while (Tishrei1(nYearH) > dGreg) {
        nYearH -= 1
      }
    }

    nDays = (dGreg - Tishrei1(nYearH)) / (24 * 60 * 60 * 1000)
    nDays = Math.round(nDays)
    nLengthOfYear = LengthOfYear(nYearH)
    bHaser = nLengthOfYear == 353 || nLengthOfYear == 383
    bShalem = nLengthOfYear == 355 || nLengthOfYear == 385
    bLeap = IsLeapYear(nYearH)

    nMonthH = 1
    do {

      switch (nMonthH) {
        case 1:
          case 5:
          case 6:
          case 8:
          case 10:
          case 12:
          nMonthLen = 30
        break
        case 4:
          case 7:
          case 9:
          case 11:
          case 13:
          nMonthLen = 29
        break
        case 6:
          nMonthLen = 30
        break
        case 2:
          nMonthLen = (bShalem ? 30 : 29)
        break
        case 3:
          nMonthLen = (bHaser ? 29: 30)
        break
      }

      if (nDays >= nMonthLen) {
        bWhile = true
        if (bLeap || nMonthH != 5) {
          nMonthH ++
        }
          else {
            nMonthH += 2
          }
          nDays -= nMonthLen
      }
      else {
        bWhile = false
      }
    } while (bWhile)
      nDateH = nDays + 1
  }
  return nMonthH + "/" + nDateH + "/" + nYearH
}

function SameDate(d1, d2) {
  return (d1.getFullYear() == d2.getFullYear() &&
          d1.getMonth() == d2.getMonth() &&
          d1.getDate() == d2.getDate())

}

function FormatDateH(cDate) {
  var aDate = new Array()
  var cFormatDate

  aDate = cDate.split("/")
  switch (Number(aDate[0])) {
    case 1:
      cFormatDate = "Tishrei"
    break
    case 2:
      cFormatDate = "Cheshvan"
    break
    case 3:
      cFormatDate = "Kislev"
    break
    case 4:
      cFormatDate = "Teves"
    break
    case 5:
      cFormatDate = "Shevat"
    break
    case 6:
      cFormatDate = "Adar I"
    break
    case 7:
      cFormatDate = (IsLeapYear(Number(aDate[2])) ? "Adar II" : "Adar")
    break
    case 8:
      cFormatDate = "Nisan"
    break
    case 9:
      cFormatDate = "Iyar"
    break
    case 10:
      cFormatDate = "Sivan"
    break
    case 11:
      cFormatDate = "Tamuz"
    break
    case 12:
      cFormatDate = "Av"
    break
    case 13:
      cFormatDate = "Elul"
    break
  }
  return aDate[1] + " " + cFormatDate + " " + aDate[2];

}
exports.convert = function(date) {
 return FormatDateH(GregToHeb(date));
};
