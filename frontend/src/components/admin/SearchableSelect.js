import { useState, useRef, useEffect } from "react";

const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder, 
    error, 
    disabled,
    fontSize = "base",
    formatOption = (option) => option.toString(),
    searchBy = (option) => formatOption(option).toLowerCase(),
    getOptionValue = (option) => option.id || option.value || option.login || option
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    
    const filteredOptions = options.filter(option => 
        searchBy(option).includes(searchTerm.toLowerCase())
    );
    
    const selectedOption = options.find(option => {
        const optionValue = getOptionValue(option);
        return optionValue === value;
    });
    
    // Обработчик клика вне компонента
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        }
        
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleSelect = (option) => {
        onChange(getOptionValue(option));
        setIsOpen(false);
        setSearchTerm("");
    };
    
    const handleInputClick = () => {
        if (disabled) return;
        
        // Если поле пустое или значение не выбрано - открываем список
        if (!selectedOption || searchTerm === "") {
            setIsOpen(true);
            setSearchTerm("");
            // Устанавливаем фокус на инпут при открытии
            setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            // Если значение выбрано - очищаем выбор
            onChange(null);
            setSearchTerm("");
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };
    
    const getOptionKey = (option, index) => {
        const value = getOptionValue(option);
        return typeof value === 'object' ? 
            JSON.stringify(value) || index : 
            value || index;
    };
    
    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? searchTerm : (selectedOption ? formatOption(selectedOption) : "")}
                    onChange={(e) => {
                        if (!isOpen) setIsOpen(true);
                        setSearchTerm(e.target.value);
                    }}
                    onClick={handleInputClick}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-2 py-1 border rounded-lg ${
                        error ? "border-red-500" : "border-gray-300"
                    } text-${fontSize} cursor-pointer`}
                    readOnly={!isOpen}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            
            {isOpen && (
                <div className={`
                    absolute z-50 mt-1 w-full bg-white shadow-lg 
                    max-h-60 rounded-md py-1 ring-1 ring-black ring-opacity-5 
                    overflow-auto focus:outline-none text-${fontSize}
                `}>
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-2 text-gray-500">Ничего не найдено</div>
                    ) : (
                        filteredOptions.map((option, index) => (
                            <div
                                key={getOptionKey(option, index)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelect(option);
                                }}
                            >
                                {formatOption(option)}
                            </div>
                        ))
                    )}
                </div>
            )}
            
            {error && (
                <p className={`text-red-500 text-${fontSize} mt-1`}>{error}</p>
            )}
        </div>
    );
};

export default SearchableSelect;