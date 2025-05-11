import React, { useState, useEffect, useCallback } from 'react';
import { sendStatementByEmail, fetchAllUsers, fetchAllFaculties } from '../utils/api';
import SearchableSelect from './admin/SearchableSelect';

const EmailSendModal = ({ 
  isOpen, 
  onClose,
  statementId,
  fileFormat,
  initialRecipients = '',
  initialSubject = 'Ведомость',
  initialHeader = 'Уважаемые коллеги,',
  initialText = 'Прошу ознакомится с ведомостью по дисциплине.',
  currentUser
}) => {
  const [recipients, setRecipients] = useState(initialRecipients);
  const [subject, setSubject] = useState(initialSubject);
  const [header, setHeader] = useState(initialHeader);
  const [emailText, setEmailText] = useState(initialText);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  
  // Получаем факультеты
  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const response = await fetchAllFaculties();
        setFaculties(response.faculties);
        setSelectedFaculty(response.currentUserFaculty?.id || currentUser?.facultyId);
      } catch (error) {
        console.error("Error loading faculties:", error);
      }
    };
    
    if (isOpen) {
      loadFaculties();
    }
  }, [isOpen, currentUser]);

  // Функция загрузки пользователей с useCallback
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const allUsers = await fetchAllUsers({ facultyId: selectedFaculty });
      setUsers(allUsers.filter(user => user.email));
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [selectedFaculty]); // Зависимости функции

  // Загружаем пользователей при изменении выбранного факультета
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, loadUsers, selectedFaculty]);

  // Остальной код остается без изменений
  useEffect(() => {
    let interval;
    if (cooldown) {
      setCooldownTimer(5);
      interval = setInterval(() => {
        setCooldownTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setCooldown(false);
            setSuccess(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);


  
  const processRecipients = (recipients) => {
    return recipients
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
  };
  
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddRecipient = (selectedValue) => {
    if (typeof selectedValue === 'string') {
      if (!validateEmail(selectedValue)) {
        console.error('Invalid email selected:', selectedValue);
        return;
      }
      
      setRecipients(prev => {
        const currentEmails = prev 
          ? prev.split(',').map(e => e.trim()).filter(e => e)
          : [];
        
        if (currentEmails.includes(selectedValue)) {
          return prev;
        }
        
        return currentEmails.length > 0
          ? `${prev}, ${selectedValue}`
          : selectedValue;
      });
    } else if (selectedValue?.email) {
      const email = selectedValue.email;
      setRecipients(prev => {
        const currentEmails = prev 
          ? prev.split(',').map(e => e.trim()).filter(e => e)
          : [];
        
        if (currentEmails.includes(email)) {
          return prev;
        }
        
        return currentEmails.length > 0
          ? `${prev}, ${email}`
          : email;
      });
    } else {
      console.error('Invalid selection:', selectedValue);
    }
  };

  const handleFacultyChange = (facultyId) => {
    setSelectedFaculty(facultyId);
  };

  const handleSubmit = async () => {
    if (!recipients.trim()) {
      setError('Укажите хотя бы одного получателя');
      return;
    }
  
    const recipientList = processRecipients(recipients);
    const uniqueRecipients = [...new Set(recipientList)];
    if (uniqueRecipients.length !== recipientList.length) {
      setError('Обнаружены дублирующиеся адреса. Удалите повторы.');
      return;
    }
  
    const invalidEmails = uniqueRecipients.filter(email => !validateEmail(email));
    if (invalidEmails.length > 0) {
      setError(`Некорректные email-адреса: ${invalidEmails.join(', ')}`);
      return;
    }
  
    if (cooldown) {
      setError(`Подождите ${cooldownTimer} секунд перед повторной отправкой.`);
      return;
    }
  
    setIsSending(true);
    setError(null);
    setSuccess(null);
  
    try {
      const result = await sendStatementByEmail(
        statementId,
        uniqueRecipients,
        {
          subject,
          messageText: emailText,
          header,
          asPdf: fileFormat === 'pdf'
        }
      );
  
      if (result.success) {
        setSuccess('Письмо успешно отправлено!');
        setCooldown(true);
      } else {
        setError(result.message || 'Ошибка при отправке');
      }
    } catch (err) {
      setError(err.message || 'Ошибка при отправке');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  // Подготовка данных для выбора факультета
  const facultyOptions = faculties.map(f => ({
    id: f.id,
    label: f.abbreviation,
    fullName: f.name,
    ...f
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-open">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Отправить ведомость по почте</h2>
          <button
            className="text-gray-500 hover:text-gray-700 transition"
            onClick={onClose}
            title="Закрыть"
            disabled={isSending}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded text-sm">
            <div>{success}</div>
          </div>
        )}
        <div className="space-y-4">
          {/* Удален отдельный блок выбора факультета */}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Получатели (через запятую) *
            </label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="example1@mail.ru, example2@mail.ru"
              disabled={isSending || cooldown}
            />
            <p className="text-xs text-gray-500 mt-1">Укажите email-адреса через запятую</p>
            
            {/* Блок выбора пользователя и факультета */}
            <div className="flex items-end gap-2 mt-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Добавить из списка пользователей
                </label>
                <SearchableSelect
                  options={users}
                  value={null}
                  onChange={handleAddRecipient}
                  placeholder={isLoadingUsers ? "Загрузка пользователей..." : "Выберите пользователя"}
                  disabled={isLoadingUsers || isSending || cooldown}
                  formatOption={(user) => `${user.lastName} ${user.firstName} ${user.patronymic || ''} (${user.email})`}
                  searchBy={(user) => `${user.lastName} ${user.firstName} ${user.patronymic || ''} ${user.email}`.toLowerCase()}
                  getOptionValue={(user) => user.email}
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700">
                  Факультет
                </label>
                <SearchableSelect
                  options={facultyOptions}
                  value={selectedFaculty}
                  onChange={handleFacultyChange}
                  placeholder="Фак."
                  disabled={isSending || cooldown}
                  formatOption={(f) => f.label}
                  searchBy={(f) => f.fullName.toLowerCase()}
                  getOptionValue={(f) => f.id}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Тема письма *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ведомость"
              disabled={isSending || cooldown}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Заголовок письма
            </label>
            <input
              type="text"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Уважаемые коллеги,"
              disabled={isSending || cooldown}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Текст письма
            </label>
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              disabled={isSending || cooldown}
            />
          </div>
        </div>

        <div className="flex justify-between  mt-6">
          <button
            className="h-[40px] px-4 flex items-center gap-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={!recipients.trim() || !subject.trim() || isSending || cooldown}
          >
            {isSending ? (
              <>
                <span>Отправка...</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </>
            ) : cooldown ? (
              `Подождите (${cooldownTimer}с)`
            ) : (
              <>
                <span>Отправить</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailSendModal;