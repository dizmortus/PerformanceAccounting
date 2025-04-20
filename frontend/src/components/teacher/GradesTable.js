'use client';
import { useEffect, useCallback } from 'react';

const GradesTable = ({
  statementId,
  students,
  availableDates,
  grades,
  changedGrades,
  focusedCell,
  tableRef,
  handleCellClick
}) => {
  const scrollToCell = useCallback((studentIndex, dateIndex) => {
    if (!tableRef.current) return;

    const container = tableRef.current;
    const rows = container.querySelectorAll('tbody tr');

    if (rows.length <= studentIndex) return;

    const cell = rows[studentIndex].querySelectorAll('td')[dateIndex + 1];
    if (!cell) return;

    cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [tableRef]);

  // Восстановление фокуса (без скролла)
  useEffect(() => {
    const savedPosition = localStorage.getItem(`lastFocusedCell_${statementId}`);
    if (savedPosition) {
      try {
        const { studentIndex, dateIndex } = JSON.parse(savedPosition);
        if (studentIndex < students.length && dateIndex < availableDates.length) {
          setTimeout(() => {
            handleCellClick(studentIndex, dateIndex);
          }, 0);
        }
      } catch (e) {
        console.error('Failed to parse saved cell position', e);
      }
    }
  }, [students.length, availableDates.length, handleCellClick, statementId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!students.length || !availableDates.length) return;

      const { studentIndex, dateIndex } = focusedCell;
      let newStudentIndex = studentIndex;
      let newDateIndex = dateIndex;

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
        case 'ц':
          newStudentIndex = Math.max(0, studentIndex - 1);
          break;
        case 'arrowdown':
        case 's':
        case 'ы':
          newStudentIndex = Math.min(students.length - 1, studentIndex + 1);
          break;
        case 'arrowleft':
        case 'a':
        case 'ф':
          newDateIndex = Math.max(0, dateIndex - 1);
          break;
        case 'arrowright':
        case 'd':
        case 'в':
          newDateIndex = Math.min(availableDates.length - 1, dateIndex + 1);
          break;
        default:
          return;
      }

      if (newStudentIndex !== studentIndex || newDateIndex !== dateIndex) {
        handleCellClick(newStudentIndex, newDateIndex);
        scrollToCell(newStudentIndex, newDateIndex);
        localStorage.setItem(`lastFocusedCell_${statementId}`, JSON.stringify({
          studentIndex: newStudentIndex,
          dateIndex: newDateIndex
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCell, students.length, availableDates.length, handleCellClick, scrollToCell, statementId]);

  return (
    <div className="flex-1 overflow-auto" ref={tableRef}>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
        <table className="border-separate border-spacing-0">
          <colgroup>
            <col className="w-auto" />
            {availableDates.map((_, i) => (
              <col key={i} style={{ minWidth: '60px' }} />
            ))}
          </colgroup>
          <thead className="bg-gray-200 sticky top-0 z-[25]">
            <tr>
              <th
                scope="col"
                className="px-3 py-2 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-200 whitespace-nowrap z-[30] border border-gray-300"
              >
                Студент
              </th>
              {availableDates.map((date, dateIndex) => {
                const isColumnFocused = dateIndex === focusedCell.dateIndex;
                return (
                  <th
                    key={date}
                    scope="col"
                    className={`px-2 py-2 text-center text-xs font-semibold text-gray-700 sticky top-0 ${
                      isColumnFocused ? 'bg-blue-200' : 'bg-gray-200'
                    } z-[25] border border-gray-300`}
                  >
                    {new Date(date).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {students.map((student, studentIndex) => {
              const isRowFocused = studentIndex === focusedCell.studentIndex;
              return (
                <tr
                  key={student.id}
                  className={`${isRowFocused ? '!bg-blue-200' : ''}`}
                >
                  <td
                    className={`px-3 py-2 text-sm sticky left-0 whitespace-nowrap ${
                      isRowFocused ? '!bg-blue-200' : studentIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    } z-[20] border border-gray-300`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {student.lastName} {student.firstName[0]}.{student.patronymic?.[0]?.length > 0 ? `${student.patronymic[0]}.` : ''}
                      </span>
                      <span className="text-xs text-gray-500">№{student.id}</span>
                    </div>
                  </td>
                  {availableDates.map((date, dateIndex) => {
                    const isCellFocused =
                      studentIndex === focusedCell.studentIndex &&
                      dateIndex === focusedCell.dateIndex;
                    const isColumnFocused = dateIndex === focusedCell.dateIndex;
                    return (
                      <td
                        key={`${student.id}-${date}`}
                        className={`px-1 py-1 text-center text-sm relative focus:outline-none 
                          ${isCellFocused ? 'bg-blue-100' : ''}
                          ${isColumnFocused ? 'bg-blue-50' : ''}
                          ${changedGrades[student.id]?.[date] ? '!bg-teal-200' : ''}
                          ${studentIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                          hover:bg-gray-100 cursor-pointer border border-gray-200`}
                        onClick={() => {
                          handleCellClick(studentIndex, dateIndex);
                          localStorage.setItem(`lastFocusedCell_${statementId}`, JSON.stringify({
                            studentIndex,
                            dateIndex
                          }));
                        }}
                        tabIndex={0}
                      >
                        <div className={`w-12 h-12 flex items-center justify-center mx-auto rounded-md ${
                          isCellFocused ? 'bg-blue-200 font-bold outline-2 outline-blue-600 outline' : ''
                        }`}>
                          {grades[student.id]?.[date] || '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradesTable;
