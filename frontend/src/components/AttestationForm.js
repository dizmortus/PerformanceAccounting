'use client';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submitGrades, generateStatement, fetchAverageGrades, fetchMissedLessonsCount } from '../utils/api';

const AttestationForm = ({
  selectedStatementId,
  handleCancelSelection,
  students,
  filteredGrades,
  onOpenConfirm,
  onShowWarning,
  onShowSuccess
}) => {
  const queryClient = useQueryClient();
  const [grades, setGrades] = useState({});
  const [changedGrades, setChangedGrades] = useState({});

  // Запросы аналитики с React Query
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['attestationAnalytics', selectedStatementId],
    queryFn: async () => {
      const [averages, missedCounts] = await Promise.all([
        fetchAverageGrades(selectedStatementId),
        fetchMissedLessonsCount(selectedStatementId)
      ]);
      return { averages, missedCounts };
    },
    enabled: !!selectedStatementId,
    staleTime: 5 * 60 * 1000,
  });

  // Мутации для изменения данных
  const submitGradesMutation = useMutation({
    mutationFn: submitGrades,
    onSuccess: () => {
      queryClient.invalidateQueries(['attestationAnalytics']);
    }
  });

  const generateStatementMutation = useMutation({
    mutationFn: generateStatement
  });

  // Инициализация оценок
  useEffect(() => {
    const savedGrades = localStorage.getItem(`grades_${selectedStatementId}`);
    const savedChanges = localStorage.getItem(`changes_${selectedStatementId}`);
    
    const initialGrades = {};
    students.forEach(student => {
      initialGrades[student.id] = "";
    });
    
    if (savedGrades) {
      const parsedGrades = JSON.parse(savedGrades);
      setGrades(parsedGrades);
      
      if (savedChanges) {
        setChangedGrades(JSON.parse(savedChanges));
      } else {
        const initialChanges = {};
        Object.entries(parsedGrades).forEach(([studentId, grade]) => {
          if (grade !== "") {
            initialChanges[studentId] = true;
          }
        });
        setChangedGrades(initialChanges);
        localStorage.setItem(`changes_${selectedStatementId}`, JSON.stringify(initialChanges));
      }
    } else {
      setGrades(initialGrades);
      localStorage.setItem(`grades_${selectedStatementId}`, JSON.stringify(initialGrades));
    }
  }, [selectedStatementId, students]);

  const handleGradeChange = useCallback((studentId, value) => {
    const newGrades = { ...grades, [studentId]: value };
    setGrades(newGrades);
    
    const newChangedGrades = { ...changedGrades };
    if (value !== "") {
      newChangedGrades[studentId] = true;
    } else {
      delete newChangedGrades[studentId];
    }
    
    setChangedGrades(newChangedGrades);
    localStorage.setItem(`grades_${selectedStatementId}`, JSON.stringify(newGrades));
    localStorage.setItem(`changes_${selectedStatementId}`, JSON.stringify(newChangedGrades));
  }, [grades, changedGrades, selectedStatementId]);

  const handleCancel = useCallback(() => {
    if (Object.keys(changedGrades).length > 0) {
      const resetGrades = {};
      students.forEach(student => {
        resetGrades[student.id] = "";
      });
      
      setGrades(resetGrades);
      setChangedGrades({});
      localStorage.setItem(`grades_${selectedStatementId}`, JSON.stringify(resetGrades));
      localStorage.removeItem(`changes_${selectedStatementId}`);
    } else {
      handleCancelSelection();
    }
  }, [changedGrades, students, selectedStatementId, handleCancelSelection]);

  const handleSubmit = useCallback(() => {
    const hasEmptyGrades = students.some(student => !grades[student.id]);
    if (hasEmptyGrades) {
      onShowWarning("Выберите оценки для всех студентов перед отправкой ведомости!");
      return;
    }
    
    onOpenConfirm(
      async () => {
        try {
          const filledGrades = Object.fromEntries(
            Object.entries(grades).filter(([_, grade]) => grade !== '')
          );
          
          await submitGradesMutation.mutateAsync({
            statementId: selectedStatementId,
            grades: filledGrades
          });

          await generateStatementMutation.mutateAsync(selectedStatementId);
          onShowSuccess("Ведомость успешно сохранена и сформирована!");
          
          localStorage.removeItem(`grades_${selectedStatementId}`);
          localStorage.removeItem(`changes_${selectedStatementId}`);
          setChangedGrades({});
        } catch (error) {
          console.error("Ошибка при сохранении ведомости:", error);
          onShowWarning(`Ошибка: ${error.message}`);
        }
      },
      "Подтвердите отправку ведомости",
      "Ведомость успешно сохранена и сформирована!",
      true
    );
  }, [grades, students, selectedStatementId, onOpenConfirm, onShowWarning, onShowSuccess, submitGradesMutation, generateStatementMutation]);

  const formatAverage = useCallback((studentId) => {
    if (!analytics || analytics.averages[studentId] === undefined || analytics.averages[studentId] === null) {
      return '-';
    }
    return analytics.averages[studentId].toFixed(2);
  }, [analytics]);

  const formatMissed = useCallback((studentId) => {
    if (!analytics || analytics.missedCounts[studentId] === undefined) return '-';
    return analytics.missedCounts[studentId];
  }, [analytics]);

  const hasChanges = Object.keys(changedGrades).length > 0;
  const isProcessing = submitGradesMutation.isLoading || generateStatementMutation.isLoading;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <ul className="space-y-3">
          {students.map((student, index) => (
            <li
              key={student.id}
              className={`p-3 border rounded-lg shadow-sm hover:shadow-md transition ${
                index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50'
              } ${
                changedGrades[student.id] ? 'border-l-4 border-teal-500' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {student.lastName} {student.firstName} {student.patronymic}
                  </p>
                  <p className="text-sm text-gray-500">
                    Зачетная книжка №{student.id}
                  </p>
                  <div className="flex space-x-4 mt-1">
                    <div className="text-xs text-gray-600">
                      Средний балл: <span className="font-medium">{formatAverage(student.id)}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Пропуски: <span className="font-medium">{formatMissed(student.id)}</span>
                    </div>
                  </div>
                </div>
                <select
                  className={`p-2 border ${
                    changedGrades[student.id] ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
                  } bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm`}
                  value={grades[student.id] || ""}
                  onChange={(e) => handleGradeChange(student.id, e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">не выбрано</option>
                  {filteredGrades.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between items-center mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 h-[62px]">
        <div className="flex-1 min-w-[200px] h-full">
          {loadingAnalytics && (
            <div className="text-sm text-gray-500 flex items-center">
              Загрузка аналитики...
            </div>
          )}
        </div>
        
        <div className="flex space-x-3 h-full items-center">
          <button 
            className="px-4 py-2 bg-gray-400 text-white rounded-lg shadow hover:bg-gray-500 transition text-sm h-[38px]"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Отменить
          </button>
          <button 
            className={`px-4 py-2 ${
              hasChanges ? 'bg-teal-500 hover:bg-teal-600' : 'bg-gray-300 cursor-not-allowed'
            } text-white rounded-lg shadow transition text-sm h-[38px]`}
            onClick={handleSubmit}
            disabled={isProcessing || !hasChanges}
          >
            {isProcessing ? 'Сохранение...' : 'Принять'}
          </button>
        </div>
      </div>
    </>
  );
};

export default AttestationForm;