import React from 'react';

const SuccessModal = ({ isOpen, onClose, onDownload }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center">
                <p className="text-lg font-semibold mb-4">Ведомость успешно создана!</p>
                <div className="flex justify-center space-x-4">
                    <button 
                        className="w-36 px-6 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                        onClick={onClose}
                    >
                        Закрыть
                    </button>
                    <button 
                        className="w-36 px-6 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                        onClick={onDownload}
                    >
                        Скачать
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;
