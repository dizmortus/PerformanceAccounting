'use client';

import { useState } from 'react';
import { FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';

const UserProfile = ({ login, onLogout }) => {
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg p-3 flex items-center space-x-3 border">
            <span className="text-gray-900 font-semibold">{login}</span>
            <button
                className="p-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:from-teal-600 hover:to-blue-600 transition relative group text-lg"
                onClick={() => setSettingsOpen(!settingsOpen)}
            >
                <FaUser />
            </button>
            {settingsOpen && (
                <div className="mt-2 w-40 bg-white shadow-lg rounded-lg border p-2 absolute right-0 top-16">
                    <button
                        className="w-full px-4 py-2 text-gray-900 flex items-center space-x-2 hover:bg-gray-100"
                        onClick={() => alert('Настройки')}
                    >
                        <FaCog />
                        <span>Настройки</span>
                    </button>
                    <button
                        className="w-full px-4 py-2 text-gray-900 flex items-center space-x-2 hover:bg-gray-100"
                        onClick={onLogout}
                    >
                        <FaSignOutAlt />
                        <span>Выход</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserProfile;