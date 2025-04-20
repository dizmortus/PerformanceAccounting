import { FaUsers, FaFileAlt, FaUsersCog, FaUserGraduate, FaChevronRight } from 'react-icons/fa';

const SidebarAdminContent = ({ selectedCategory, handleCategorySelect }) => {
    const categories = [
        { id: 'users', label: 'Пользователи', icon: <FaUsers /> },
        { id: 'statements', label: 'Ведомости', icon: <FaFileAlt /> },
        { id: 'groups', label: 'Группы', icon: <FaUsersCog /> },
        { id: 'students', label: 'Студенты', icon: <FaUserGraduate /> }, // New category
    ];

    return (
        <>
            <div className="mt-12 px-2">
                <h2 className="text-lg font-semibold text-black text-center mb-3">Категории</h2>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 p-2">
                {categories.map((category) => (
                    <button 
                        key={category.id} 
                        className={`flex items-center justify-between w-full p-3 text-gray-900 shadow rounded-lg transition border-l-4 
                                    ${selectedCategory === category.id ? 'bg-teal-600 text-white border-teal-700' : 'bg-gray-200 border-teal-500'} 
                                    hover:bg-teal-500 hover:text-white hover:shadow-lg hover:scale-[1.02]`}
                        onClick={() => handleCategorySelect(category.id)}
                    >
                        <div className="flex items-center space-x-2">
                            <div className={`p-2 rounded-full transition 
                                            ${selectedCategory === category.id ? 'bg-white text-teal-600' : 'bg-teal-500 text-white'} 
                                            group-hover:bg-white group-hover:text-teal-500`}>
                                {category.icon}
                            </div>
                            <span className="text-base font-medium">{category.label}</span>
                        </div>
                        <FaChevronRight className={`text-gray-500 text-sm transition 
                                                    ${selectedCategory === category.id ? 'text-white' : 'group-hover:text-white'}`} />
                    </button>
                ))}
            </div>
        </>
    );
};

export default SidebarAdminContent;