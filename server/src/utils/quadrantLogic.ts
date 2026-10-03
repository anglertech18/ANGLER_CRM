import dayjs from 'dayjs';

export const calculateQuadrant = (expectedClosureDate: Date | null | undefined): string => {
    if (!expectedClosureDate) return 'Nurturing';

    const today = dayjs();
    const closure = dayjs(expectedClosureDate);
    const daysDiff = closure.diff(today, 'day');

    if (daysDiff <= 10) return 'Q4'; // Hot
    if (daysDiff <= 15) return 'Q3'; // Warm
    if (daysDiff <= 30) return 'Q2'; // Progressing
    if (daysDiff > 30) return 'Q1';  // Interested

    return 'Nurturing';
};
