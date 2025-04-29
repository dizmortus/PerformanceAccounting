// WarningModal.js
import React from 'react';

const WarningModal = ({ isOpen, onClose, warningText }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 modal-open">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <h2 className="text-xl font-semibold mb-4">Внимание</h2>
                <p className="text-gray-700 mb-4">{warningText}</p>
                <button
                    onClick={onClose}
                    className="w-36 px-6 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                >
                    ОК
                </button>
            </div>
        </div>
    );
};

export default WarningModal;
