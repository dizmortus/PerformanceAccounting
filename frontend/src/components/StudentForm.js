'use client';
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import PracticeForm from './PracticeForm';
import AttestationForm from './AttestationForm';
import { fetchStudents, fetchPossibleGrades, downloadStatement } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import WarningModal from './WarningModal';
import SuccessModal from './SuccessModal';
import { useRef } from "react";
import { useQueryClient } from '@tanstack/react-query';

const StudentForm = ({
    selectedGroup,
    filteredStatements,
    handleCancelSelection,
}) => {
    // 1. State declarations
    const [mode, setMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('studentFormMode') || 'statement';
        }
        return 'statement';
    });

    const [selectedStatementId, setSelectedStatementId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('selectedStatementId') || "";
        }
        return "";
    });
    
    const [filteredGrades, setFilteredGrades] = useState([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [confirmationData, setConfirmationData] = useState({
        action: null,
        text: "Подтвердите действие",
        successMessage: "",
        shouldDownload: false
    });

    // 2. React Query hooks
    const { data: students = [], refetch: refetchStudents } = useQuery({
        queryKey: ['students', selectedGroup],
        queryFn: () => fetchStudents(selectedGroup),
        enabled: !!selectedGroup,
        select: (data) => data.sort((a, b) => a.lastName.localeCompare(b.lastName))
    });

    const { data: possibleGrades = {} } = useQuery({
        queryKey: ['possibleGrades'],
        queryFn: fetchPossibleGrades,
        staleTime: Infinity
    });

    // 3. Helper functions
    const isTodayStatement = useCallback((statement) => {
        // First check if statement.list is empty or whitespace
        if (statement.list && statement.list.trim() !== '') {
            return false;
        }
        
        // Then check if the date is today
        const today = new Date();
        const todayLocalDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayString = todayLocalDate.toISOString().split('T')[0];
        
        const statementDate = new Date(statement.date);
        const statementLocalDate = new Date(statementDate.getFullYear(), statementDate.getMonth(), statementDate.getDate());
        const statementDateString = statementLocalDate.toISOString().split('T')[0];
        
        return statementDateString === todayString;
    }, []);

    const hasTodayStatement = useCallback(() => {
        return filteredStatements.some(isTodayStatement);
    }, [filteredStatements, isTodayStatement]);

    const getAvailableStatements = useCallback(() => {
        return mode === 'learning' 
            ? filteredStatements 
            : filteredStatements.filter(isTodayStatement);
    }, [mode, filteredStatements, isTodayStatement]);

    // 4. Effects for local storage and derived state
    React.useEffect(() => {
        if (typeof window !== 'undefined' && selectedStatementId) {
            localStorage.setItem('selectedStatementId', selectedStatementId);
        }
    }, [selectedStatementId]);

    React.useEffect(() => {
        const availableStatements = getAvailableStatements();
        
        if (availableStatements.length > 0) {
            const savedId = localStorage.getItem('selectedStatementId');
            const isValidSavedId = savedId && availableStatements.some(s => s.id === savedId);
            const newId = isValidSavedId ? savedId : availableStatements[0].id;
            
            if (newId !== selectedStatementId) {
                setSelectedStatementId(newId);
            }
        } else if (selectedStatementId !== "") {
            setSelectedStatementId("");
        }
    }, [getAvailableStatements, selectedStatementId]);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('studentFormMode', mode);
        }
    }, [mode]);

    React.useEffect(() => {
        if (selectedStatementId && filteredStatements.length) {
            const selectedStatement = filteredStatements.find(statement => statement.id === selectedStatementId);
            const assessmentType = mode === 'learning' 
                ? 'занятие'
                : selectedStatement?.assessmentType;

            const grades = assessmentType 
                ? possibleGrades[assessmentType] || [] 
                : [];
            setFilteredGrades(grades);
        } else {
            setFilteredGrades([]);
        }
    }, [selectedStatementId, filteredStatements, possibleGrades, mode]);

    // 5. Event handlers
    const handleStatementSelect = (statementId) => {
        setSelectedStatementId(statementId);
    };

    const handleSetLearningMode = () => {
        setMode('learning');
    };
    
    const handleSetStatementMode = () => {
        if (!hasTodayStatement()) {
            showWarningModal("Нет ведомости с сегодняшней датой. Аттестация невозможна.");
            return;
        }
        setMode('statement');
    };

    const openConfirmModal = (action, text, successMessage, shouldDownload = false) => {
        setConfirmationData({
            action,
            text: text || "Подтвердите действие",
            successMessage: successMessage || "",
            shouldDownload
        });
        setIsConfirmModalOpen(true);
    };

    const handleSubmitConfirm = async () => {
        if (confirmationData.action) {
            try {
                await confirmationData.action();
                
                if (confirmationData.successMessage !== "") {
                    setIsSuccessModalOpen(true);
                }
            } catch (error) {
                console.error("Ошибка при выполнении действия:", error);
                alert("Произошла ошибка: " + error.message);
            }
        }
        setIsConfirmModalOpen(false);
    };

    const closeConfirmModal = () => setIsConfirmModalOpen(false);
    const showWarningModal = (message) => {
        setConfirmationData(prev => ({
            ...prev,
            warningMessage: message || "Выберите оценки для всех студентов перед отправкой!"
        }));
        setIsWarningModalOpen(true);
    };
    const closeWarningModal = () => setIsWarningModalOpen(false);
    const queryClient = useQueryClient();

    // Модифицированная функция закрытия SuccessModal
    const closeSuccessModal = () => {
        setIsSuccessModalOpen(false);
        queryClient.invalidateQueries(['statements', selectedGroup]);
    };

    const availableStatements = getAvailableStatements();

    // Вспомогательная функция для сокращения первого слова
    const shortenFirstWord = (text) => {
        const words = text.split(' ');
        if (words.length > 1) return text;
        return words[0].length > 10 ? `${words[0].substring(0, 8)}.` : words[0];
    };

    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const didDragRef = useRef(false); // 🆕 флаг для отмены клика
    
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setIsMouseDown(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        didDragRef.current = false; // сброс
    };
    
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    
        // если смещение > 5px, это считается drag
        if (Math.abs(x - startX) > 5) {
            didDragRef.current = true;
        }
    };
    
    const handleMouseUp = () => {
        setIsDragging(false);
        setIsMouseDown(false);
    
        // сброс через короткий таймер, чтобы onClick не сработал после drag
        setTimeout(() => {
            didDragRef.current = false;
        }, 0);
    };
    
    const handleMouseLeave = () => {
        setIsDragging(false);
        setIsMouseDown(false);
    };
    
    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
                {/* ВЕРХНЯЯ ПАНЕЛЬ */}
                <div className="flex items-center justify-between mb-4 gap-4 p-1 rounded-lg border border-gray-200 bg-gray-50 shadow-sm">
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                        onWheel={(e) => {
                            if (e.deltaY !== 0) {
                                e.currentTarget.scrollLeft += e.deltaY;
                            }
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                    >
                        <div className="flex space-x-2 " style={{ minWidth: 'max-content' }}>
                            {availableStatements.length > 0 ? (
                                availableStatements.map(statement => (
                                    <button
                                        key={statement.id}
                                        className={`px-3 py-2 min-w-[220px] max-w-[220px] h-[50px] text-left rounded border shadow-sm transition-all flex flex-col justify-center relative group ${
                                            selectedStatementId === statement.id
                                                ? 'bg-teal-600 text-white border-teal-700 shadow-inner'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-teal-300'
                                        }`}
                                        onClick={(e) => {
                                            if (didDragRef.current) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                return; // отменяем выбор, если был drag
                                            }
                                            handleStatementSelect(statement.id);
                                        }}
                                        disabled={mode === 'statement' && !hasTodayStatement()}
                                        title={statement.disciplineName}
                                    >
                                        <div className="font-semibold text-sm leading-none mb-1 line-clamp-1">
                                            {shortenFirstWord(statement.assessmentType)}
                                        </div>
                                        <div className={`text-xs leading-none line-clamp-1 overflow-hidden overflow-ellipsis ${
                                            selectedStatementId === statement.id ? 'text-teal-100' : 'text-gray-500'
                                        }`}>
                                            {statement.disciplineName}
                                        </div>

                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                            {statement.disciplineName}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-0 border-t-4 border-gray-800 border-l-transparent border-r-transparent"></div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-2 min-w-[180px] h-[60px] flex flex-col justify-center text-center rounded border border-gray-200 bg-gray-100 text-gray-500">
                                    {mode === 'statement' ? 'Нет ведомостей на сегодня' : 'Нет доступных ведомостей'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* РАЗДЕЛИТЕЛЬ */}
                    <div className="w-px h-8 bg-gray-300 mx-1" />

                    {/* ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА */}
                    <div className="flex bg-white rounded-lg overflow-hidden h-[50px] border border-gray-300 min-w-[200px] shadow-sm">
                        <button
                            className={`flex-1 px-3 text-xs flex items-center justify-center transition-all ${
                                mode === 'learning' 
                                    ? 'bg-teal-600 text-white font-medium shadow-inner' 
                                    : 'text-gray-700 hover:bg-gray-50 font-medium'
                            }`}
                            onClick={handleSetLearningMode}
                        >
                            Текущее
                        </button>
                        <button
                            className={`flex-1 px-3 text-xs flex items-center justify-center transition-all ${
                                mode === 'statement' 
                                    ? 'bg-teal-600 text-white font-medium shadow-inner' 
                                    : 'text-gray-700 hover:bg-gray-50 font-medium'
                            }`}
                            onClick={handleSetStatementMode}
                        >
                            Аттестация
                        </button>
                    </div>
                </div>

                {/* Остальная часть компонента без изменений */}
                {mode === 'learning' ? (
                    <PracticeForm 
                        selectedStatementId={selectedStatementId}
                        handleCancelSelection={handleCancelSelection}
                        students={students}
                        filteredGrades={filteredGrades}
                        onOpenConfirm={openConfirmModal}
                        onShowWarning={showWarningModal}
                    />
                ) : (
                    hasTodayStatement() ? (
                        <AttestationForm 
                            selectedStatementId={selectedStatementId}
                            handleCancelSelection={handleCancelSelection}
                            students={students}
                            filteredGrades={filteredGrades}
                            onOpenConfirm={openConfirmModal}
                            onShowWarning={showWarningModal}
                            onShowSuccess={(message) => {
                                setConfirmationData(prev => ({
                                    ...prev,
                                    successMessage: message
                                }));
                                setIsSuccessModalOpen(true);
                            }}
                        />
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            Нет ведомости с сегодняшней датой для аттестации
                        </div>
                    )
                )}
            </div>
            
            {/* Модальные окна (без изменений) */}
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={closeConfirmModal}
                onConfirm={handleSubmitConfirm}
                confirmText={confirmationData.text}
            />
            
            <WarningModal
                isOpen={isWarningModalOpen}
                onClose={closeWarningModal}
                warningText={confirmationData.warningMessage}
            />
            
            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={closeSuccessModal}
                successText={confirmationData.successMessage}
                onDownload={mode === 'statement' ? () => {
                    downloadStatement(selectedStatementId);
                } : null}
            />
        </>
    );
};

export default StudentForm;