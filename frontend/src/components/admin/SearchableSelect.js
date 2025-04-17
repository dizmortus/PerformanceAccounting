// SearchableSelect.jsx
import { useState } from "react";

const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder, 
    error, 
    disabled,
    formatOption = (option) => option.toString(),
    searchBy = (option) => formatOption(option).toLowerCase()
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    
    const filteredOptions = options.filter(option => 
        searchBy(option).includes(searchTerm.toLowerCase())
    );
    
    const handleSelect = (value) => {
        onChange({ target: { value } });
        setIsOpen(false);
        setSearchTerm("");
    };
    
    return (
        <div className="relative">
            <div className="relative">
                <input
                    type="text"
                    value={isOpen ? searchTerm : (value ? options.find(o => o.id === value || o.login === value) ? 
                        formatOption(options.find(o => o.id === value || o.login === value)) : "" : "")
                    }
                    onChange={(e) => {
                        if (!isOpen) setIsOpen(true);
                        setSearchTerm(e.target.value);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-2 py-1 border rounded-lg ${error ? "border-red-500" : ""}`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-2 text-gray-500">Ничего не найдено</div>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option.id || option.login}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleSelect(option.id || option.login)}
                            >
                                {formatOption(option)}
                            </div>
                        ))
                    )}
                </div>
            )}
            
            {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
        </div>
    );
};
export default SearchableSelect;