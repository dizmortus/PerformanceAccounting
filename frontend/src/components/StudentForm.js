"use client";
import React, { useState, useEffect } from 'react';
import { fetchStudents, fetchPossibleGrades, submitGrades, fetchWithAuth } from '../utils/api';
import { downloadStatement } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import WarningModal from './WarningModal';
import SuccessModal from './SuccessModal';

const StudentForm = ({
    selectedGroup,
    filteredStatements,
    handleCancelSelection
}) => {
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({});
    const [selectedStatementId, setSelectedStatementId] = useState("");
    const [possibleGrades, setPossibleGrades] = useState([]);

    // Состояния модальных окон
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    // Загрузка студентов при выборе группы
    useEffect(() => {
        const loadStudents = async () => {
            const studentsData = await fetchStudents(selectedGroup);
            // Сортировка по алфавиту (по фамилии)
            const sortedStudents = studentsData.sort((a, b) => 
                a.lastName.localeCompare(b.lastName)
            );
            setStudents(sortedStudents);
        };

        loadStudents();
    }, [selectedGroup]);

    // Загрузка возможных оценок
    useEffect(() => {
        fetchPossibleGrades().then(setPossibleGrades);
    }, []);

    // Обработчик изменения оценки
    const handleGradeChange = (studentId, value) => {
        const newGrades = { ...grades, [studentId]: value };
        setGrades(newGrades);
        localStorage.setItem(`grades_${selectedStatementId}`, JSON.stringify(newGrades));
    };

    // Загружаем сохраненные оценки
    useEffect(() => {
        const savedGrades = localStorage.getItem(`grades_${selectedStatementId}`);
        if (savedGrades) {
            setGrades(JSON.parse(savedGrades));
        } else {
            setGrades({});
        }
    }, [selectedStatementId]);

    // Получаем список возможных оценок для выбранной ведомости
    const getFilteredGrades = () => {
        if (!selectedStatementId || !filteredStatements.length) return [];
        const selectedStatement = filteredStatements.find(statement => statement.id === selectedStatementId);
        return selectedStatement && selectedStatement.assessmentType ? possibleGrades[selectedStatement.assessmentType] || [] : [];
    };

    // Устанавливаем первую ведомость по умолчанию
    useEffect(() => {
        if (filteredStatements.length > 0) {
            setSelectedStatementId(filteredStatements[0].id);
        }
    }, [filteredStatements]);

    // Открытие модального окна подтверждения
    const openConfirmModal = () => {
        const allGradesSelected = students.every(student => grades[student.id]);
        if (!allGradesSelected) {
            setIsWarningModalOpen(true);
            return;
        }
        setIsConfirmModalOpen(true);
    };

    // Закрытие модального окна подтверждения
    const closeConfirmModal = () => setIsConfirmModalOpen(false);

    // Отправка оценок
    const handleSubmitGrades = async () => {
        closeConfirmModal();

        const result = await submitGrades(selectedStatementId, grades);
        if (result.success) {
            try {
                const response = await fetchWithAuth(`/api/statements/${selectedStatementId}/generate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    },
                });

                if (!response.ok) throw new Error("Ошибка при генерации ведомости");

                setIsSuccessModalOpen(true);
            } catch (pdfError) {
                console.error("Ошибка при создании ведомости:", pdfError);
                alert("Оценки сохранены, но произошла ошибка при создании ведомости.");
            }
        } else {
            console.error("Ошибка при отправке оценок:", result.error);
            alert("Ошибка при загрузке оценок.");
        }
    };

    return (
        <>
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-3xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ maxHeight: "calc(100vh - 2rem)" }}>
            {/* Форма студентов */}
            <div className="mb-4">
                <select
                    className="w-full p-3 border bg-white text-gray-900 rounded-lg text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-md hover:border-teal-400"
                    value={selectedStatementId}
                    onChange={(e) => setSelectedStatementId(e.target.value)}
                >
                    {filteredStatements.map(statement => (
                        <option key={statement.id} value={statement.id} className="text-lg text-center">
                            Ведомость №{statement.id}: {statement.disciplineName} - {statement.assessmentType}
                        </option>
                    ))}
                </select>
            </div>

            {/* Список студентов */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <ul className="space-y-4">
                    {students.map((student, index) => (
                        <li
                            key={student.id}
                            className={`flex justify-between p-3 border-b border-gray-400 rounded-lg
                                        ${index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'}`}
                        >
                            <span className="flex flex-col">
                                <span className="font-semibold text-gray-900">
                                    {index + 1}. {student.lastName} {student.firstName[0]}. {student.patronymic ? student.patronymic[0] + '.' : ''}
                                </span>
                                <span className="text-sm text-gray-600">Зачетная книжка №{student.id}</span>
                            </span>

                            {/* Выпадающий список оценки */}
                            <select
                                className="p-2 border border-gray-400 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                value={grades[student.id] || ""}
                                onChange={(e) => handleGradeChange(student.id, e.target.value)}
                            >
                                <option value="">не выбрано</option>
                                {getFilteredGrades().map((grade) => (
                                    <option key={grade} value={grade}>{grade}</option>
                                ))}
                            </select>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-4 mt-4">
                <button className="px-6 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition" onClick={handleCancelSelection}>Отменить</button>
                <button className="px-6 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition" onClick={openConfirmModal}>Принять</button>
            </div>


        </div>
                    {/* Модальные окна */}
                    <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={closeConfirmModal}
                onConfirm={handleSubmitGrades}
                confirmText={"Подтвердите отправку ведомости."}
            />
            
            <WarningModal
                isOpen={isWarningModalOpen}
                onClose={() => setIsWarningModalOpen(false)}
                warningText={"Выберите оценки для всех студентов перед отправкой!"}
            />
            
            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
                onDownload={() => downloadStatement(selectedStatementId)}
            />
        </>
    );
};

export default StudentForm;