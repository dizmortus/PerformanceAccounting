import React, { useState } from 'react';

const SuccessModal = ({ isOpen, onClose, onDownload, onSendByEmail }) => {
    if (!isOpen) return null;   
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 modal-open">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm text-center">
          <p className="text-lg font-semibold mb-4">Ведомость успешно создана!</p>
          <div className="flex flex-col space-y-3">
            <button 
              className="w-full px-6 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
              onClick={onDownload}
            >
              Скачать
            </button>
            <button 
              className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
              onClick={onSendByEmail}
            >
              Отправить по почте
            </button>
            <button 
              className="w-full px-6 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
};

export default SuccessModal;
