import { QueryClient } from '@tanstack/react-query';
export const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;

    const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem("accessToken", data.accessToken);
        return data.accessToken;
    } else {
        localStorage.removeItem("refreshToken");
        return null;
    }
};

export const fetchWithAuth = async (url, options = {}) => {
    let token = localStorage.getItem("accessToken");
    if (!token) {
        token = await refreshAccessToken();
        if (!token) return null;
    }

    const res = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
        token = await refreshAccessToken();
        if (!token) return null;
        return fetch(url, {
            ...options,
            headers: { ...options.headers, Authorization: `Bearer ${token}` },
        });
    }
    return res;
};

export const fetchTeacherStatements = async (isArchiveMode = false) => {
    const url = `/api/statements${isArchiveMode ? '?archive=true' : ''}`;
    const response = await fetchWithAuth(url);
    return response && response.ok ? response.json() : [];
};
export const fetchGroups = async (groupIds) => {
    if (groupIds.length === 0) return [];

    return Promise.all(
        groupIds.map(id => fetchWithAuth(`/api/groups/${id}`).then(res => res.json()))
    );
};

export const fetchTeacherInfo = async () => {
    const response = await fetchWithAuth("/api/me");
    return response && response.ok ? response.json() : null;
};

export const fetchStudents = async (groupId) => {
    const response = await fetchWithAuth(`/api/groups/${groupId}/students`);
    return response && response.ok ? response.json() : [];
};

export const fetchDisciplineName = async (disciplineId) => {
    const response = await fetch(`/api/disciplines/${disciplineId}`);
    return response.ok ? response.json() : { name: "Неизвестная дисциплина" };
};

export const fetchPossibleGrades = async () => {
    const response = await fetch("/api/grades/possible-values");
    return response.ok ? response.json() : [];
};
export const submitGrades = async ({ statementId, lessonId, grades }) => {
    try {
      // Подготавливаем данные для отправки
      const gradesToSend = Object.entries(grades)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([studentId, value]) => ({
          studentId,
          value,
          ...(statementId ? { statementId } : { lessonId })
        }));
  
      // Если нет оценок для отправки
      if (gradesToSend.length === 0) {
        return { 
          success: false, 
          error: "Нет оценок для отправки" 
        };
      }
  
      // Отправляем все оценки одним запросом
      const response = await fetchWithAuth('/api/grades/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: gradesToSend })
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Ошибка при отправке оценок");
      }
  
      const responseData = await response.json();
  
      // Форматируем результаты для удобства
      const results = responseData.results.map(result => ({
        studentId: result.studentId,
        success: true,
        status: result.status,
        value: result.value
      }));
  
      // Проверяем, есть ли неудачные операции
      const failedOperations = results.filter(r => !r.success);
      if (failedOperations.length > 0) {
        return {
          success: false,
          partialSuccess: true,
          results,
          failedStudents: failedOperations.map(op => op.studentId),
          error: "Некоторые оценки не были сохранены"
        };
      }
  
      return { 
        success: true, 
        results,
        message: responseData.message || "Все оценки успешно сохранены"
      };
  
    } catch (error) {
      console.error('Ошибка при отправке оценок:', error);
      
      // Пытаемся извлечь информацию о неудачных операциях из ошибки
      let failedStudents = [];
      if (error.message.includes('missingStudentIds')) {
        try {
          const errorObj = JSON.parse(error.message.split(' - ')[1]);
          failedStudents = errorObj.missingStudentIds || [];
        } catch (e) {
          console.error('Ошибка при парсинге информации об ошибке:', e);
        }
      }
  
      return { 
        success: false, 
        error: error.message.split(' - ')[0], // Базовое сообщение об ошибке
        failedStudents,
        details: error.details || undefined
      };
    }
  };

  export const fetchGrades = async ({ statementId, lessonId, studentIds }) => {
    try {
      // Валидация параметров
      if (!statementId && !lessonId) {
        throw new Error('Необходимо указать statementId или lessonId');
      }
      if (statementId && lessonId) {
        throw new Error('Укажите только statementId или только lessonId');
      }
  
      // Формируем query параметры
      const queryParams = new URLSearchParams();
      if (statementId) queryParams.append('statementId', statementId);
      if (lessonId) queryParams.append('lessonId', lessonId);
      
      // Добавляем studentIds как отдельные параметры
      if (studentIds?.length) {
        studentIds.forEach(id => queryParams.append('studentIds', id));
      }
  
      const response = await fetchWithAuth(`/api/grades?${queryParams.toString()}`);
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка при получении оценок');
      }
  
      const data = await response.json();
      
      // Проверяем структуру ответа
      if (!data || !data.grades) {
        throw new Error('Некорректный формат ответа сервера');
      }
  
      return {
        success: true,
        entityType: data.entityType,
        grades: data.grades
      };
    } catch (error) {
      console.error('Ошибка при получении оценок:', error);
      return {
        success: false,
        error: error.message,
        grades: []
      };
    }
  };

// Клиентская функция
export const deleteGrades = async ({ statementId, lessonId, studentIds }) => {
    try {
      // Валидация
      if (!studentIds?.length) {
        throw new Error('Необходимо указать studentIds');
      }
  
      if (!statementId && !lessonId) {
        throw new Error('Укажите statementId или lessonId');
      }
  
      if (statementId && lessonId) {
        throw new Error('Укажите только statementId или только lessonId');
      }
  
      const response = await fetchWithAuth('/api/grades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds,
          [statementId ? 'statementId' : 'lessonId']: statementId || lessonId
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка при удалении оценок');
      }
  
      return await response.json();
  
    } catch (error) {
      console.error('Ошибка при удалении оценок:', error);
      throw error;
    }
  };



// Загрузка возможных статусов пользователей
export const fetchPossibleStatuses = async () => {
    try {
        const response = await fetchWithAuth("/api/users/statuses/possible-values");
        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Ошибка загрузки возможных статусов:", error);
        return [];
    }
};

// Загрузка возможных ролей пользователей
export const fetchPossibleRoles = async () => {
    try {
        const response = await fetchWithAuth("/api/users/roles/possible-values");
        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Ошибка загрузки возможных ролей:", error);
        return [];
    }
};

// Удаление пользователя
export const deleteUser = async (login) => {
    try {
        const response = await fetchWithAuth(`/api/users/${login}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Ошибка при удалении пользователя: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Ошибка при удалении пользователя:", error);
        return { success: false, error: error.message };
    }
};


// Обновление данных пользователя
export const updateUser = async (login, userData) => {
    try {
        const response = await fetchWithAuth(`/api/users/${login}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            throw new Error(`Ошибка при обновлении пользователя: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Ошибка при обновлении пользователя:", error);
        return { success: false, error };
    }
};

// Создание нового пользователя
export const createUser = async (userData) => {
    try {
        const response = await fetchWithAuth(`/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            throw new Error(`Ошибка при создании пользователя: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Ошибка при создании пользователя:", error);
        return { success: false, error };
    }
};
export const hasTeacherStatements = async (teacherLogin) => {
    try {
        const response = await fetchWithAuth(`/api/statements/has-statements/${teacherLogin}`);
        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Ошибка при проверке наличия ведомостей:", error);
        return { hasStatements: false };
    }
};

export const checkUserByLogin = async (login) => {
    try {
        const response = await fetchWithAuth(`/api/users/${login}`);

        if (!response.ok) {
            if (response.status === 404) {
                // Пользователь не найден
                return { exists: false, user: null, error: null };
            }
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const user = await response.json();
        return { exists: true, user, error: null };
    } catch (error) {
        console.error("Ошибка при проверке пользователя:", error);
        return { exists: false, user: null, error: error.message };
    }
};

// Получение всех ведомостей
export const fetchAllStatements = async () => {
    try {
        const response = await fetchWithAuth("/api/statements/all");

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const data = await response.json();
        console.log("Полученные ведомости:", data);
        return data;
    } catch (error) {
        console.error("Ошибка загрузки ведомостей:", error);
        return []; // Возвращаем пустой массив в случае ошибки
    }
};

// Создание новой ведомости
export const createStatement = async (statementData) => {
    try {
        const response = await fetchWithAuth("/api/statements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(statementData),
        });

        if (!response.ok) {
            throw new Error(`Ошибка при создании ведомости: ${response.status}`);
        }

        return { success: true, data: await response.json() };
    } catch (error) {
        console.error("Ошибка при создании ведомости:", error);
        return { success: false, error: error.message };
    }
};

// Обновление ведомости
export const updateStatement = async (id, statementData) => {
    try {
        const response = await fetchWithAuth(`/api/statements/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(statementData),
        });

        if (!response.ok) {
            throw new Error(`Ошибка при обновлении ведомости: ${response.status}`);
        }

        return { success: true, data: await response.json() };
    } catch (error) {
        console.error("Ошибка при обновлении ведомости:", error);
        return { success: false, error: error.message };
    }
};

// Удаление ведомости
export const deleteStatement = async (id) => {
    try {
        const response = await fetchWithAuth(`/api/statements/${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`Ошибка при удалении ведомости: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Ошибка при удалении ведомости:", error);
        return { success: false, error: error.message };
    }
};

// Получение всех пользователей с возможностью фильтрации по факультету
export const fetchAllUsers = async ({ sameFacultyOnly = false, facultyId = null } = {}) => {
    try {
        // Собираем параметры запроса
        const params = new URLSearchParams();
        
        if (sameFacultyOnly) params.append('sameFacultyOnly', 'true');
        if (facultyId) params.append('facultyId', facultyId);
        
        const url = `/api/users?${params.toString()}`;
        const response = await fetchWithAuth(url);
        
        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Ошибка загрузки пользователей:", error);
        return [];
    }
};

// Получение всех преподавателей с возможностью фильтрации по факультету
export const fetchAllTeachers = async ({ facultyId = null, sameFacultyOnly = false } = {}) => {
    try {
        // Собираем параметры запроса
        const params = new URLSearchParams();
        
        if (facultyId) params.append('facultyId', facultyId);
        if (sameFacultyOnly) params.append('sameFacultyOnly', 'true');
        
        const url = `/api/users/all/teachers?${params.toString()}`;
        const response = await fetchWithAuth(url);

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const data = await response.json();
        console.log("Полученные преподаватели:", data);
        return data;
    } catch (error) {
        console.error("Ошибка загрузки преподавателей:", error);
        return [];
    }
};

// Получение всех факультетов
export const fetchAllFaculties = async () => {
    try {
        const response = await fetchWithAuth("/api/faculties");
        
        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Полученные факультеты:", data);
        return data;
    } catch (error) {
        console.error("Ошибка загрузки факультетов:", error);
        return [];
    }
};
// Получение всех дисциплин
export const fetchAllDisciplines = async () => {
    try {
        const response = await fetchWithAuth("/api/disciplines");

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const data = await response.json();
        console.log("Полученные дисциплины:", data);
        return data;
    } catch (error) {
        console.error("Ошибка загрузки дисциплин:", error);
        return []; // Возвращаем пустой массив в случае ошибки
    }
};


/**
 * Выполняет выход пользователя из системы.
 * @param {object} router - Объект роутера Next.js.
 */


export const handleLogout = async (router) => {
    const queryClient = new QueryClient();
    
    try {
        // 1. Отменяем все активные запросы
        queryClient.cancelQueries();
        
        // 2. Получаем токен (без ошибки если нет)
        const token = localStorage.getItem("accessToken");
        
        // 3. Отправляем запрос на серверный выход (если есть токен)
        if (token) {
            try {
                await fetchWithAuth("/api/auth/logout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error) {
                console.warn("Ошибка при серверном выходе:", error);
                // Продолжаем выполнение даже если серверный выход не удался
            }
        }

        // 4. Очищаем хранилище
        const itemsToRemove = [
            "accessToken",
            "refreshToken",
            "selectedGroup",
            "sidebarOpen"
        ];
        
        itemsToRemove.forEach(item => localStorage.removeItem(item));

        // 5. Перенаправляем (если передан router)
        if (router) {
            try {
                router.push("/login");
                router.refresh(); // Для Next.js 13+
            } catch (navigationError) {
                console.error("Ошибка навигации:", navigationError);
                // В крайнем случае - перезагрузка страницы
                if (typeof window !== "undefined") {
                    window.location.href = "/login";
                }
            }
        }

        // 6. Очищаем кэш запросов
        queryClient.clear();
        
    } catch (error) {
        console.error("Критическая ошибка при выходе:", error);
        // Гарантируем очистку даже при ошибке
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        throw error;
    }
};

export const createNewLesson = async (lessonData) => {
    try {
        const response = await fetchWithAuth('/api/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                statementId: lessonData.statementId,
                date: new Date(lessonData.date).toISOString()
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: data.error || 'Ошибка при создании занятия',
                lesson: null
            };
        }

        return { 
            success: data.success, 
            lesson: data.lesson,
            error: null
        };
        
    } catch (error) {
        console.error('Error creating lesson:', error);
        return { 
            success: false, 
            error: error.message,
            lesson: null
        };
    }
};
  
export const fetchLessonsByStatementId = async (statementId) => {
    try {
      const response = await fetchWithAuth(`/api/statements/${statementId}/lessons`);
      
      if (!response.ok) {
        // Если статус 404, возвращаем пустой массив вместо ошибки
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
      }
  
      const lessons = await response.json();
      
      // Обрабатываем случай, когда сервер возвращает null/undefined или не массив
      if (!lessons || !Array.isArray(lessons)) {
        return [];
      }
  
      // Если массив пустой, просто возвращаем его
      if (lessons.length === 0) {
        return [];
      }
  
      // Преобразуем данные, если массив не пустой
      return lessons.map(lesson => ({
        id: lesson.id,
        statementId: lesson.statementId,
        date: lesson.date ? new Date(lesson.date) : null // Добавил проверку на наличие даты
      }));
  
    } catch (error) {
      console.error(`Ошибка при получении занятий для ведомости ${statementId}:`, error);
      // В случае ошибки возвращаем пустой массив, чтобы клиент мог продолжить работу
      return [];
    }
  };

  // В файле api.js добавляем новую функцию
export const generateStatement = async (statementId) => {
    try {
        const response = await fetchWithAuth(`/api/statements/${statementId}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error("Ошибка при генерации ведомости");
        }

        return await response.json();
    } catch (error) {
        console.error("Ошибка при генерации ведомости:", error);
        throw error;
    }
};

/**
 * Получает средние оценки студентов по ведомости
 * @param {string|number} statementId - ID ведомости
 * @returns {Promise<Object>} - Объект с studentId в качестве ключа и средней оценкой в качестве значения
 */
export const fetchAverageGrades = async (statementId) => {
    try {
      const response = await fetchWithAuth(`/api/statements/${statementId}/average-grades`);
      
      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
      }
  
      const averages = await response.json();
      
      if (typeof averages !== 'object' || averages === null) {
        throw new Error('Некорректный формат данных средних оценок');
      }
  
      // Преобразуем строковые ключи в числа (если нужно)
      const result = {};
      for (const [studentId, average] of Object.entries(averages)) {
        result[Number(studentId)] = average;
      }
  
      return result;
  
    } catch (error) {
      console.error(`Ошибка при получении средних оценок для ведомости ${statementId}:`, error);
      throw error;
    }
  };
  
  /**
   * Получает количество пропусков студентов по ведомости
   * @param {string|number} statementId - ID ведомости
   * @returns {Promise<Object>} - Объект с studentId в качестве ключа и количеством пропусков в качестве значения
   */
  export const fetchMissedLessonsCount = async (statementId) => {
    try {
      const response = await fetchWithAuth(`/api/statements/${statementId}/missed-lessons`);
      
      if (!response.ok) {
        // Если нет данных (404), возвращаем пустой объект
        if (response.status === 404) {
          return {};
        }
        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
      }
  
      const missedCounts = await response.json();
      
      if (typeof missedCounts !== 'object' || missedCounts === null) {
        throw new Error('Некорректный формат данных пропусков');
      }
  
      // Преобразуем строковые ключи в числа (если нужно)
      const result = {};
      for (const [studentId, count] of Object.entries(missedCounts)) {
        result[Number(studentId)] = count;
      }
  
      return result;
  
    } catch (error) {
      console.error(`Ошибка при получении количества пропусков для ведомости ${statementId}:`, error);
      throw error;
    }
  };
  
  /**
   * Получает аналитику по ведомости (средние оценки и пропуски)
   * @param {string|number} statementId - ID ведомости
   * @returns {Promise<Object>} - Объект с аналитикой
   */
  export const fetchStatementAnalytics = async (statementId) => {
    try {
      // Используем Promise.all для параллельного выполнения запросов
      const [averages, missedCounts] = await Promise.all([
        fetchAverageGrades(statementId),
        fetchMissedLessonsCount(statementId)
      ]);
  
      return {
        averages,
        missedCounts
      };
    } catch (error) {
      console.error(`Ошибка при получении аналитики для ведомости ${statementId}:`, error);
      throw error;
    }
  };

  export const changePassword = async (currentPassword, newPassword) => {
    try {
        const response = await fetchWithAuth('/api/users/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при смене пароля');
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при смене пароля:', error);
        throw error;
    }
}
/**
 * Получает ведомость по группе, дисциплине и семестру
 * @param {number} groupId - ID группы
 * @param {number} disciplineId - ID дисциплины
 * @param {number} semester - Номер семестра
 * @returns {Promise<Object>} - Объект ведомости
 */
export const fetchStatementByGroupDisciplineSemester = async (groupId, disciplineId, semester) => {
    try {
        const response = await fetchWithAuth(
            `/api/statements/group/${groupId}/discipline/${disciplineId}/semester/${semester}`
        );

        if (!response.ok) {
            // Если ведомость не найдена (404), возвращаем null
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
        }

        const statement = await response.json();

        // Проверяем корректность полученных данных
        if (!statement || typeof statement !== 'object') {
            throw new Error('Некорректный формат данных ведомости');
        }

        return statement;

    } catch (error) {
        console.error(
            `Ошибка при получении ведомости для группы ${groupId}, ` +
            `дисциплины ${disciplineId}, семестра ${semester}:`, 
            error
        );
        throw error;
    }
};


  /**
   * Получает список всех специальностей с возможной фильтрацией по факультету
   * @returns {Promise<Array>} - Массив объектов специальностей
   */
  export const fetchAllSpecialties = async () => {
    try {
      const response = await fetchWithAuth('/api/specialties');
      
      if (!response.ok) {
        // Если нет данных (404), возвращаем пустой массив
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
      }
  
      const specialties = await response.json();
      
      // Проверяем корректность полученных данных
      if (!Array.isArray(specialties)) {
        throw new Error('Некорректный формат данных специальностей');
      }
  
      // Сортируем по названию специальности
      const sortedSpecialties = [...specialties].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
  
      return sortedSpecialties;
  
    } catch (error) {
      console.error('Ошибка при получении списка специальностей:', error);
      throw error;
    }
  };
  
  export const fetchAllGroups = async () => {
    try {
        const response = await fetchWithAuth("/api/groups");

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const data = await response.json();
        console.log("Полученные группы:", data);
        return data;
    } catch (error) {
        console.error("Ошибка загрузки групп:", error);
        return []; // Возвращаем пустой массив в случае ошибки
    }
};

/**
 * Создает новую группу
 * @param {Object} groupData - Данные группы
 * @param {number} groupData.specialtyId - ID специальности
 * @param {number} groupData.admissionYear - Год поступления
 * @param {string} groupData.educationForm - Форма обучения ('дневная', 'заочная', 'дистанционная')
 * @param {number} groupData.educationLevel - Ступень обучения (1 или 2)
 * @returns {Promise<Object>} - Созданная группа
 */
export const createGroup = async (groupData) => {
    try {
        const response = await fetchWithAuth('/api/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(groupData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при создании группы');
        }

        const createdGroup = await response.json();
        console.log('Группа успешно создана:', createdGroup);
        return createdGroup;

    } catch (error) {
        console.error('Ошибка при создании группы:', error);
        throw error;
    }
};

/**
 * Обновляет данные группы
 * @param {number} groupId - ID группы для обновления
 * @param {Object} updateData - Данные для обновления
 * @param {number} [updateData.specialtyId] - ID специальности
 * @param {number} [updateData.admissionYear] - Год поступления
 * @param {string} [updateData.educationForm] - Форма обучения
 * @param {number} [updateData.educationLevel] - Ступень обучения
 * @returns {Promise<Object>} - Обновленная группа
 */
export const updateGroup = async (groupId, updateData) => {
    try {
        const response = await fetchWithAuth(`/api/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при обновлении группы');
        }

        const updatedGroup = await response.json();
        console.log('Группа успешно обновлена:', updatedGroup);
        return updatedGroup;

    } catch (error) {
        console.error(`Ошибка при обновлении группы ${groupId}:`, error);
        throw error;
    }
};

/**
 * Удаляет группу
 * @param {number} groupId - ID группы для удаления
 * @returns {Promise<Object>} - Результат операции
 */
export const deleteGroup = async (groupId) => {
    try {
        const response = await fetchWithAuth(`/api/groups/${groupId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при удалении группы');
        }

        const result = await response.json();
        console.log('Группа успешно удалена:', result);
        return result;

    } catch (error) {
        console.error(`Ошибка при удалении группы ${groupId}:`, error);
        throw error;
    }
};

/**
 * Проверяет, есть ли у группы связанные зависимости (студенты, семестры и т.д.)
 * @param {number} groupId - ID группы
 * @returns {Promise<boolean>} - true, если есть зависимости; false, если нет
 */
export const hasGroupDependencies = async (groupId) => {
    try {
        const response = await fetchWithAuth(`/api/groups/${groupId}/has-dependencies`);

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const { hasDependencies } = await response.json();
        console.log(`Группа ${groupId} имеет зависимости:`, hasDependencies);
        return hasDependencies;
    } catch (error) {
        console.error(`Ошибка при проверке зависимостей группы ${groupId}:`, error);
        return true; // Возвращаем true по умолчанию, чтобы предотвратить удаление при ошибке
    }
};


/**
 * Получает список всех студентов с возможностью фильтрации
 * @param {Object} [filters] - Параметры фильтрации
 * @param {number} [filters.groupId] - ID группы для фильтрации
 * @param {string} [filters.lastName] - Фамилия для поиска
 * @param {number} [filters.page] - Номер страницы
 * @param {number} [filters.limit] - Количество элементов на странице
 * @returns {Promise<Object>} - Объект с данными студентов и пагинацией
 */
export const fetchAllStudents = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (filters.groupId) queryParams.append('groupId', filters.groupId);
        if (filters.lastName) queryParams.append('lastName', filters.lastName);
        if (filters.page) queryParams.append('page', filters.page);
        if (filters.limit) queryParams.append('limit', filters.limit);

        const response = await fetchWithAuth(`/api/students?${queryParams}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при получении списка студентов');
        }

        return await response.json();

    } catch (error) {
        console.error('Ошибка при получении списка студентов:', error);
        throw error;
    }
};

/**
 * Получает данные конкретного студента
 * @param {number} studentId - ID студента
 * @returns {Promise<Object>} - Данные студента
 */
export const getStudentById = async (studentId) => {
    try {
        const response = await fetchWithAuth(`/api/students/${studentId}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при получении данных студента');
        }

        return await response.json();

    } catch (error) {
        console.error(`Ошибка при получении студента ${studentId}:`, error);
        throw error;
    }
};

/**
 * Получает список студентов конкретной группы
 * @param {number} groupId - ID группы
 * @returns {Promise<Array>} - Массив студентов
 */
export const getStudentsByGroup = async (groupId) => {
    try {
        const response = await fetchWithAuth(`/api/groups/${groupId}/students`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при получении студентов группы');
        }

        return await response.json();

    } catch (error) {
        console.error(`Ошибка при получении студентов группы ${groupId}:`, error);
        throw error;
    }
};

/**
 * Создает нового студента
 * @param {Object} studentData - Данные студента
 * @param {string} studentData.lastName - Фамилия
 * @param {string} studentData.firstName - Имя
 * @param {string} [studentData.patronymic] - Отчество
 * @param {number} studentData.groupId - ID группы
 * @returns {Promise<Object>} - Созданный студент
 */
export const createStudent = async (studentData) => {
    try {
        const response = await fetchWithAuth('/api/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при создании студента');
        }

        return await response.json();

    } catch (error) {
        console.error('Ошибка при создании студента:', error);
        throw error;
    }
};

/**
 * Обновляет данные студента
 * @param {number} studentId - ID студента
 * @param {Object} updateData - Данные для обновления
 * @param {string} [updateData.lastName] - Фамилия
 * @param {string} [updateData.firstName] - Имя
 * @param {string} [updateData.patronymic] - Отчество
 * @param {number} [updateData.groupId] - ID группы
 * @returns {Promise<Object>} - Обновленный студент
 */
export const updateStudent = async (studentId, updateData) => {
    try {
        const response = await fetchWithAuth(`/api/students/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при обновлении студента');
        }

        return await response.json();

    } catch (error) {
        console.error(`Ошибка при обновлении студента ${studentId}:`, error);
        throw error;
    }
};

/**
 * Удаляет студента
 * @param {number} studentId - ID студента
 * @returns {Promise<Object>} - Результат операции
 */
export const deleteStudent = async (studentId) => {
    try {
        const response = await fetchWithAuth(`/api/students/${studentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при удалении студента');
        }

        return await response.json();

    } catch (error) {
        console.error(`Ошибка при удалении студента ${studentId}:`, error);
        throw error;
    }
};

/**
 * Проверяет, есть ли у студента связанные зависимости (оценки, посещения и т.д.)
 * @param {number} studentId - ID студента
 * @returns {Promise<boolean>} - true, если есть зависимости; false, если нет
 */
export const hasStudentDependencies = async (studentId) => {
    try {
        const response = await fetchWithAuth(`/api/students/${studentId}/has-dependencies`);

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const { hasDependencies } = await response.json();
        console.log(`Студент ${studentId} имеет зависимости:`, hasDependencies);
        return hasDependencies;
    } catch (error) {
        console.error(`Ошибка при проверке зависимостей студента ${studentId}:`, error);
        return true; // Безопасный вариант - предполагаем, что зависимости есть
    }
};


/**
 * Получает дисциплину по ID
 * @param {number} disciplineId - ID дисциплины
 * @returns {Promise<Object>} - Данные дисциплины
 */
export const getDisciplineById = async (disciplineId) => {
    try {
        const response = await fetchWithAuth(`/api/disciplines/${disciplineId}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Дисциплина не найдена');
        }

        return await response.json();

    } catch (error) {
        console.error(`Ошибка при получении дисциплины ${disciplineId}:`, error);
        throw error;
    }
};

/**
 * Создает новую дисциплину
 * @param {Object} disciplineData - Данные дисциплины
 * @param {string} disciplineData.name - Название
 * @param {number} disciplineData.facultyId - ID факультета
 * @param {boolean} [disciplineData.isPractice=false] - Является ли практикой
 * @returns {Promise<Object>} - Созданная дисциплина
 */
export const createDiscipline = async (disciplineData) => {
    try {
        const response = await fetchWithAuth('/api/disciplines', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(disciplineData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при создании дисциплины');
        }

        return await response.json();

    } catch (error) {
        console.error('Ошибка при создании дисциплины:', error);
        throw error;
    }
};

export const updateDiscipline = async (disciplineId, updateData) => {
    try {
        const response = await fetchWithAuth(`/api/disciplines/${disciplineId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
  
        const contentType = response.headers.get('content-type');
        
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
        }
  
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при обновлении дисциплины');
        }
  
        return data;
  
    } catch (error) {
        console.error(`Ошибка при обновлении дисциплины ${disciplineId}:`, error);
        throw error;
    }
  };

/**
 * Удаляет дисциплину
 * @param {number} disciplineId - ID дисциплины
 * @returns {Promise<Object>} - Результат операции
 */
export const deleteDiscipline = async (disciplineId) => {
    try {
        const response = await fetchWithAuth(`/api/disciplines/${disciplineId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при удалении дисциплины');
        }

        return await response.json();

    } catch (error) {
        console.error(`Ошибка при удалении дисциплины ${disciplineId}:`, error);
        throw error;
    }
};

/**
 * Проверяет, есть ли у дисциплины связанные зависимости (оценки и т.д.)
 * @param {number} disciplineId - ID дисциплины
 * @returns {Promise<boolean>} - true, если есть зависимости; false, если нет
 */
export const hasDisciplineDependencies = async (disciplineId) => {
    try {
        const response = await fetchWithAuth(`/api/disciplines/${disciplineId}/has-dependencies`);

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const { hasDependencies } = await response.json();
        console.log(`Дисциплина ${disciplineId} имеет зависимости:`, hasDependencies);
        return hasDependencies;
    } catch (error) {
        console.error(`Ошибка при проверке зависимостей дисциплины ${disciplineId}:`, error);
        return true; // Безопасный вариант - предполагаем, что зависимости есть
    }
};

/**
 * Получает статистику по ведомости
 * @param {number} statementId - ID ведомости
 * @returns {Promise<Object>} - Статистика ведомости
 */
export const getStatementStatistics = async (statementId) => {
    try {
        const response = await fetchWithAuth(`/api/statements/${statementId}/statistics`);

        const contentType = response.headers.get('content-type');
        
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при получении статистики ведомости');
        }

        return data;

    } catch (error) {
        console.error(`Ошибка при получении статистики ведомости ${statementId}:`, error);
        throw error;
    }
};

/**
 * Обновляет email пользователя и его пароль
 * @param {string} email - Новый email пользователя
 * @param {string} emailPassword - Пароль от почты (будет зашифрован на сервере)
 * @returns {Promise<Object>} - Обновленные данные пользователя
 */
export const updateEmail = async (email, emailPassword) => {
    try {
        const response = await fetchWithAuth('/api/users/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                emailPassword
            })
        });

        const contentType = response.headers.get('content-type');
        
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Ожидался JSON, но получено: ${text.substring(0, 100)}`);
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при обновлении email');
        }

        return data;

    } catch (error) {
        console.error('Ошибка при обновлении email:', error);
        
        // Добавляем более информативное сообщение для пользователя
        if (error.message.includes('already exists')) {
            throw new Error('Этот email уже используется другим пользователем');
        } else if (error.message.includes('invalid email')) {
            throw new Error('Введите корректный email адрес');
        } else if (error.message.includes('auth failed')) {
            throw new Error('Неверный пароль от почты');
        }

        throw error;
    }
};


/**
 * Отправляет ведомость по электронной почте с выбором формата
 * @param {number} statementId - ID ведомости
 * @param {string[]} recipientEmails - Массив email адресов получателей
 * @param {Object} [options] - Дополнительные параметры
 * @param {string} [options.subject='Ведомость'] - Тема письма
 * @param {string} [options.messageText='Прикреплена ведомость по дисциплине.'] - Текст письма
 * @param {boolean} [options.asPdf=false] - Отправить как PDF (по умолчанию DOCX)
 * @param {string} [options.header='Уважаемые коллеги,'] - Заголовок письма
 * @returns {Promise<Object>} - Результат отправки
 */
export const sendStatementByEmail = async (
    statementId, 
    recipientEmails, 
    {
        subject = 'Ведомость',
        messageText = 'Прикреплена ведомость по дисциплине.',
        asPdf = false,
        header = 'Уважаемые коллеги,'
    } = {}
) => {
    try {
        if (!recipientEmails || recipientEmails.length === 0) {
            throw new Error('no recipients');
        }

        const response = await fetchWithAuth(`/api/statements/${statementId}/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipientEmails,
                subject,
                messageText,
                header,
                convertToPdf: asPdf
            })
        });

        // Проверка типа содержимого
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Invalid content type: ${contentType}, response: ${text.substring(0, 100)}`);
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при отправке ведомости по email');
        }

        return {
            success: true,
            message: data.message || 'Ведомость успешно отправлена',
            details: data.details,
            format: asPdf ? 'PDF' : 'DOCX'
        };

    } catch (error) {
        console.error(`Ошибка при отправке ведомости ${statementId} (${asPdf ? 'PDF' : 'DOCX'}):`, error);
        
        // Улучшенные сообщения об ошибках
        const userMessages = {
            'email not configured': 'У преподавателя не настроена почта для отправки',
            'no statement file': 'Файл ведомости не найден',
            'EAUTH': 'Ошибка аутентификации почты. Проверьте настройки email.',
            'no recipients': 'Укажите хотя бы один email получателя',
            'conversion failed': 'Не удалось конвертировать в PDF. Отправлен DOCX файл.'
        };

        throw new Error(
            userMessages[error.message] || 
            'Не удалось отправить ведомость. Пожалуйста, попробуйте позже.'
        );
    }
};
/**
 * Скачивание ведомости с возможностью выбора формата
 * @param {number} statementId - ID ведомости
 * @param {boolean} [asPdf=false] - Скачать как PDF (по умолчанию DOCX)
 * @returns {Promise<void>}
 */
export const downloadStatement = async (statementId, asPdf = false) => {
    try {
        const response = await fetchWithAuth(`/api/statements/${statementId}/file?convertToPdf=${asPdf}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            return Promise.reject({ 
                message: errorText || "Файл ведомости не найден",
                silent: true
            });
        }

        const contentType = response.headers.get('content-type');
        const ext = asPdf ? 'pdf' : 'docx';
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        
        a.href = url;
        a.download = `Ведомость_${statementId}.${ext}`;
        document.body.appendChild(a);
        a.click();
        
        // Очистка
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
    } catch (error) {
        console.error(`Ошибка при скачивании ведомости ${statementId} (${asPdf ? 'PDF' : 'DOCX'}):`, error);
        throw new Error(error.message || 'Не удалось скачать ведомость');
    }
};

/**
 * Получает статистику успеваемости студента
 * @param {number} studentId - ID студента
 * @param {number} [semester] - Номер семестра (1-10, опционально)
 * @returns {Promise<Object>} - Статистика студента
 */
export const getStudentStatistics = async (studentId, semester) => {
    try {
        const url = semester 
            ? `/api/students/${studentId}/statistics?semester=${semester}`
            : `/api/students/${studentId}/statistics`;

        const response = await fetchWithAuth(url);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при получении статистики студента');
        }

        return await response.json();

    } catch (error) {
        console.error(`Ошибка при получении статистики студента ${studentId}:`, error);
        throw error;
    }
};

/**
 * Получает статистику по группе с возможностью фильтрации по семестру и ведомости
 * @param {number} groupId - ID группы
 * @param {number|null} [semester=null] - Номер семестра (опционально)
 * @param {number|null} [statementId=null] - ID ведомости (опционально)
 * @returns {Promise<Object>} - Объект с статистикой студентов и средними значениями по группе
 * @property {Array} students - Массив объектов с статистикой по каждому студенту
 * @property {number|null} groupAverage - Средняя оценка по группе
 * @property {number|null} groupAttendance - Средний процент посещаемости по группе
 * @property {number|null} groupCertificationPercentage - Средний процент аттестации по группе
 * @property {number|null} groupCertificationAverage - Средняя аттестационная оценка по группе
 */
export const getGroupStatistics = async (groupId, semester = null, statementId = null) => {
    try {
        // Формируем URL с параметрами
        let url = `/api/groups/${groupId}/statistics`;
        const params = new URLSearchParams();
        
        if (semester !== null) params.append('semester', semester);
        if (statementId !== null) params.append('statementId', statementId);
        
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetchWithAuth(url);

        // Проверяем статус ответа
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorData}`);
        }

        // Проверяем content-type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON but got: ${contentType}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error in getGroupStatistics:', error);
        throw error;
    }
};

/**
 * Проверяет, есть ли у пользователя связанные зависимости (например, ведомости и т.д.)
 * @param {string} login - Логин пользователя
 * @returns {Promise<boolean>} - true, если есть зависимости; false, если нет
 */
export const hasUserDependencies = async (login) => {
    try {
        const response = await fetchWithAuth(`/api/users/${login}/has-dependencies`);

        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }

        const { hasDependencies } = await response.json();
        console.log(`Пользователь ${login} имеет зависимости:`, hasDependencies);
        return hasDependencies;
    } catch (error) {
        console.error(`Ошибка при проверке зависимостей пользователя ${login}:`, error);
        return true; // Безопасный вариант - предполагаем, что зависимости есть
    }
};
