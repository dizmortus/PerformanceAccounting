import { useState, useEffect } from 'react';
import { FaChevronLeft } from 'react-icons/fa';

const Sidebar = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const savedState = typeof window !== 'undefined' ? localStorage.getItem('sidebarOpen') : null;
        return savedState !== null ? JSON.parse(savedState) : true;
    });

    useEffect(() => {
        localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    }, [sidebarOpen]);

    const toggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    return (
        <div 
            className={`transition-all duration-300 flex flex-col bg-white shadow-lg relative 
                        ${sidebarOpen ? 'w-64' : 'w-16'} 
                        my-4 rounded-r-lg`} // <-- Вернули скругление и отступы
            style={{ height: "calc(100vh - 2rem)" }}
        >
            {/* Кнопка вне прокрутки, не обрезается, absolute позиционируется по родителю */}
            <div className={`absolute top-4 z-10 ${sidebarOpen ? 'left-4' : 'left-1/2 transform -translate-x-1/2'} 
                            flex items-center space-x-4 transition-all duration-300`}>
                <button 
                    className="p-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:from-teal-600 hover:to-blue-600 transition relative group"
                    onClick={toggleSidebar}
                >
                    <FaChevronLeft className={sidebarOpen ? 'rotate-180 transition' : 'transition'} />
                    {/* Подсказка НЕ скрывается благодаря z-10 и no-overflow */}
                    <span className="absolute left-full ml-2 w-max bg-gray-300 text-gray-900 text-sm rounded p-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {sidebarOpen ? 'Скрыть' : 'Открыть'}
                    </span>
                </button>
            </div>

            {/* Контент с прокруткой */}
            <div className="flex-1 overflow-y-auto mt-8 px-6">
                {sidebarOpen && children}
            </div>
        </div>
    );
};

export default Sidebar;
