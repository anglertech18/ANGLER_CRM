"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateQuadrant = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const calculateQuadrant = (expectedClosureDate) => {
    if (!expectedClosureDate)
        return 'Nurturing';
    const today = (0, dayjs_1.default)();
    const closure = (0, dayjs_1.default)(expectedClosureDate);
    const daysDiff = closure.diff(today, 'day');
    if (daysDiff <= 10)
        return 'Q4'; // Hot
    if (daysDiff <= 15)
        return 'Q3'; // Warm
    if (daysDiff <= 30)
        return 'Q2'; // Progressing
    if (daysDiff > 30)
        return 'Q1'; // Interested
    return 'Nurturing';
};
exports.calculateQuadrant = calculateQuadrant;
