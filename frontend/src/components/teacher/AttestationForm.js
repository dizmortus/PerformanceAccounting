'use client';
import { useState, useEffect, useCallback, useRef, useMemo  } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submitGrades, generateStatement, fetchAverageGrades, fetchMissedLessonsCount, fetchGrades } from '../../utils/api';

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
  const [gradesMap, setGradesMap] = useState(new Map());
  const [changedGradesMap, setChangedGradesMap] = useState(new Map());
  const [focusedStudentIndices, setFocusedStudentIndices] = useState(new Map());
  const listRef = useRef(null);
  const [originalGradesMap, setOriginalGradesMap] = useState(new Map());
  const [modalOpen, setModalOpen] = useState(false);



// Получение текущих значений для выбранной ведомости
const getCurrentGrades = useCallback(() => {
  const grades = gradesMap.get(selectedStatementId) || {};

  console.log('[getCurrentGrades] selectedStatementId:', selectedStatementId);
  console.log('[getCurrentGrades] gradesMap:', gradesMap);
  console.log('[getCurrentGrades] grades:', grades);

  return grades;
}, [gradesMap, selectedStatementId]);
  const generateStatementMutation = useMutation({
    mutationFn: generateStatement,
    onSuccess: () => {
      onShowSuccess("Ведомость успешно сформирована!");
    }
  });
  const getCurrentChangedGrades = useCallback(() => {
    return changedGradesMap.get(selectedStatementId) || {};
  }, [changedGradesMap, selectedStatementId]);

  const getCurrentFocusedIndex = useCallback(() => {
    return focusedStudentIndices.get(selectedStatementId) || 0;
  }, [focusedStudentIndices, selectedStatementId]);

  // Мутации для изменения данных
  const submitGradesMutation = useMutation({
    mutationFn: submitGrades,
    onSuccess: () => {
      queryClient.invalidateQueries(['attestationAnalytics']);
    }
  });
// Получаем текущие оригинальные оценки
const originalGrades = useMemo(
  () => originalGradesMap.get(selectedStatementId) || {},
  [originalGradesMap, selectedStatementId]
);
const fetchGradesData = async (statementId, students) => {
  console.log('Starting grades fetch with statementId:', statementId, 'and students:', students);
  try {
    const studentIds = students.map(student => student.id);
    console.log('Fetching grades for student IDs:', studentIds);
    const result = await fetchGrades({
      statementId,
      studentIds
    });
    console.log('Grades API response:', result);
    return result;
  } catch (error) {
    console.error('Error fetching grades:', error);
    throw error;
  }
};

const { data: gradesData, isLoading: loadingGrades, error: gradesError } = useQuery({
  queryKey: ['attestationGrades', selectedStatementId, students],
  queryFn: () => fetchGradesData(selectedStatementId, students),
  enabled: !!selectedStatementId && students.length > 0,
  staleTime: 60 * 1000, // 1 minute stale time
});

// Обработка успешного получения данных
useEffect(() => {
  if (!gradesData || !selectedStatementId) return;

  console.log('Processing grades data:', gradesData);

  const gradesArray = gradesData.grades || [];
  const gradesByStudentId = {};
  const originalGradesByStudentId = {};

  gradesArray.forEach(({ studentId, value }) => {
    gradesByStudentId[studentId] = value;
    originalGradesByStudentId[studentId] = value;
  });

  const initialGrades = {};
  const initialOriginalGrades = {};

  students.forEach(student => {
    initialGrades[student.id] = gradesByStudentId[student.id] || "";
    initialOriginalGrades[student.id] = originalGradesByStudentId[student.id] || "";
  });

  // Загружаем сохраненные локально изменения
  const savedGrades = JSON.parse(
    localStorage.getItem(`attestation_grades_${selectedStatementId}`) || '{}'
  );

  const mergedGrades = { ...initialGrades };
  const newChangedGrades = {};

  Object.keys(savedGrades).forEach(studentId => {
    if (savedGrades[studentId] !== initialOriginalGrades[studentId]) {
      mergedGrades[studentId] = savedGrades[studentId];
      newChangedGrades[studentId] = true;
    }
  });

  setGradesMap(prev => new Map(prev).set(selectedStatementId, mergedGrades));
  setOriginalGradesMap(prev => new Map(prev).set(selectedStatementId, initialOriginalGrades));
  setChangedGradesMap(prev => new Map(prev).set(selectedStatementId, newChangedGrades));

  console.log('Grades processing completed for statement:', selectedStatementId);
}, [gradesData, selectedStatementId, students]);

// Обработка ошибок
useEffect(() => {
  if (gradesError) {
    console.error('Error in grades query:', gradesError);
    // Можно добавить обработку ошибки (например, показать уведомление)
  }
}, [gradesError]);



// Функция сохранения в localStorage
const saveGradesToLocalStorage = (statementId, grades) => {
  localStorage.setItem(`attestation_grades_${statementId}`, JSON.stringify(grades));
};

// Обновленный обработчик изменения оценки
const handleGradeChange = useCallback((studentId, value) => {
  const newGrades = { ...getCurrentGrades(), [studentId]: value };
  
  // Сохраняем в state и localStorage
  setGradesMap(prev => new Map(prev).set(selectedStatementId, newGrades));
  saveGradesToLocalStorage(selectedStatementId, newGrades);
  
  // Обновляем changedGradesMap
  setChangedGradesMap(prev => {
    const currentChangedGrades = prev.get(selectedStatementId) || {};
    const newChangedGrades = { ...currentChangedGrades };
    
    if (originalGrades[studentId] !== value) {
      newChangedGrades[studentId] = true;
    } else {
      delete newChangedGrades[studentId];
    }
    
    return new Map(prev).set(selectedStatementId, newChangedGrades);
  });
}, [selectedStatementId, getCurrentGrades, originalGrades]);

// Обновленный обработчик отмены
const handleCancel = useCallback(() => {
  const currentChangedGrades = getCurrentChangedGrades();
  if (Object.keys(currentChangedGrades).length > 0) {
    // Восстанавливаем оригинальные оценки
    setGradesMap(prev => new Map(prev).set(selectedStatementId, originalGrades));
    setChangedGradesMap(prev => new Map(prev).set(selectedStatementId, {}));
    
    // Удаляем из localStorage
    localStorage.removeItem(`attestation_grades_${selectedStatementId}`);
  } else {
    handleCancelSelection();
  }
}, [selectedStatementId, originalGrades, handleCancelSelection, getCurrentChangedGrades]);

// Обновленный обработчик сохранения
const handleSubmit = useCallback(async () => {
  const currentGrades = getCurrentGrades();
  const filledGrades = {};
  
  Object.entries(currentGrades).forEach(([studentId, grade]) => {
    if (grade !== "") {
      filledGrades[studentId] = grade;
    }
  });

  try {
    await submitGradesMutation.mutateAsync({
      statementId: selectedStatementId,
      grades: filledGrades
    });

    // После успешного сохранения обновляем оригинальные оценки
    setOriginalGradesMap(prev => new Map(prev).set(selectedStatementId, currentGrades));
    setChangedGradesMap(prev => new Map(prev).set(selectedStatementId, {}));
    
    // Удаляем из localStorage
    localStorage.removeItem(`attestation_grades_${selectedStatementId}`);

    const allGradesFilled = students.every(student => currentGrades[student.id]);
    
    if (allGradesFilled) {
      onOpenConfirm(
        async () => {
          await generateStatementMutation.mutateAsync(selectedStatementId);
          onShowSuccess("Оценки сохранены и ведомость сформирована!");
        },
        "Подтвердите создание ведомости",
        "Все оценки заполнены. Создать ведомость?",
        true
      );
    }
  } catch (error) {
    console.error("Ошибка при сохранении оценок:", error);
    onShowWarning(`Ошибка: ${error.message}`);
  }
}, [getCurrentGrades, students, selectedStatementId, onOpenConfirm, onShowWarning, onShowSuccess, submitGradesMutation, generateStatementMutation]);
  

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

  



  const handleSetGrade = useCallback((gradeValue) => {
    if (students.length === 0) return;
    
    const studentId = students[getCurrentFocusedIndex()]?.id;
    if (studentId) {
      handleGradeChange(studentId, gradeValue);
    }
  }, [students, getCurrentFocusedIndex, handleGradeChange]);

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

  const currentChangedGrades = getCurrentChangedGrades();
  const hasChanges = Object.keys(currentChangedGrades).length > 0;
  const isProcessing = submitGradesMutation.isLoading || generateStatementMutation.isLoading;
  const currentFocusedIndex = getCurrentFocusedIndex();
  const currentStudentId = students[currentFocusedIndex]?.id;
  const currentGrades = getCurrentGrades();
  const currentGrade = currentStudentId ? currentGrades[currentStudentId] || '' : '';

  // Прокрутка к выбранному студенту
  const scrollToStudent = useCallback((index) => {
    if (!listRef.current || !students.length) return;
    
    const items = listRef.current.querySelectorAll('li');
    if (index >= 0 && index < items.length) {
      items[index].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [students]);

  // Восстановление фокуса
  useEffect(() => {
    if (!selectedStatementId) return;

    const savedIndex = localStorage.getItem(`lastFocusedStudentIndex_${selectedStatementId}`);
    if (savedIndex) {
      const index = parseInt(savedIndex);
      if (!isNaN(index) && index < students.length) {
        setFocusedStudentIndices(prev => new Map(prev).set(selectedStatementId, index));
        setTimeout(() => scrollToStudent(index), 100);
      }
    }
  }, [selectedStatementId, students.length, scrollToStudent]);



// Функция для проверки открытых модальных окон
const checkModalOpen = useCallback(() => {
  return document.querySelector('.modal-open') !== null;
}, []);

// Обновите обработчики клавиш, добавив проверку на модальные окна
useEffect(() => {
  const handleKeyDown = (e) => {
    if (!students.length || checkModalOpen()) return;

    let newIndex = currentFocusedIndex;
    
    if (['arrowup', 'arrowdown'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    switch (e.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
      case 'ц':
        newIndex = Math.max(0, currentFocusedIndex - 1);
        break;
      case 'arrowdown':
      case 's':
      case 'ы':
        newIndex = Math.min(students.length - 1, currentFocusedIndex + 1);
        break;
      case 'home':
        newIndex = 0;
        break;
      case 'end':
        newIndex = students.length - 1;
        break;
      case 'pageup':
        newIndex = Math.max(0, currentFocusedIndex - 10);
        break;
      case 'pagedown':
        newIndex = Math.min(students.length - 1, currentFocusedIndex + 10);
        break;
      default:
        return;
    }

    if (newIndex !== currentFocusedIndex) {
      setFocusedStudentIndices(prev => new Map(prev).set(selectedStatementId, newIndex));
      scrollToStudent(newIndex);
      localStorage.setItem(`lastFocusedStudentIndex_${selectedStatementId}`, newIndex.toString());
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentFocusedIndex, students.length, scrollToStudent, selectedStatementId, checkModalOpen]);

// Обновите обработчик клавиш для выставления оценок
useEffect(() => {
  const handleKeyDown = (e) => {
    if (!students.length || checkModalOpen()) return;

    const key = e.key;
    const studentId = students[currentFocusedIndex]?.id;
    const currentGrade = studentId ? currentGrades[studentId] || '' : '';

    const isDigit = /^[0-9]$/.test(key);
    const isAbsent = key === 'н';
    const isClear = key === 'Backspace' || key === 'Delete';

    if ((isDigit || isAbsent) && filteredGrades.includes(key)) {
      e.preventDefault();
      handleGradeChange(studentId, key);
    }

    if (isClear) {
      e.preventDefault();
      handleGradeChange(studentId, '');
    }

    if ((key === '+' || key === '=' || key === 'Add') && filteredGrades.length > 0) {
      e.preventDefault();
      const currentIndex = filteredGrades.indexOf(currentGrade);
      const prevIndex = (currentIndex - 1 + filteredGrades.length) % filteredGrades.length;
      handleGradeChange(studentId, filteredGrades[prevIndex]);
    }

    if ((key === '-' || key === 'Subtract') && filteredGrades.length > 0) {
      e.preventDefault();
      const currentIndex = filteredGrades.indexOf(currentGrade);
      const nextIndex = (currentIndex + 1) % filteredGrades.length;
      handleGradeChange(studentId, filteredGrades[nextIndex]);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentFocusedIndex, students, currentGrades, filteredGrades, handleGradeChange, checkModalOpen]);


  if (loadingGrades) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Загрузка оценок...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 10rem)' }}>
      {/* Основной список студентов */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ width: '70%' }}>
        <div className="flex-1 overflow-y-auto p-4" ref={listRef}>
          <ul className="space-y-3">
            {students.map((student, index) => (
              <li
                key={student.id}
                className={`p-3 border rounded-lg shadow-sm hover:shadow-md transition ${
                  index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50'
                } ${
                  currentChangedGrades[student.id] ? 'border-l-4 border-teal-500' : 'border-gray-200'
                } ${index === currentFocusedIndex ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => {
                  setFocusedStudentIndices(prev => new Map(prev).set(selectedStatementId, index));
                  localStorage.setItem(`lastFocusedStudentIndex_${selectedStatementId}`, index.toString());
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {student.lastName} {student.firstName} {student.patronymic}
                    </p>
                    <p className="text-sm text-gray-500">
                      Зачетная книжка №{student.id}
                    </p>
                  </div>
                  <div className="w-40 flex flex-col justify-center items-start space-y-1 text-xs text-gray-600">
                    <div>
                      Средний балл: <span className="font-medium">{formatAverage(student.id)}</span>
                    </div>
                    <div>
                      Пропуски: <span className="font-medium">{formatMissed(student.id)}</span>
                    </div>
                  </div>
                  <div className={`w-36 h-10 flex items-center justify-center rounded border ${
                    currentChangedGrades[student.id] 
                      ? 'bg-teal-50 border-teal-500 shadow-sm' 
                      : 'bg-white border-gray-300 shadow-sm'
                  } text-gray-900 font-medium text-sm`}>
                    {currentGrades[student.id] || '—'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
  
      {/* Панель оценок */}
      <div className="w-40 flex flex-col border-l border-gray-300 bg-gray-100">
        <div className="overflow-y-auto p-3" style={{ height: 'calc(100vh - 10rem - 80px)' }}>
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Текущая оценка</h3>
            <div className="p-2 h-[40px] bg-white rounded border border-gray-300 text-center text-sm font-medium shadow-sm flex items-center justify-center">
              {students[currentFocusedIndex] ? (currentGrades[students[currentFocusedIndex].id] || '—') : '—'}
            </div>
          </div>
  
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Выставить оценку</h3>
            <div className="grid grid-cols-2 gap-2">
              {filteredGrades.map((grade, index) => {
                const words = grade.split(/\s+/);
                const allWordsShort = words.every(word => word.length < 7);
                const nextGrade = filteredGrades[index + 1];
                const nextHasLongWord = nextGrade?.split(/\s+/).some(word => word.length >= 7);
                const isFirstInRow = index % 2 === 0;
                const hasLongWord = words.some(word => word.length >= 7);
                const spanClass = (hasLongWord || (isFirstInRow && allWordsShort && nextHasLongWord))
                  ? 'col-span-2' : '';
  
                return (
                  <button
                    key={grade + index}
                    className={`${spanClass} w-full h-[40px] flex items-center justify-center bg-blue-500 hover:bg-blue-600 rounded-md text-sm font-medium text-white shadow-md transition-colors leading-none`}
                    onClick={() => {
                      const studentId = students[currentFocusedIndex]?.id;
                      if (studentId) handleGradeChange(studentId, grade);
                    }}
                  >
                    {grade === 'н' ? 'Не явился' : grade}
                  </button>
                );
              })}
  
              <button
                className="col-span-2 w-full h-[40px] rounded-md text-sm font-medium shadow-sm transition-colors flex items-center justify-center bg-gray-400 hover:bg-gray-500 text-white leading-none"
                onClick={() => {
                  const studentId = students[currentFocusedIndex]?.id;
                  if (studentId) handleGradeChange(studentId, '');
                }}
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
            onClick={handleSubmit}
            disabled={!hasChanges || isProcessing}
          >
            {isProcessing ? 'Сохранение...' : 'Принять'}
          </button>
          <button 
            className={`w-full h-[40px] text-sm font-medium rounded-md transition-colors ${
              hasChanges ? 'bg-gray-500 hover:bg-gray-600 text-white shadow' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleCancel}
            disabled={!hasChanges || isProcessing}
          >
            Отменить
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttestationForm;