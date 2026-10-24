/* تاریخ شمسی (Jalali) — الگوریتم jalaali-js (MIT) + قالب‌بندی فارسی
   ذخیره‌سازی داده‌ها همچنان میلادی محلی (YYYY-MM-DDTHH:mm) می‌ماند؛
   این ماژول فقط برای نمایش و انتخاب تاریخ شمسی است. */
const Jalali = (function () {
  'use strict';
  var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  var WEEK_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy, withoutLeap) {
    var bl = breaks.length, gy = jy + 621, leapJ = -14, jp = breaks[0];
    var jm, jump = 0, leap, leapG, march, n, i;
    if (jy < jp || jy >= breaks[bl - 1]) throw new Error('Invalid Jalaali year ' + jy);
    for (i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (!withoutLeap) {
      if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
      leap = mod(mod(n + 1, 33) - 1, 4);
      if (leap === -1) leap = 4;
    }
    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
      + div(153 * mod(gm + 9, 12) + 2, 5)
      + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    var j, i, gd, gm, gy;
    j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    i = div(mod(j, 1461), 4) * 5 + 308;
    gd = div(mod(i, 153), 5) + 1;
    gm = mod(div(i, 153), 12) + 1;
    gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy, false);
    var jdn1f = g2d(gy, 3, r.march), k = jdn - jdn1f, jm, jd;
    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy: jy, jm: jm, jd: jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  function toJalaali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
  function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }

  /* طول ماه از همان تبدیل روزشمار (j2d) محاسبه می‌شود تا با toGregorian همیشه هم‌راستا بماند */
  function monthLength(jy, jm) {
    var next = jm === 12 ? { y: jy + 1, m: 1 } : { y: jy, m: jm + 1 };
    return j2d(next.y, next.m, 1) - j2d(jy, jm, 1);
  }
  function isLeap(jy) { return monthLength(jy, 12) === 30; }
  function isValid(jy, jm, jd) {
    if (!(jy >= breaks[0] && jy < breaks[breaks.length - 1])) return false;
    if (!(jm >= 1 && jm <= 12)) return false;
    return jd >= 1 && jd <= monthLength(jy, jm);
  }

  function fa(value) {
    return String(value == null ? '' : value).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* تاریخ میلادی محلی → شمسی */
  function fromDate(date) { return toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate()); }

  /* رشته ذخیره‌شده «YYYY-MM-DDTHH:mm» (یا با ثانیه) → شیء تاریخ محلی؛ نامعتبر → null */
  function parse(value) {
    if (!value || typeof value !== 'string') return null;
    var m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], h = m[4] === undefined ? 0 : +m[4], mi = m[5] === undefined ? 0 : +m[5], s = m[6] === undefined ? 0 : +m[6];
    var date = new Date(y, mo - 1, d, h, mi, s);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    if (h > 23 || mi > 59 || s > 59) return null;
    return date;
  }

  /* شیء تاریخ محلی → رشته ذخیره‌سازی «YYYY-MM-DDTHH:mm» */
  function toStorage(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
      + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  /* شمسی → رشته ذخیره‌سازی میلادی محلی */
  function toStorageFromJ(jy, jm, jd, hh, mm) {
    var g = toGregorian(jy, jm, jd);
    return g.gy + '-' + pad(g.gm) + '-' + pad(g.gd) + 'T' + pad(hh) + ':' + pad(mm);
  }

  function weekdayIndex(date) { return (date.getDay() + 1) % 7; } // شنبه = ۰

  function dayText(date) {
    var j = fromDate(date);
    return fa(j.jd) + ' ' + MONTHS[j.jm - 1] + ' ' + fa(j.jy);
  }
  function fullText(date) {
    var j = fromDate(date);
    return WEEKDAYS[weekdayIndex(date)] + ' ' + fa(j.jd) + ' ' + MONTHS[j.jm - 1] + ' ' + fa(j.jy)
      + ' — ' + fa(pad(date.getHours()) + ':' + pad(date.getMinutes()));
  }
  /* مقدار ذخیره‌شده (رشته یا تاریخ) → متن شمسی؛ خالی/نامعتبر → متن جایگزین */
  function storageText(value, fallback) {
    var date = value instanceof Date ? value : parse(value);
    if (!date || isNaN(date.getTime())) return fallback || '';
    return fullText(date);
  }
  /* کلید روز میلادی محلی «YYYY-MM-DD» — برای گروه‌بندی در تقویم */
  function dateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }
  /* کلید روز → متن کامل شمسی همان روز */
  function keyText(key) {
    var date = parse(key);
    return date ? fullText(date) : '';
  }

  return {
    toJalaali: toJalaali,
    toGregorian: toGregorian,
    fromDate: fromDate,
    monthLength: monthLength,
    isLeap: isLeap,
    isValid: isValid,
    parse: parse,
    toStorage: toStorage,
    toStorageFromJ: toStorageFromJ,
    weekdayIndex: weekdayIndex,
    dayText: dayText,
    fullText: fullText,
    storageText: storageText,
    dateKey: dateKey,
    keyText: keyText,
    fa: fa,
    pad: pad,
    MONTHS: MONTHS,
    WEEKDAYS: WEEKDAYS,
    WEEK_SHORT: WEEK_SHORT
  };
})();
if (typeof module === 'object' && module.exports) module.exports = Jalali;
