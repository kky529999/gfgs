/**
 * debug-excel.js
 * 调试 Excel 文件结构
 */
const XLSX = require('xlsx');
const path = require('path');

const xlsxPath = path.join(__dirname, '..', 'data', '客户进度表(4月2日).xlsx');
const workbook = XLSX.readFile(xlsxPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log('Sheet names:', workbook.SheetNames);
console.log('\n总行数:', rows.length);
console.log('\n前5条数据:');
rows.slice(0, 5).forEach((r, i) => {
  console.log(`\n--- 第${i+1}行 ---`);
  console.log(JSON.stringify(r, null, 2));
});
