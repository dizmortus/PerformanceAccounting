import React, { useState } from 'react';
import { downloadStatement } from '../utils/api';

const SuccessModal = ({ 
  isOpen, 
  onClose, 
  onSendByEmail,
  statementId,
  successText = "Ведомость успешно создана!"
}) => {
  const [fileFormat, setFileFormat] = useState('docx');

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      await downloadStatement(statementId, fileFormat === 'pdf');
    } catch (error) {
      console.error('Ошибка при скачивании:', error);
      // Можно добавить обработку ошибки (например, показать уведомление)
    }
  };

  const handleSendByEmail = () => {
    onSendByEmail(fileFormat);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 modal-open">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm text-center relative">
        <div className="flex justify-between items-center mb-4">
          <p className="text-lg font-semibold">{successText}</p>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Переключатель формата файла */}
        <div className="mb-4">
          <div className="flex bg-white rounded-lg overflow-hidden h-[40px] border border-gray-300 w-full shadow-sm ">
            <button
              className={`flex-1 px-3 text-sm flex items-center justify-center transition-all ${
                fileFormat === 'docx' 
                  ? 'bg-blue-600 text-white font-medium shadow-inner' 
                  : 'text-gray-700 hover:bg-gray-50 font-medium'
              }`}
              onClick={() => setFileFormat('docx')}
            >
              DOCX
            </button>
            <button
              className={`flex-1 px-3  text-sm flex items-center justify-center transition-all ${
                fileFormat === 'pdf' 
                  ? 'bg-red-600 text-white font-medium shadow-inner' 
                  : 'text-gray-700 hover:bg-gray-50 font-medium'
              }`}
              onClick={() => setFileFormat('pdf')}
            >
              PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <button 
            className=" h-[40px] w-full px-4 py-1.5 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition text-sm"
            onClick={handleDownload}
          >
            Скачать
          </button>
          <button 
            className=" h-[40px] w-full px-4 py-1.5 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition text-sm"
            onClick={handleSendByEmail}
          >
            Отправить по почте
          </button>

        </div>
      </div>
    </div>
  );
};

export default SuccessModal;