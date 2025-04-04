import { useState, useEffect } from 'react';
import { FaChevronLeft } from 'react-icons/fa';

const Sidebar = ({ children }) => {
    // Загружаем состояние из localStorage или используем true по умолчанию
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const savedState = typeof window !== 'undefined' ? localStorage.getItem('sidebarOpen') : null;
        return savedState !== null ? JSON.parse(savedState) : true;
    });

    useEffect(() => {
        // Сохраняем состояние в localStorage при изменении
        localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    }, [sidebarOpen]);

    const toggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    return (
        <div 
            className={`transition-all duration-300 flex flex-col h-screen ${sidebarOpen ? 'w-64' : 'w-16'} bg-white p-[1.5rem] shadow-lg relative rounded-r-lg`}
        >
            {/* Кнопка для переключения видимости сайдбара */}
            <div className={`absolute top-4 ${sidebarOpen ? 'left-4' : 'left-1/2 transform -translate-x-1/2'} flex items-center space-x-4 transition-all duration-300`}>
                <button 
                    className="p-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:from-teal-600 hover:to-blue-600 transition relative group"
                    onClick={toggleSidebar}
                >
                    <FaChevronLeft className={sidebarOpen ? 'rotate-180 transition' : 'transition'} />
                    <span className="absolute left-full ml-2 w-max bg-gray-300 text-gray-900 text-sm rounded p-1 opacity-0 group-hover:opacity-100 transition">
                        {sidebarOpen ? 'Скрыть' : 'Открыть'}
                    </span>
                </button>
            </div>

            {/* Отображаем children, если сайдбар открыт */}
            {sidebarOpen && children}
        </div>
    );
};

export default Sidebar;