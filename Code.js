/**
 * Функция `PrepSection` предназначена для автоматизации сборки данных по сектору с листа "raw data" с сырыми данными от заказчика.
 * Часть данных не нужна, поэтому пропускается с помощью сета skippedFields.
 * Данные нормализуются (из капслока в нормальный текст, с учетом особенностей ("MCDONALD" -> "McDonald", "W T" -> "W. T." и пр.)).
 * Также обрабатываются даты + проставляются стандартные значения (напр., interment_rights = Single).
 * Затем нормализованные данные проставляются на лист "Start".
 * После этого лист разделяется на 3 таблицы: Site list, Deceased и Contacts.
 * 
 * Скрипт запускается по нажатию на кнопку на листе "run script"
 */
function PrepSection() {
  // Список полей, которые нужно пропустить
  const skippedFields = new Set(["numberID", "block", "row", "number", "z", "1", "2"]);

  // Получение данных с листа "raw data"
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("raw data");
  const rowCount = sheet.getLastRow() - 1;
  const indexesStart = sheet.getRange('1:1').getValues()[0];

  // Получение листа "Start"
  const startSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Start");

  // Карта соответствий для индексов и функций обработки данных
  const indexesMap = new Map([
    ['lot', {'startIdx': 2}],
    ['lot_status', {'startIdx': 7}],
    ['lot_type', {'startIdx': 6}],
    ['deceased_lastname', {'startIdx': [35, 123], 'applyFunc': normalizeName}],
    ['deceased_firstname', {'startIdx': [34, 122], 'applyFunc': normalizeName}],
    ['deceased_middlename', {'startIdx': [36, 124], 'applyFunc': normalizeName}],
    ['title', {'startIdx': [39, 127], 'applyFunc': modTitle}],
    ['DOB', {'startIdx': 43, 'applyFunc': parseDateMapped}],
    ['DOD', {'startIdx': 46, 'applyFunc': parseDateMapped}],
    ['DOD2', {'startIdx': 92, 'applyFunc': parseDateMapped}],
    ['3', {'startIdx': 114, 'applyFunc': mapComment}]
  ]);

  // Обрабатываем каждый индекс, который не пустой
  for (let k = 0; k < indexesStart.length; k++) {
    if (indexesStart[k] === "") { continue; }

    const settings = indexesMap.get(String(indexesStart[k]));
    if (settings !== undefined) {
      const { startIdx, applyFunc } = settings;
      let valuesToBeCopied = sheet.getRange(2, 1 + k, rowCount, 1).getDisplayValues();

      // Если есть функция обработки данных, применяем её
      if (applyFunc !== undefined && applyFunc !== null) {
        valuesToBeCopied = applyFunc(valuesToBeCopied);
      }

      // Если startIdx является массивом, вставляем данные в несколько колонок
      if (Array.isArray(startIdx)) {
        for (const idx of startIdx) {
          startSheet.getRange(2, idx, rowCount, valuesToBeCopied[0].length).setValues(valuesToBeCopied);
        }
      } else {
        pasteDataInChunks(startSheet, startIdx, valuesToBeCopied, 5000);
      }

    } else if (!skippedFields.has(indexesStart[k])) {
      console.log(`WARNING!\n${indexesStart[k]}\ncolumn cannot be mapped onto data loader columns, please check`);
    }
  }

  // Финализация: удаление лишних строк
  let newLastRow = startSheet.getLastRow();
  const numRowsToDelete = startSheet.getMaxRows() - newLastRow;
  if (numRowsToDelete > 0) {
    startSheet.deleteRows(newLastRow + 1, numRowsToDelete);
  }

  newLastRow = startSheet.getLastRow();

  // Устанавливаем формулы для некоторых диапазонов
  const rangesMap = new Map([
    [`AC2:AE${newLastRow}`, '=RC[-28]'],
    [`DN2:DP${newLastRow}`, '=RC[-117]'],
    [`AG2:AG${newLastRow}`, '=RC[1]&" "&RC[2]'],
    [`DQ2:DQ${newLastRow}`, '=RC[1]&" "&RC[2]']
  ]);

  // Применяем формулы к диапазонам
  for (const [range, formula] of rangesMap) {
    startSheet.getRange(range).setFormulaR1C1(formula);
  }

  // Убираем старый фильтр и создаем новый
  startSheet.getFilter() !== null ? startSheet.getFilter().remove() : null;
  startSheet.getRange(1, 1, startSheet.getLastRow(), startSheet.getLastColumn()).createFilter();

  // Вставляем оставшиеся данные
  const section = sheet.getRange("A2").getValue().toString().charAt(0).toUpperCase();
  startSheet.getRange(2, 1, startSheet.getLastRow() - 1, 1).setValue(section);
  startSheet.getRange(2, 8, startSheet.getLastRow() - 1, 1).setValue('Single');
  startSheet.getRange(2, 32, startSheet.getLastRow() - 1, 1).setValue(1);

  const deceasedFirstname = startSheet.getRange(2, 34, startSheet.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < deceasedFirstname.length; i++) {
    if (deceasedFirstname[i][0] !== "") {
      startSheet.getRange(i + 2, 61, 1, 1).setValue('Y');
    }
  }

  // Применяем изменения
  SpreadsheetApp.flush();

  // Вызываем функцию для создания таблиц
  getThreeTables();
}
