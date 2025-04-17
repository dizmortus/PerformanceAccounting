// academicService.js
import { Op } from "sequelize";

export function calculateCurrentSemester(admissionYear) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    
    let academicYearsPassed = currentYear - admissionYear;
    
    if (month >= 1 && month < 9) {
        academicYearsPassed -= 1;
    }
    
    const isFirstSemester = (month >= 9) || (month === 1 && now.getDate() <= 15);
    const currentSemesterNumber = isFirstSemester ? 1 : 2;
    
    const totalSemesters = (academicYearsPassed * 2) + currentSemesterNumber;
    
    console.log([
        `Год поступления: ${admissionYear}`,
        `Текущая дата: ${now.toISOString()}`,
        `Учебных лет прошло: ${academicYearsPassed}`,
        `Текущий семестр в году: ${currentSemesterNumber}`,
        `Всего семестров: ${totalSemesters}`
    ].join(' | '));
    
    return totalSemesters;
}

export function getDayRange(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return { startOfDay, endOfDay };
}

export function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}

export function filterCurrentSemesterItems(items, getAdmissionYear) {
    return items.filter(item => {
        const admissionYear = getAdmissionYear(item);
        if (!admissionYear) return false;
        
        const currentSemester = calculateCurrentSemester(admissionYear);
        return item.semester?.semester === currentSemester;
    });
}