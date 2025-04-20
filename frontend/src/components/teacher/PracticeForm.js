'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLessonsByStatementId, createNewLesson, submitGrades, fetchGrades, deleteGrades } from '../../utils/api';
import { useMemo } from 'react';
import GradesTable from './GradesTable';

const PracticeForm = ({
  selectedStatementId,
  students,
  filteredGrades,
  onOpenConfirm,
  onShowWarning,
  handleCancelSelection
}) => {
  const queryClient = useQueryClient();
  const [gradesMap, setGradesMap] = useState(new Map()); // Map<statementId, grades>
  const [originalGradesMap, setOriginalGradesMap] = useState(new Map()); // Map<statementId, originalGrades>
  const [changedGradesMap, setChangedGradesMap] = useState(new Map()); // Map<statementId, changedGrades>
  const [focusedCellMap, setFocusedCellMap] = useState(new Map()); // Map<statementId, focusedCell>
  
  const [selectedDate, setSelectedDate] = useState('');
  const [hasReset, setHasReset] = useState(false);
  const tableRef = useRef(null);

  // Получаем текущие состояния для выбранного statementId
  const grades = useMemo(() => gradesMap.get(selectedStatementId) || {}, [gradesMap, selectedStatementId]);
  const originalGrades = useMemo(() => originalGradesMap.get(selectedStatementId) || {}, [originalGradesMap, selectedStatementId]);
  const changedGrades = useMemo(() => changedGradesMap.get(selectedStatementId) || {}, [changedGradesMap, selectedStatementId]);
  const focusedCell = useMemo(() => {
    return focusedCellMap.get(selectedStatementId) || { studentIndex: 0, dateIndex: 0 };
  }, [focusedCellMap, selectedStatementId]);
  
  

  // Запросы данных с React Query
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ['lessons', selectedStatementId],
    queryFn: () => fetchLessonsByStatementId(selectedStatementId),
    enabled: !!selectedStatementId,
    staleTime: 5 * 60 * 1000,
  });

  const today = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Europe/Minsk'
  }); // 'sv-SE' даёт формат YYYY-MM-DD
  console.log('Сегодняшняя дата (Минск):', today);
  const availableDates = useMemo(() => {
    const lessonDates = lessons.map(lesson =>
      new Date(lesson.date).toISOString().split('T')[0]
    );
  
    const allDates = new Set([...lessonDates, today]);
    return Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));
  }, [lessons, today]);
  
  // Мутации для изменения данных
  const createLessonMutation = useMutation({
    mutationFn: createNewLesson,
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons', selectedStatementId]);
    }
  });

  const submitGradesMutation = useMutation({
    mutationFn: submitGrades,
    onSuccess: () => {
      queryClient.invalidateQueries(['grades']);
    }
  });

  const deleteGradesMutation = useMutation({
    mutationFn: deleteGrades,
    onSuccess: () => {
      queryClient.invalidateQueries(['grades']);
    }
  });

  // Загрузка всех оценок
  useEffect(() => {
    const loadAllGrades = async () => {
      if (!lessons.length || !students.length) return;
  
      // Сначала загружаем данные с сервера
      const serverGrades = {};
      const serverOriginalGrades = {};
      const newChangedGrades = {};
  
      students.forEach(student => {
        serverGrades[student.id] = {};
        serverOriginalGrades[student.id] = {};
        availableDates.forEach(date => {
          serverGrades[student.id][date] = "";
          serverOriginalGrades[student.id][date] = "";
        });
      });
  
      for (const lesson of lessons) {
        const lessonDate = new Date(lesson.date).toISOString().split('T')[0];
        const response = await queryClient.fetchQuery({
          queryKey: ['grades', lesson.id],
          queryFn: () => fetchGrades({
            lessonId: lesson.id,
            studentIds: students.map(s => s.id)
          }),
          staleTime: 0
        });
  
        if (response?.success && response.grades.length > 0) {
          response.grades.forEach(grade => {
            serverGrades[grade.studentId][lessonDate] = grade.value;
            serverOriginalGrades[grade.studentId][lessonDate] = grade.value;
          });
        }
      }
  
      // Затем загружаем из localStorage
      const savedGrades = loadGradesFromLocalStorage(selectedStatementId) || {};
  
      // Объединяем данные и определяем измененные оценки
      const mergedGrades = {};
      const mergedOriginalGrades = {};
  
      students.forEach(student => {
        mergedGrades[student.id] = { ...serverGrades[student.id] };
        mergedOriginalGrades[student.id] = { ...serverOriginalGrades[student.id] };
  
        // Если есть сохраненные оценки для этого студента
        if (savedGrades[student.id]) {
          availableDates.forEach(date => {
            // Если оценка была изменена и сохранена локально
            if (savedGrades[student.id][date] !== undefined && 
                savedGrades[student.id][date] !== serverOriginalGrades[student.id][date]) {
              mergedGrades[student.id][date] = savedGrades[student.id][date];
              
              // Помечаем как измененную
              if (!newChangedGrades[student.id]) newChangedGrades[student.id] = {};
              newChangedGrades[student.id][date] = true;
            }
          });
        }
      });
  
      // Обновляем Map'ы
      setGradesMap(prev => new Map(prev).set(selectedStatementId, mergedGrades));
      setOriginalGradesMap(prev => new Map(prev).set(selectedStatementId, mergedOriginalGrades));
      setChangedGradesMap(prev => new Map(prev).set(selectedStatementId, newChangedGrades));
    };
  
    loadAllGrades();
  }, [lessons, students, availableDates, queryClient, selectedStatementId]);

  const handleGradeChange = useCallback((studentId, date, value) => {
    const newGrades = {
      ...grades,
      [studentId]: {
        ...grades[studentId],
        [date]: value
      }
    };
  
    // Обновляем gradesMap
    setGradesMap(prev => new Map(prev).set(selectedStatementId, newGrades));
    saveGradesToLocalStorage(selectedStatementId, newGrades);
  
    setChangedGradesMap(prev => {
      const currentChangedGrades = prev.get(selectedStatementId) || {};
      const newChangedGrades = { ...currentChangedGrades };
      
      if (originalGrades[studentId]?.[date] !== value) {
        if (!newChangedGrades[studentId]) newChangedGrades[studentId] = {};
        newChangedGrades[studentId][date] = true;
      } else if (newChangedGrades[studentId]?.[date]) {
        delete newChangedGrades[studentId][date];
        if (Object.keys(newChangedGrades[studentId]).length === 0) {
          delete newChangedGrades[studentId];
        }
      }
      
      return new Map(prev).set(selectedStatementId, newChangedGrades);
    });
  }, [grades, originalGrades, selectedStatementId]);
  

  // Функция для сохранения оценок в localStorage
  const saveGradesToLocalStorage = (statementId, grades) => {
    localStorage.setItem(`grades_${statementId}`, JSON.stringify(grades));
  };
  
  // Функция для загрузки оценок из localStorage
  const loadGradesFromLocalStorage = (statementId) => {
    const savedGrades = localStorage.getItem(`grades_${statementId}`);
    return savedGrades ? JSON.parse(savedGrades) : null;
  };

  // Обработчик установки оценки через панель
  const handleSetGrade = useCallback((gradeValue) => {
    if (students.length === 0 || availableDates.length === 0) return;
  
    const { studentIndex, dateIndex } = focusedCell;
    const studentId = students[studentIndex]?.id;
    const date = availableDates[dateIndex];
  
    if (studentId && date) {
      handleGradeChange(studentId, date, gradeValue);
    }
  }, [students, availableDates, focusedCell, handleGradeChange]);
  

  // Обработчик отмены изменений
  const handleCancel = useCallback(() => {
    // Обновляем Map'ы
    setGradesMap(prev => new Map(prev).set(selectedStatementId, originalGrades));
    setChangedGradesMap(prev => new Map(prev).set(selectedStatementId, {}));
    setHasReset(true);
    
    // Очищаем сохраненные в localStorage оценки при отмене
    localStorage.removeItem(`grades_${selectedStatementId}`);
  }, [originalGrades, selectedStatementId]);

  const handleSavePractice = useCallback(() => {
    onOpenConfirm(
      async () => {
        try {
          for (const studentId in changedGrades) {
            for (const date in changedGrades[studentId]) {
              const lesson = lessons.find(l => 
                new Date(l.date).toISOString().split('T')[0] === date
              );
              
              let lessonId;
              if (!lesson) {
                const result = await createLessonMutation.mutateAsync({
                  statementId: selectedStatementId,
                  date: date
                });
                
                if (!result.success || !result.lesson) {
                  throw new Error(result.error || "Не удалось создать занятие");
                }
                
                lessonId = result.lesson.id;
              } else {
                lessonId = lesson.id;
              }
  
              const gradeValue = grades[studentId][date];
              
              if (gradeValue && gradeValue !== "") {
                await submitGradesMutation.mutateAsync({
                  lessonId,
                  grades: { [studentId]: gradeValue }
                });
              } else {
                await deleteGradesMutation.mutateAsync({
                  lessonId,
                  studentIds: [studentId]
                });
              }
            }
          }
  
          // Обновляем Map'ы после сохранения
          setOriginalGradesMap(prev => new Map(prev).set(selectedStatementId, grades));
          setChangedGradesMap(prev => new Map(prev).set(selectedStatementId, {}));
          
          // Очищаем сохраненные в localStorage оценки после успешного сохранения
          localStorage.removeItem(`grades_${selectedStatementId}`);
          
        } catch (error) {
          console.error("Ошибка сохранения:", error);
          onShowWarning(error.message || "Ошибка при сохранении");
        }
      },
      "Подтвердите сохранение всех измененных оценок",
      "",
      false
    );
  }, [changedGrades, grades, lessons, selectedStatementId, 
      onOpenConfirm, onShowWarning, createLessonMutation, 
      submitGradesMutation, deleteGradesMutation]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;

      const isDigit = /^[0-9]$/.test(key);
      const isAbsent = key === 'н';
      const isClear = key === 'Backspace' || key === 'Delete';

      // Текущая оценка
      const { studentIndex, dateIndex } = focusedCell;
      const studentId = students[studentIndex]?.id;
      const date = availableDates[dateIndex];
      const current = studentId && date ? grades[studentId]?.[date] : '';

      if ((isDigit || isAbsent) && filteredGrades.includes(key)) {
        handleSetGrade(key);
      }

      if (isClear) {
        handleSetGrade('');
      }

      if ((key === '+' || key === '=' || key === 'Add') && filteredGrades.length > 0) {
          const currentIndex = filteredGrades.indexOf(current);
          const prevIndex = (currentIndex - 1 + filteredGrades.length) % filteredGrades.length;
          handleSetGrade(filteredGrades[prevIndex]);
      }

      if ((key === '-' || key === 'Subtract') && filteredGrades.length > 0) {
          const currentIndex = filteredGrades.indexOf(current);
        const nextIndex = (currentIndex + 1) % filteredGrades.length;
        handleSetGrade(filteredGrades[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filteredGrades, handleSetGrade, focusedCell, grades, students, availableDates]);

  const handleCellClick = useCallback((studentIndex, dateIndex) => {
    setFocusedCellMap(prev => new Map(prev).set(selectedStatementId, { studentIndex, dateIndex }));
  }, [selectedStatementId]);
      
  const hasChanges = Object.keys(changedGrades).length > 0;
  const currentStudentId = students[focusedCell.studentIndex]?.id;
  const currentDate = availableDates[focusedCell.dateIndex];
  const currentGrade = currentStudentId && currentDate ? grades[currentStudentId]?.[currentDate] : '';

  return (
    <div className="flex-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
      <div className="flex">
        <div className="flex-1 overflow-auto">
        <GradesTable
  statementId={selectedStatementId}
  students={students}
  availableDates={availableDates}
  grades={grades}
  changedGrades={changedGrades}
  focusedCell={focusedCell}
  tableRef={tableRef}
  handleCellClick={handleCellClick}
/>


        </div>
  
        {/* Панель оценок */}
        <div className="w-40 flex flex-col border-l border-gray-300 bg-gray-100">
          <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 10rem - 80px)' }}>
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Текущая оценка</h3>
              <div className="p-2  h-[40px]  bg-white rounded border border-gray-300 text-center text-sm font-medium shadow-sm">
                {currentGrade || '—'}
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Выставить оценку</h3>
              <div className="grid grid-cols-2 gap-2">
                {filteredGrades.map(grade => (
                  <button
                    key={grade}
                    className="w-full h-[40px] flex items-center justify-center bg-blue-500 hover:bg-blue-600 rounded-md text-sm font-medium text-white shadow-md transition-colors leading-none"
                    onClick={() => handleSetGrade(grade)}
                  >
                    {grade === 'н' ? 'Не явился' : grade}
                  </button>
                ))}
                <button
                  className="col-span-2 w-full h-[40px] rounded-md text-sm font-medium shadow-sm transition-colors flex items-center justify-center bg-gray-400 hover:bg-gray-500 text-white leading-none"
                  onClick={() => handleSetGrade('')}
                >
                  Очистить
                </button>
              </div>
            </div>
          </div>
  
          <div className="p-2 pt-2 bg-gray-100 border-t border-gray-300 mt-auto space-y-2">
            <button 
              className={`w-full h-[40px] text-sm font-medium rounded-md transition-colors ${
                hasChanges ? 'bg-teal-500 hover:bg-teal-600 text-white shadow' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={handleSavePractice}
              disabled={!hasChanges}
            >
              Сохранить
            </button>
            <button 
              className={`w-full h-[40px] text-sm font-medium rounded-md transition-colors ${
                hasChanges ? 'bg-gray-500 hover:bg-gray-600 text-white shadow' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={handleCancel}
              disabled={!hasChanges}
            >
              Отменить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeForm;