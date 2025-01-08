/**
 * Функция для обработки массива значений дат и приведения их к стандартному формату.
 * 
 * @param {Array} rangeVals - Массив значений дат в виде строк.
 * @returns {Array} Массив, содержащий результаты обработки каждой строки с датой.
 */
function parseDateMapped(rangeVals) {
  return rangeVals.map(v => parseDateForMapping(v[0]))
}

/**
 * Функция для обработки одной строки с датой и приведения её к стандартному формату.
 * Проверяет несколько шаблонов дат и возвращает результат в виде массива из трех значений:
 * год, месяц и день.
 * 
 * @param {string} dateString - Строка с датой, которая будет обработана.
 * @returns {Array} Массив из трех элементов: [год, месяц, день]. Если дата некорректна, возвращается сообщение об ошибке.
 */
function parseDateForMapping(dateString) {
  const trimmedDt = String(dateString).trim();

  // Если строка пустая или содержит значения, не являющиеся датами
  if (trimmedDt === "" || trimmedDt.toLowerCase() === 'no date' || trimmedDt === '-' ||
  trimmedDt.toLowerCase() === 'no data' || trimmedDt.toLowerCase() === 'no info' || 
  trimmedDt.toLowerCase() === 'unknown') {return ["","",""]};

  // Если дата состоит только из года (и год корректен)
  if (trimmedDt.length === 4 && Number(trimmedDt) <= new Date().getFullYear() &&
      Number(trimmedDt) < 9999 && Number(trimmedDt) > 1000) {return [Number(trimmedDt), "", ""]};

  // Определение шаблонов для разных форматов дат
  const regexes = {
     "(0?[1-9]|1[0-2])[-./](0?[1-9]|[12][0-9]|3[01])[-./](\\d{4})": [3, 1, 2], // 01.31.2020 (также 01/1/2020, 1-1-2020)
     "(\\d{4})[-./](0?[1-9]|1[0-2])[-./](0?[1-9]|[12][0-9]|3[01])": [1, 2, 3], // 2020-1-31 (также 2020/01/1, 2020.1.1)
     "(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\\s(\\d{1,2})\\,?\\s?(\\d{4})": [3, -1, 2], // Jan 31, 2020
      "(\\d{4})\\,?\\s?(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\\,?\\s?(\\d{1,2})": [1, -2, 3], // 2020 January 01
      "(0?[1-9]|1[0-2]) (0?[1-9]|[12][0-9]|3[01]) (\\d{4})": [3, 1, 2], // 12 10 1989
      "(\\d{4}) (0?[1-9]|1[0-2]) (0?[1-9]|[12][0-9]|3[01])": [1, 2, 3], // 1989 12 10
      "(\\d{1,2})[ .](\\d{4})": [2, 1, 3], // 1.2022 (индекс 3 невалидный)
      "(0?[1-9]|1[0-2])\\/(\\d{4})": [2, 1, 3], // 01/2022 (индекс 3 невалидный)
      "(\\d{4})(\\d{2})(\\d{2})": [1, 2, 3], // 20200831
      "(\\d{1,2})\\s?\\-?\\s?(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\\s?\\-\\s?(\\d{4})": [3, -2, 1],// 01-June-1975 or 1-Aug-1999
      "(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\\s?\\-\\s?(\\d{4})": [2, -1, 3],// June-1975 or Aug-1999 (индекс 3 невалидный)
      "(\\d{4})\\s?\\-\\s?(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)": [1, -2, 3],// 1977-January (индекс 3 невалидный)
      "(\\d{1,2}) (January\\.?\\,?|Jan\\.?\\,?|February\\.?\\,?|Feb\\.?\\,?|March\\.?\\,?|Mar\\.?\\,?|April\\.?\\,?|Apr\\.?\\,?|May\\.?\\,?|June\\.?\\,?|Jun\\.?\\,?|July\\.?\\,?|Jul\\.?\\,?|August\\.?\\,?|Aug\\.?\\,?|September\\.?\\,?|Sep\\.?\\,?|Sept\\.?\\,?|October\\.?\\,?|Oct\\.?\\,?|November\\.?\\,?|Nov\\.?\\,?|December\\.?\\,?|Dec\\.?\\,?)\\s?(\\d{4})": [3, -2, 1], // 12 Oct. 1921 or 22 July 1885 or 12 Oct, 1921
  };

  try {
    // Процесс перебора всех регулярных выражений
    for (const [regexStr, order] of Object.entries(regexes)) {
        const regex = new RegExp(regexStr);
        const match = trimmedDt.match(regex);
        if (match) {
            const res = [];
            // Преобразование полученного результата в массив с учетом порядка элементов
            for (const num of order) {
                const item = num < 0 ? _getMonthNumber(match[-num]) : Number(match[num])
                res.push(isNaN(item) ? "" : item);
            }
            return res;
        }
    }
    console.log('Неконсистентная дата: ', dateString);
    return [`Ошибка: ${dateString}`, "Ошибка", "Ошибка"];
  } catch (err) {
    console.log('Неконсистентная дата: ', dateString);
    return [`Ошибка Неконсистентная дата: ${dateString}`, "Ошибка", "Ошибка"];
  }
}

/**
 * Вспомогательная функция для получения номера месяца по названию месяца.
 * 
 * @param {string} month - Название месяца (например, 'January', 'Feb', 'Mar').
 * @returns {number} Номер месяца (например, 1 для 'January', 2 для 'February').
 */
function _getMonthNumber(month) {
    const monthMap = {
        'January': 1,
        'Jan': 1,
        'Jan.': 1,
        'Jan,': 1,
        'February': 2,
        'Feb': 2,
        'Feb.': 2,
        'Feb,': 2,
        'March': 3,
        'Mar': 3,
        'Mar.': 3,
        'Mar,': 3,
        'April': 4,
        'Apr': 4,
        'Apr.': 4,
        'Apr,': 4,
        'May': 5,
        'June': 6,
        'Jun': 6,
        'Jun.': 6,
        'Jun,': 6,
        'July': 7,
        'Jul': 7,
        'Jul.': 7,
        'Jul,': 7,
        'August': 8,
        'Aug': 8,
        'Aug.': 8,
        'Aug,': 8,
        'September': 9,
        'Sep': 9,
        'Sep.': 9,
        'Sep,': 9,
        'Sept': 9,
        'Sept.': 9,
        'Sept,': 9,
        'October': 10,
        'Oct': 10,
        'Oct.': 10,
        'Oct,': 10,
        'November': 11,
        'Nov': 11,
        'Nov.': 11,
        'Nov,': 11,
        'December': 12,
        'Dec': 12,
        'Dec.': 12,
        'Dec,': 12,
    };
    const monthKey = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

    if (monthKey in monthMap) {
        return monthMap[monthKey];
    } else {
        return month;
    }
}