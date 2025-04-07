'use client';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLessonsByStatementId, createNewLesson, submitGrades, fetchGrades, deleteGrades } from '../utils/api';

const PracticeForm = ({
  selectedStatementId,
  students,
  filteredGrades,
  onOpenConfirm,
  onShowWarning,
  handleCancelSelection
}) => {
  const queryClient = useQueryClient();
  const [grades, setGrades] = useState({});
  const [originalGrades, setOriginalGrades] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [changedGrades, setChangedGrades] = useState({});
  const [hasReset, setHasReset] = useState(false);

  // Запросы данных с React Query
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ['lessons', selectedStatementId],
    queryFn: () => fetchLessonsByStatementId(selectedStatementId),
    enabled: !!selectedStatementId,
    staleTime: 5 * 60 * 1000,
    onSuccess: (data) => {
      console.log('Загруженные занятия:', data);
    },
    onError: (error) => {
      console.error('Ошибка загрузки занятий:', error);
    }
  });

  // Вывод в консоль при изменении lessons
  useEffect(() => {
    if (lessons && lessons.length > 0) {
      console.log('Текущие занятия:', lessons);
      console.log('Даты занятий:', lessons.map(lesson => lesson.date));
    }
  }, [lessons]);

  const { data: availableDates = [] } = useQuery({
    queryKey: ['availableDates', selectedStatementId, lessons], // Добавляем lessons в ключ запроса
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const lessonDates = lessons.map(lesson => 
        new Date(lesson.date).toISOString().split('T')[0]
      );
      return Array.from(new Set([today, ...lessonDates]))
        .sort((a, b) => new Date(a) - new Date(b));
    },
    enabled: !!selectedStatementId && !!lessons, // Ждем загрузки lessons
  });
  

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

  useEffect(() => {
    if (!selectedStatementId || !availableDates.length) return;
  
    const today = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem(`practiceDate_${selectedStatementId}`);
    
    // Проверяем, что сохраненная дата есть в availableDates
    const initialDate = availableDates.includes(savedDate) 
      ? savedDate 
      : availableDates.includes(today) 
        ? today 
        : availableDates[0] || today;
    
    setSelectedDate(initialDate);
    localStorage.setItem(`practiceDate_${selectedStatementId}`, initialDate);
  }, [selectedStatementId, availableDates]);
  
  // Обработчик изменения даты
  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
    localStorage.setItem(`practiceDate_${selectedStatementId}`, date);
  }, [selectedStatementId]);

  // Загрузка оценок при изменении даты
  useEffect(() => {
    const loadGrades = async () => {
      if (!selectedDate || !selectedStatementId) return;

      const initialGrades = {};
      students.forEach(student => {
        initialGrades[student.id] = "";
      });

      const existingLesson = lessons.find(lesson => 
        new Date(lesson.date).toISOString().split('T')[0] === selectedDate
      );

      let dbGrades = {...initialGrades};
      
      if (existingLesson) {
        const response = await queryClient.fetchQuery({
          queryKey: ['grades', existingLesson.id],
          queryFn: () => fetchGrades({
            lessonId: existingLesson.id,
            studentIds: students.map(s => s.id)
          }),
          staleTime: 0
        });
        
        if (response?.success && response.grades.length > 0) {
          response.grades.forEach(grade => {
            dbGrades[grade.studentId] = grade.value;
          });
        }
      }

      setOriginalGrades(dbGrades);

      const savedGrades = localStorage.getItem(`grades_${selectedStatementId}_${selectedDate}`);
      const savedChanges = localStorage.getItem(`changes_${selectedStatementId}_${selectedDate}`);
      
      setGrades(savedGrades ? JSON.parse(savedGrades) : dbGrades);
      setChangedGrades(savedChanges ? JSON.parse(savedChanges) : {});
      setHasReset(false);
    };

    loadGrades();
  }, [selectedDate, lessons, selectedStatementId, students, queryClient]);

  const handleGradeChange = (studentId, value) => {
    const newGrades = { ...grades, [studentId]: value };
    setGrades(newGrades);
    
    const newChangedGrades = { ...changedGrades };
    if (originalGrades[studentId] !== value) {
      newChangedGrades[studentId] = true;
    } else {
      delete newChangedGrades[studentId];
    }
    
    setChangedGrades(newChangedGrades);
    setHasReset(false);
    localStorage.setItem(`grades_${selectedStatementId}_${selectedDate}`, JSON.stringify(newGrades));
    localStorage.setItem(`changes_${selectedStatementId}_${selectedDate}`, JSON.stringify(newChangedGrades));
  };

  const handleCancel = useCallback(() => {
    if (Object.keys(changedGrades).length > 0) {
      setGrades({...originalGrades});
      setChangedGrades({});
      setHasReset(true);
      localStorage.setItem(`grades_${selectedStatementId}_${selectedDate}`, JSON.stringify(originalGrades));
      localStorage.removeItem(`changes_${selectedStatementId}_${selectedDate}`);
    } else if (hasReset) {
      handleCancelSelection();
    } else {
      handleCancelSelection();
    }
  }, [changedGrades, originalGrades, selectedStatementId, selectedDate, hasReset, handleCancelSelection]);

  const handleSavePractice = useCallback(() => {
    onOpenConfirm(
      async () => {
        try {
          let lessonId = null;
          const existingLesson = lessons.find(lesson => 
            new Date(lesson.date).toISOString().split('T')[0] === selectedDate
          );
          
          if (!existingLesson) {
            const result = await createLessonMutation.mutateAsync({
              statementId: selectedStatementId,
              date: selectedDate
            });
            
            if (!result.success || !result.lesson) {
              throw new Error(result.error || "Не удалось создать занятие");
            }
            
            lessonId = result.lesson.id;
          } else {
            lessonId = existingLesson.id;
          }

          const gradesToSubmit = {};
          const gradesToDelete = [];

          students.forEach(student => {
            const studentId = student.id;
            const currentGrade = grades[studentId];
            const originalGrade = originalGrades[studentId];

            if (currentGrade && currentGrade !== "") {
              gradesToSubmit[studentId] = currentGrade;
            } else if (originalGrade && originalGrade !== "") {
              gradesToDelete.push(studentId);
            }
          });

          if (gradesToDelete.length > 0) {
            await deleteGradesMutation.mutateAsync({
              lessonId,
              studentIds: gradesToDelete
            });
          }

          if (Object.keys(gradesToSubmit).length > 0) {
            const result = await submitGradesMutation.mutateAsync({
              lessonId,
              grades: gradesToSubmit
            });

            if (!result.success) {
              throw new Error(result.error || "Ошибка при сохранении оценок");
            }
          }

          const newOriginalGrades = { ...grades };
          setOriginalGrades(newOriginalGrades);
          setChangedGrades({});
          setHasReset(false);
          
          localStorage.setItem(`grades_${selectedStatementId}_${selectedDate}`, 
            JSON.stringify(newOriginalGrades));
          localStorage.removeItem(`changes_${selectedStatementId}_${selectedDate}`);
          
        } catch (error) {
          console.error("Ошибка сохранения:", error);
          onShowWarning(error.message || "Ошибка при сохранении");
        }
      },
      "Подтвердите сохранение оценок за занятие",
      "",
      false
    );
  }, [lessons, selectedDate, selectedStatementId, students, grades, originalGrades, 
      onOpenConfirm, onShowWarning, createLessonMutation, submitGradesMutation, deleteGradesMutation]);

  const hasChanges = Object.keys(changedGrades).length > 0;

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
                </div>
                <select
                  className={`p-2 border ${
                    changedGrades[student.id] ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
                  } bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm`}
                  value={grades[student.id] || ""}
                  onChange={(e) => handleGradeChange(student.id, e.target.value)}
                  disabled={createLessonMutation.isLoading || submitGradesMutation.isLoading || deleteGradesMutation.isLoading}
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
        <div className="flex-1 min-w-[200px] h-full flex items-center">
          <div className="flex items-center space-x-2 h-full">
            <label htmlFor="lesson-date" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Дата занятия:
            </label>
            <select
  id="lesson-date"
  className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm min-w-[150px] h-[38px]"
  value={selectedDate}
  onChange={(e) => handleDateChange(e.target.value)}
  disabled={createLessonMutation.isLoading || submitGradesMutation.isLoading || deleteGradesMutation.isLoading}
>
  {availableDates.map((date) => (
    <option key={date} value={date}>
      {new Date(date).toLocaleDateString('ru-RU')}
    </option>
  ))}
</select>
          </div>
        </div>
        
        <div className="flex space-x-3 h-full items-center">
          <button 
            className="px-4 py-2 bg-gray-400 text-white rounded-lg shadow hover:bg-gray-500 transition text-sm h-[38px]"
            onClick={handleCancel}
            disabled={createLessonMutation.isLoading || submitGradesMutation.isLoading || deleteGradesMutation.isLoading}
          >
            Отменить
          </button>
          <button 
            className={`px-4 py-2 ${
              hasChanges ? 'bg-teal-500 hover:bg-teal-600' : 'bg-gray-300 cursor-not-allowed'
            } text-white rounded-lg shadow transition text-sm h-[38px]`}
            onClick={handleSavePractice}
            disabled={!hasChanges || createLessonMutation.isLoading || submitGradesMutation.isLoading || deleteGradesMutation.isLoading}
          >
            {createLessonMutation.isLoading || submitGradesMutation.isLoading || deleteGradesMutation.isLoading 
              ? 'Сохранение...' 
              : 'Сохранить'}
          </button>
        </div>
      </div>
    </>
  );
};

export default PracticeForm;