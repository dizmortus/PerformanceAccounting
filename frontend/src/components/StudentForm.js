'use client';
import React, { useState, useEffect, useCallback } from 'react';
import PracticeForm from './PracticeForm';
import AttestationForm from './AttestationForm';
import { fetchStudents, fetchPossibleGrades, downloadStatement } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import WarningModal from './WarningModal';
import SuccessModal from './SuccessModal';

const StudentForm = ({
    selectedGroup,
    filteredStatements,
    handleCancelSelection
}) => {
    // 1. Первым делом объявляем mode, так как он используется в других хуках
    const [mode, setMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('studentFormMode') || 'statement';
        }
        return 'statement';
    });

    // 2. Затем объявляем состояния, которые не зависят от других переменных
    const [selectedStatementId, setSelectedStatementId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('selectedStatementId') || "";
        }
        return "";
    });
    
    const [students, setStudents] = useState([]);
    const [possibleGrades, setPossibleGrades] = useState([]);
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

    // 3. Затем объявляем вспомогательные функции
    const isTodayStatement = useCallback((statement) => {
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

    // 4. Основные эффекты
    useEffect(() => {
        if (typeof window !== 'undefined' && selectedStatementId) {
            localStorage.setItem('selectedStatementId', selectedStatementId);
        }
    }, [selectedStatementId]);

    useEffect(() => {
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('studentFormMode', mode);
        }
    }, [mode]);

    useEffect(() => {
        const loadStudents = async () => {
            const studentsData = await fetchStudents(selectedGroup);
            const sortedStudents = studentsData.sort((a, b) => 
                a.lastName.localeCompare(b.lastName)
            );
            setStudents(sortedStudents);
        };

        if (selectedGroup) {
            loadStudents();
        }
    }, [selectedGroup]);

    useEffect(() => {
        fetchPossibleGrades().then(setPossibleGrades);
    }, []);

    useEffect(() => {
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

    // 5. Обработчики событий
    const handleStatementChange = (e) => {
        const newSelectedStatementId = e.target.value;
        setSelectedStatementId(newSelectedStatementId);
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
    const closeSuccessModal = () => setIsSuccessModalOpen(false);

    const availableStatements = getAvailableStatements();

    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-3xl bg-white p-6 rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-2rem)] overflow-auto">
                <div className="flex items-center justify-between mb-6 gap-4">
                    <select
                        className="flex-1 p-3 border bg-white text-gray-900 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-md hover:border-teal-400 h-[52px]"
                        value={selectedStatementId}
                        onChange={handleStatementChange}
                        disabled={mode === 'statement' && !hasTodayStatement()}
                    >
                        {availableStatements.length > 0 ? (
                            availableStatements.map(statement => (
                                <option key={statement.id} value={statement.id}>
                                    {statement.disciplineName} - {statement.assessmentType}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>
                                {mode === 'statement' ? 'Нет доступных ведомостей на сегодня' : 'Нет доступных ведомостей'}
                            </option>
                        )}
                    </select>
                    
                    <div className="flex bg-gray-100 rounded-lg overflow-hidden h-[52px] border border-gray-200">
                        <button
                            className={`flex-1 px-4 transition-all text-sm flex items-center justify-center ${
                                mode === 'learning' 
                                    ? 'bg-teal-600 text-white font-medium shadow-inner' 
                                    : 'text-gray-700 hover:bg-gray-50 font-medium'
                            }`}
                            onClick={handleSetLearningMode}
                        >
                            Практика
                        </button>
                        <button
                            className={`flex-1 px-4 transition-all text-sm flex items-center justify-center ${
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
                onDownload={mode === 'statement' ? () => downloadStatement(selectedStatementId) : null}
            />
        </>
    );
};

export default StudentForm;