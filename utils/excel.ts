import { Material, Vehicle, Movement } from '../types';

declare global {
  interface Window {
    XLSX: any;
  }
}

export const exportToExcel = (data: any[], fileName: string) => {
  if (!window.XLSX) {
    alert("Erro: Biblioteca Excel não carregada.");
    return;
  }
  const ws = window.XLSX.utils.json_to_sheet(data);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "Dados");
  window.XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const parseExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!window.XLSX) {
      reject("Biblioteca Excel não carregada.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = window.XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};