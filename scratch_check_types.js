import { drawingRegisterData } from './src/data/drawingRegisterData.js';

console.log("Checking drawingRegisterData types...");
let errCount = 0;
drawingRegisterData.drawings.forEach((d, idx) => {
  if (typeof d.sheetNo !== 'string') {
    console.log(`Row ${idx}: sheetNo is not string:`, typeof d.sheetNo, d.sheetNo);
    errCount++;
  }
  if (typeof d.sheetName !== 'string') {
    console.log(`Row ${idx}: sheetName is not string:`, typeof d.sheetName, d.sheetName);
    errCount++;
  }
});
console.log(`Done. Found ${errCount} type errors.`);
