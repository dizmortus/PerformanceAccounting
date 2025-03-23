// import docxConverter from 'docx-pdf';
// import path from 'path';

// // Функция для конвертации DOCX в PDF
// export const convertDocxToPdf = (docxPath) => {
//     return new Promise((resolve, reject) => {
//         const pdfPath = docxPath.replace(".docx", ".pdf");

//         // Конвертация с использованием docx-pdf
//         docxConverter(docxPath, pdfPath, (err, result) => {
//             if (err) {
//                 console.error("Ошибка при конвертации DOCX в PDF:", err);
//                 return reject(err);
//             }
//             resolve(pdfPath); // Возвращаем путь к PDF файлу
//         });
//     });
// };
