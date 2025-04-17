'use client';
import React, { useCallback,useState, useEffect, useRef, useMemo } from 'react';


import { useQuery, useQueryClient } from '@tanstack/react-query';
import PracticeForm from './PracticeForm';
import AttestationForm from './AttestationForm';
import { fetchStudents, fetchPossibleGrades, downloadStatement } from '../../utils/api';
import { getTeacherStatements, getTeacherJournals } from '../../utils/api';
import ConfirmModal from '../ConfirmModal';
import WarningModal from '../WarningModal';
import SuccessModal from './SuccessModal';

const StudentForm = ({ selectedGroup, teacherLogin, handleCancelSelection }) => {
  // Состояния
  const [mode, setMode] = useState(() => {
    return typeof window !== 'undefined' 
      ? localStorage.getItem('studentFormMode') || 'practice' 
      : 'practice';
  });
  
  const [selectedDocumentId, setSelectedDocumentId] = useState(() => {
    return typeof window !== 'undefined' 
      ? localStorage.getItem('selectedDocumentId') || "" 
      : "";
  });
  
  const [filteredGrades, setFilteredGrades] = useState([]);
  const [hasAttestationStatements, setHasAttestationStatements] = useState(false); // <== ДОБАВИТЬ ЭТУ СТРОКУ
  const [modalState, setModalState] = useState({
    confirm: false,
    warning: false,
    success: false,
    data: {
      action: null,
      text: "Подтвердите действие",
      successMessage: "",
      shouldDownload: false,
      warningMessage: ""
    }
  });
  

  // Refs
  const scrollRef = useRef(null);
  const [dragState, setDragState] = useState({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    isMouseDown: false
  });
  const didDragRef = useRef(false);

  // Query клиент
  const queryClient = useQueryClient();

  // Запросы данных
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

  const { data: documentsData = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['teacherDocuments', teacherLogin, selectedGroup, mode],
    queryFn: () => mode === 'practice' 
      ? getTeacherJournals(teacherLogin, selectedGroup)
      : getTeacherStatements(teacherLogin, selectedGroup),
    enabled: !!teacherLogin && !!selectedGroup,
    staleTime: 60 * 1000 // Кэшируем на 1 минуту
  });

  const { refetch: refetchStatements } = useQuery({
    queryKey: ['teacherDocuments', teacherLogin, selectedGroup, 'attestation'],
    queryFn: () => getTeacherStatements(teacherLogin, selectedGroup),
    enabled: false // Отключаем автоматический вызов
  });
  useEffect(() => {
    if (documentsData.length > 0) {
      console.log('documentsData:', documentsData); // Логировать только когда есть данные
    }
  }, [documentsData]); // Можно добавить условие для логирования



  // Эффекты
  useEffect(() => {
    if (selectedGroup && teacherLogin && mode === 'attestation') {
      const checkStatements = async () => {
        const { data } = await refetchStatements();
        setHasAttestationStatements(prev => {
          const newValue = data?.length > 0;
          return prev !== newValue ? newValue : prev;
        });
      };
      checkStatements();
    } else {
      setHasAttestationStatements(false);
    }
}, [selectedGroup, teacherLogin, mode, refetchStatements]);
// <== сюда нужно добавить refetchStatements
const checkHasAttestationStatements = useCallback(async () => {
    if (selectedGroup && teacherLogin && mode === 'attestation') {
      const { data } = await refetchStatements();
      const newValue = data?.length > 0;
  
      if (hasAttestationStatements !== newValue) {
        setHasAttestationStatements(newValue);  // Only update if the value changes
      }
    } else {
      if (hasAttestationStatements) {
        setHasAttestationStatements(false);  // Ensure we reset state if the condition no longer holds
      }
    }
  }, [selectedGroup, teacherLogin, mode, refetchStatements, hasAttestationStatements]);
  
  useEffect(() => {
    checkHasAttestationStatements();
  }, [checkHasAttestationStatements]);
  
  
  

  useEffect(() => {
    if (documentsData.length > 0) {
      const savedId = typeof window !== 'undefined' 
        ? localStorage.getItem('selectedDocumentId') 
        : null;
      
      const isValidSavedId = savedId && documentsData.some(s => s.id === savedId);
      
      if (!selectedDocumentId || !documentsData.some(s => s.id === selectedDocumentId)) {
        setSelectedDocumentId(isValidSavedId ? savedId : documentsData[0].id);
      }
    }
  }, [documentsData, selectedDocumentId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedDocumentId) {
      localStorage.setItem('selectedDocumentId', selectedDocumentId);
    }
  }, [selectedDocumentId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studentFormMode', mode);
    }
  }, [mode]);

// Вспомогательная функция для форматирования строки
const capitalizeFirstLetter = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  // Модифицированная функция shortenFirstWord
  const shortenFirstWord = (text) => {
    const words = text.split(' ');
    if (words.length > 1) return text;
    const capitalized = capitalizeFirstLetter(words[0]);
    return capitalized.length > 10 ? `${capitalized.substring(0, 8)}.` : capitalized;
  };
  
  // В эффекте, где устанавливаются filteredGrades
  useEffect(() => {
    if (selectedDocumentId && documentsData.length) {
      const selectedDocument = documentsData.find(doc => doc.id === selectedDocumentId);
      const assessmentType = mode === 'practice' 
        ? 'занятие'
        : selectedDocument?.assessmentType ? capitalizeFirstLetter(selectedDocument.assessmentType) : null;
  
      setFilteredGrades(assessmentType ? possibleGrades[assessmentType.toLowerCase()] || [] : []);
    } else {
      setFilteredGrades([]);
    }
  }, [selectedDocumentId, documentsData, possibleGrades, mode]);

  // Обработчики событий
  const handleDocumentSelect = (documentId) => {
    if (didDragRef.current) return;
    setSelectedDocumentId(documentId);
    console.log('айди журнала', documentId);
  };

  const handleSetMode = React.useCallback((newMode) => {
    setMode(newMode);
    if (mode !== newMode) {
      setSelectedDocumentId("");
    }
  }, [mode]);

  const openModal = (type, config = {}) => {
    setModalState(prev => ({
      ...prev,
      [type]: true,
      data: { ...prev.data, ...config }
    }));
  };

  const closeModal = (type) => {
    setModalState(prev => ({ ...prev, [type]: false }));
  };

const handleSubmitConfirm = async () => {
  if (modalState.data.action) {
    try {
      const success = await modalState.data.action();
      if (success && modalState.data.successMessage) {
        openModal('success');
      }
    } catch (error) {
      console.error("Ошибка:", error);
      openModal('warning', { warningMessage: error.message || "Произошла ошибка" });
    }
  }
  closeModal('confirm');
};

  // Drag-scroll логика (остается без изменений)
  const handleMouseDown = (e) => {
    setDragState({
      isDragging: true,
      isMouseDown: true,
      startX: e.pageX - scrollRef.current.offsetLeft,
      scrollLeft: scrollRef.current.scrollLeft
    });
    didDragRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (!dragState.isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - dragState.startX) * 1;
    scrollRef.current.scrollLeft = dragState.scrollLeft - walk;

    if (Math.abs(x - dragState.startX) > 5) {
      didDragRef.current = true;
    }
  };

  const handleMouseUp = () => {
    setDragState(prev => ({ ...prev, isDragging: false, isMouseDown: false }));
    setTimeout(() => { didDragRef.current = false; }, 0);
  };

  const handleMouseLeave = () => {
    setDragState(prev => ({ ...prev, isDragging: false, isMouseDown: false }));
  };



  const selectedDocument = documentsData.find(doc => doc.id === selectedDocumentId);
//   useEffect(() => {
//     console.log('Текущий selectedDocumentId:', selectedDocumentId);
//     console.log('Соответствующий документ:', 
//       documentsData.find(doc => doc.id === selectedDocumentId));
//   }, [selectedDocumentId, documentsData]);
  return (
    <>
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
        {/* Верхняя панель */}
        <div className="flex items-center justify-between mb-4 gap-4 p-1 rounded-lg border border-gray-200 bg-gray-50 shadow-sm">
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
            onWheel={(e) => e.currentTarget.scrollLeft += e.deltaY}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            <div className="flex space-x-2" style={{ minWidth: 'max-content' }}>
              {documentsData.length > 0 ? (
                documentsData.map(document => (
                  <button
                    key={document.id}
                    className={`px-3 py-2 min-w-[220px] max-w-[220px] h-[50px] text-left rounded border shadow-sm transition-all flex flex-col justify-center relative group ${
                      selectedDocumentId === document.id
                        ? 'bg-teal-600 text-white border-teal-700 shadow-inner'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-teal-300'
                    }`}
                    onClick={() => handleDocumentSelect(document.id)}
                    disabled={mode === 'attestation' && documentsData!=null}
                    title={document.discipline?.name || document.disciplineName}
                  >
                    <div className="font-semibold text-sm leading-none mb-1 line-clamp-1">
                      {mode === 'practice' ? 'Журнал' : shortenFirstWord(document.assessmentType)}
                    </div>
                    <div className={`text-xs leading-none line-clamp-1 overflow-hidden overflow-ellipsis ${
                      selectedDocumentId === document.id ? 'text-teal-100' : 'text-gray-500'
                    }`}>
                      {document.discipline?.name || document.disciplineName}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 min-w-[180px] h-[50px] flex flex-col justify-center text-center rounded border border-gray-200 bg-gray-100 text-gray-500">
                  {documentsLoading ? 'Загрузка...' : 
                   (mode === 'attestation' ? 'Нет ведомостей на сегодня' : 'Нет доступных журналов')}
                </div>
              )}
            </div>
          </div>

          {/* Переключатель режима */}
          <div className="flex bg-white rounded-lg overflow-hidden h-[50px] border border-gray-300 min-w-[200px] shadow-sm">
  <button
    className={`flex-1 px-3 text-xs flex items-center justify-center transition-all ${
      mode === 'practice' 
        ? 'bg-teal-600 text-white font-medium shadow-inner' 
        : 'text-gray-700 hover:bg-gray-50 font-medium'
    }`}
    onClick={() => handleSetMode('practice')}
  >
    Журналы
  </button>
  <button
    className={`flex-1 px-3 text-xs flex items-center justify-center transition-all ${
      mode === 'attestation' 
        ? 'bg-teal-600 text-white font-medium shadow-inner' 
        : 'text-gray-700 hover:bg-gray-50 font-medium'
    }`}
    onClick={() => handleSetMode('attestation')}
    disabled={mode === 'attestation'}
  >
    Ведомости
  </button>
</div>
        </div>

        {/* Основное содержимое */}
        {mode === 'practice' ? (
          <PracticeForm 
          selectedJournalId={selectedDocumentId}
          selectedJournal={selectedDocument}

            handleCancelSelection={handleCancelSelection}
            students={students}
            filteredGrades={filteredGrades}
            onOpenConfirm={(action, text, successMessage) => 
              openModal('confirm', { action, text, successMessage })
            }
            onShowWarning={(message) => 
              openModal('warning', { warningMessage: message })
            }
          />
        ) : hasAttestationStatements ? (
          <AttestationForm 
          selectedStatementId={selectedDocumentId}
          selectedStatement={selectedDocument}
            handleCancelSelection={handleCancelSelection}
            students={students}
            filteredGrades={filteredGrades}
            onOpenConfirm={(action, text, successMessage, shouldDownload) => 
              openModal('confirm', { action, text, successMessage, shouldDownload })
            }
            onShowWarning={(message) => 
              openModal('warning', { warningMessage: message })
            }
            onShowSuccess={(message) => 
              openModal('success', { successMessage: message })
            }
          />
        ) : (
          <div className="text-center py-10 text-gray-500">
            Нет доступных ведомостей для аттестации
          </div>
        )}
      </div>
      
      {/* Модальные окна */}
      <ConfirmModal
        isOpen={modalState.confirm}
        onClose={() => closeModal('confirm')}
        onConfirm={handleSubmitConfirm}
        confirmText={modalState.data.text}
      />
      
      <WarningModal
        isOpen={modalState.warning}
        onClose={() => closeModal('warning')}
        warningText={modalState.data.warningMessage}
      />
      
      <SuccessModal
  isOpen={modalState.success}
  onClose={async () => {
    closeModal('success');
    await queryClient.invalidateQueries(['teacherDocuments', teacherLogin, selectedGroup, 'attestation']);
    await checkHasAttestationStatements();
  }}
  successText={modalState.data.successMessage}
  onDownload={mode === 'attestation' ? () => {
    downloadStatement(selectedDocumentId);
  } : null}
/>

    </>
  );
};

export default StudentForm;