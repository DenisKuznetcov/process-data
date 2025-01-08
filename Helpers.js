// Функция для преобразования значений в диапазоне с использованием карты соответствий отношений с усопшими
function mapComment(rangeVals) {
  const deceasedRelationshipMappings = new Map([
    ['2', 'Relationship to Deceased - Foreign Veteran'],
    ['3', 'Relationship to Deceased - Civilian'],
    ['A', 'Relationship to Deceased - Adult Dependent Daughter'],
    ['B', 'Relationship to Deceased - Adult Dependent Son'],
    ['D', 'Relationship to Deceased - Daughter (Minor Child)'],
    ['H', 'Relationship to Deceased - Husband'],
    ['M', 'Relationship to Deceased - Mother'],
    ['N', 'Relationship to Deceased - Not Related'],
    ['O', 'Relationship to Deceased - Other Relative'],
    ['S', 'Relationship to Deceased - Son (Minor Child)'],
    ['T', 'Relationship to Deceased - Adult Dependent Stepdaughter'],
    ['U', 'Relationship to Deceased - Unknown'],
    ['V', 'Relationship to Deceased - Veteran (Self)'],
    ['W', 'Relationship to Deceased - Wife'],
    ['X', 'Relationship to Deceased - Step-Son (Minor Child)'],
    ['Y', 'Relationship to Deceased - Stepdaughter (Minor Child)'],
    ['Z', 'Relationship to Deceased - Adult Dependent Stepdaughter']
  ]);
  
  // Преобразует значения, используя карту или возвращает по умолчанию
  return rangeVals.map(v => deceasedRelationshipMappings.get(v[0]) === undefined ? 
  [v[0] === "" ? "" : 'Relationship to Deceased - ' + v[0]] : 
  [deceasedRelationshipMappings.get(v[0])])
}

// Функция для замены "JR" на "Jr" и "SR" на "Sr"
function modTitle(rangeVals) {
  return rangeVals.map(v => v[0] === "JR" ? ["Jr"] : [v[0] === 'SR' ? 'Sr' : v[0]])
}

// Функция для нормализации имен (например, для Mc, Mac, O', D', DI' и т.д.)
function normalizeName(rangeVals) {
  return rangeVals.map(v => {
    const name = String(v[0]).trim();

    // Обрабатывает специфические случаи для имен с префиксами
    if (name.startsWith("MC")) {
      return ["Mc" + name.charAt(2).toUpperCase() + name.slice(3).toLowerCase()]
    } 
    else if (name.startsWith("MAC") && name.length > 5) {
      return ["Mac" + name.charAt(3).toUpperCase() + name.slice(4).toLowerCase()]
    }
    else if (name.startsWith("O'")) {
      return ["O'" + name.charAt(2).toUpperCase() + name.slice(3).toLowerCase()]
    }
    else if (name.startsWith("D'")) {
      return ["D'" + name.charAt(2).toUpperCase() + name.slice(3).toLowerCase()]
    }
    else if (name.startsWith("DI'")) {
      return ["Di'" + name.charAt(3).toUpperCase() + name.slice(4).toLowerCase()]
    }

    // Нормализует каждую часть имени
    let splitted = name.split(" ");
    const result = [];

    for (let part of splitted) {
      part = part.trim();
      
      let subParts = part.split("-");
      for (let i = 0; i < subParts.length; i++) {
        let subPart = subParts[i];
        if (subPart.length === 1) {
          subParts[i] = subPart.toUpperCase() + '.'; // Обрабатывает односимвольные части
        } else {
          subParts[i] = subPart.charAt(0).toUpperCase() + subPart.slice(1).toLowerCase(); // Нормализует остальные части
        }
      }
      
      // Соединяет части обратно с дефисом
      result.push(subParts.join("-"));
    }

    return [result.join(" ")];
  })
}

// Функция для вставки данных в лист по частям (в чанках)
function pasteDataInChunks(sheet, startIdx, valuesToBeCopied, chunkSize) {
  let rowCount = valuesToBeCopied.length;
  let columnsCount = valuesToBeCopied[0].length;
  
  // Вставляет данные в чанках заданного размера
  for (let i = 0; i < rowCount; i += chunkSize) {
    let chunk = valuesToBeCopied.slice(i, i + chunkSize);
    sheet.getRange(2 + i, startIdx, chunk.length, columnsCount).setValues(chunk);
  }
}

// Функция для создания трех таблиц: Site list, Deceased и Contacts
function getThreeTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startSheet = ss.getSheetByName("Start");

  // Проверяет наличие листа "Start"
  if (startSheet === null) {
    console.log("Нет листа Start");
    return;
  }

  const sheets = [
    { name: "Site list", range: "A1:AB", columns: 28 },
    { name: "Deceased", range: "AC1:DM", columns: 89 },
    { name: "Contacts", range: "DN1:" + _getLastColForSheet(startSheet), columns: startSheet.getLastColumn() - 28 - 89 }
  ];

  const grandLastRow = startSheet.getLastRow();
  let sourceRange, sourceData;

  // Создает или обновляет листы, копируя данные с формата "Start"
  for (let i = 0; i < sheets.length; i++) {
    const { name, range, columns } = sheets[i];
    if (ss.getSheetByName(name) !== null) {
      console.log(`Лист ${name} уже существует`);
      continue;
    }
    const newSheet = ss.insertSheet(name);
    newSheet.getRange('A:C').setNumberFormat('@STRING@');
    newSheet.getRange('K:L').setNumberFormat('@STRING@');
    sourceRange = startSheet.getRange(`${range}${grandLastRow}`);
    sourceData = sourceRange.getDisplayValues();
    name !== 'Deceased' ? newSheet.getRange(1, 1, sourceData.length, columns)
      .setValues(sourceData)
      .setBackgrounds(sourceRange.getBackgrounds())
      .removeDuplicates()
      .createFilter() :

      newSheet.getRange(1, 1, sourceData.length, columns)
      .setValues(sourceData)
      .setBackgrounds(sourceRange.getBackgrounds())
      .createFilter()

    // Удаляет пустые строки внизу
    const newLastRow = newSheet.getLastRow();
    const numRowsToDelete = newSheet.getMaxRows() - newLastRow;
    if (numRowsToDelete > 0) {
      newSheet.deleteRows(newLastRow + 1, numRowsToDelete);
    }
   
    newSheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
}

// Функция для получения последней колонки в листе
function _getLastColForSheet(sheet) {
  const lastColumnName = sheet.getRange(1, sheet.getLastColumn()).getA1Notation();
  const columnName = lastColumnName.replace(/\d+/g, '');
  return columnName;
}
