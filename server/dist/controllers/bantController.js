"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveLeadBantAnswers = exports.getLeadBantAnswers = exports.getBantQuestions = exports.getBantCategories = exports.deleteBantQuestion = exports.updateBantQuestion = exports.createBantQuestion = exports.getBantQuestionsAdmin = exports.deleteBantCategory = exports.updateBantCategory = exports.createBantCategory = exports.getBantCategoriesAdmin = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ─── Admin CRUD: BantCategory ────────────────────────────────────────────────
const getBantCategoriesAdmin = async (req, res) => {
    try {
        const categories = await prisma.bantCategory.findMany({
            orderBy: { id: 'asc' },
            include: { _count: { select: { questions: true } } },
        });
        res.json(categories);
    }
    catch (error) {
        console.error('getBantCategoriesAdmin error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT categories' });
    }
};
exports.getBantCategoriesAdmin = getBantCategoriesAdmin;
const createBantCategory = async (req, res) => {
    try {
        const { code, name, status } = req.body;
        const category = await prisma.bantCategory.create({
            data: { code: code.toUpperCase(), name, status: status || 'active' },
        });
        res.status(201).json(category);
    }
    catch (error) {
        console.error('createBantCategory error:', error);
        res.status(400).json({ error: error.message || 'Failed to create BANT category' });
    }
};
exports.createBantCategory = createBantCategory;
const updateBantCategory = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { code, name, status } = req.body;
        const category = await prisma.bantCategory.update({
            where: { id },
            data: { code: code ? code.toUpperCase() : undefined, name, status },
        });
        res.json(category);
    }
    catch (error) {
        console.error('updateBantCategory error:', error);
        res.status(400).json({ error: error.message || 'Failed to update BANT category' });
    }
};
exports.updateBantCategory = updateBantCategory;
const deleteBantCategory = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.bantCategory.update({ where: { id }, data: { status: 'inactive' } });
        res.json({ message: 'Deleted successfully' });
    }
    catch (error) {
        console.error('deleteBantCategory error:', error);
        res.status(400).json({ error: error.message || 'Failed to delete BANT category' });
    }
};
exports.deleteBantCategory = deleteBantCategory;
// ─── Admin CRUD: BantQuestion ────────────────────────────────────────────────
const getBantQuestionsAdmin = async (req, res) => {
    try {
        const categoryId = req.query.category_id ? parseInt(req.query.category_id) : undefined;
        const questions = await prisma.bantQuestion.findMany({
            where: categoryId ? { category_id: categoryId } : undefined,
            include: { category: true },
            orderBy: [{ category_id: 'asc' }, { sort_order: 'asc' }],
        });
        res.json(questions);
    }
    catch (error) {
        console.error('getBantQuestionsAdmin error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT questions' });
    }
};
exports.getBantQuestionsAdmin = getBantQuestionsAdmin;
const createBantQuestion = async (req, res) => {
    try {
        const { category_id, question, sort_order, is_active } = req.body;
        const q = await prisma.bantQuestion.create({
            data: {
                category_id: parseInt(category_id),
                question,
                sort_order: parseInt(sort_order) || 0,
                is_active: is_active !== false && is_active !== 'false',
            },
        });
        res.status(201).json(q);
    }
    catch (error) {
        console.error('createBantQuestion error:', error);
        res.status(400).json({ error: error.message || 'Failed to create BANT question' });
    }
};
exports.createBantQuestion = createBantQuestion;
const updateBantQuestion = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { question, sort_order, is_active } = req.body;
        const q = await prisma.bantQuestion.update({
            where: { id },
            data: {
                question,
                sort_order: sort_order !== undefined ? parseInt(sort_order) : undefined,
                is_active: is_active !== undefined ? (is_active === true || is_active === 'true') : undefined,
            },
        });
        res.json(q);
    }
    catch (error) {
        console.error('updateBantQuestion error:', error);
        res.status(400).json({ error: error.message || 'Failed to update BANT question' });
    }
};
exports.updateBantQuestion = updateBantQuestion;
const deleteBantQuestion = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.bantQuestion.update({ where: { id }, data: { is_active: false } });
        res.json({ message: 'Deleted successfully' });
    }
    catch (error) {
        console.error('deleteBantQuestion error:', error);
        res.status(400).json({ error: error.message || 'Failed to delete BANT question' });
    }
};
exports.deleteBantQuestion = deleteBantQuestion;
// ─── Lead-facing reads ───────────────────────────────────────────────────────
const getBantCategories = async (req, res) => {
    try {
        const categories = await prisma.bantCategory.findMany({
            where: { status: 'active' },
            orderBy: { id: 'asc' },
        });
        res.json(categories);
    }
    catch (error) {
        console.error('getBantCategories error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT categories' });
    }
};
exports.getBantCategories = getBantCategories;
const getBantQuestions = async (req, res) => {
    try {
        const categoryId = parseInt(req.query.category_id);
        if (!categoryId)
            return res.status(400).json({ error: 'category_id is required' });
        const questions = await prisma.bantQuestion.findMany({
            where: { category_id: categoryId, is_active: true },
            orderBy: { sort_order: 'asc' },
        });
        res.json(questions);
    }
    catch (error) {
        console.error('getBantQuestions error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT questions' });
    }
};
exports.getBantQuestions = getBantQuestions;
const getLeadBantAnswers = async (req, res) => {
    try {
        const leadId = parseInt(req.params.id);
        const answers = await prisma.leadBantAnswer.findMany({
            where: { lead_id: leadId },
            include: {
                category: true,
                question: true,
            },
        });
        res.json(answers);
    }
    catch (error) {
        console.error('getLeadBantAnswers error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT answers' });
    }
};
exports.getLeadBantAnswers = getLeadBantAnswers;
const saveLeadBantAnswers = async (req, res) => {
    try {
        const leadId = parseInt(req.params.id);
        const userId = req.user?.id;
        const { category_id, answers } = req.body;
        if (!category_id || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'category_id and answers array are required' });
        }
        const upserts = answers.map((a) => prisma.leadBantAnswer.upsert({
            where: { lead_id_question_id: { lead_id: leadId, question_id: a.question_id } },
            update: { answer: a.answer },
            create: {
                lead_id: leadId,
                category_id,
                question_id: a.question_id,
                answer: a.answer,
                created_by: userId ?? null,
            },
        }));
        await prisma.$transaction(upserts);
        res.json({ success: true });
    }
    catch (error) {
        console.error('saveLeadBantAnswers error:', error);
        res.status(500).json({ error: 'Failed to save BANT answers' });
    }
};
exports.saveLeadBantAnswers = saveLeadBantAnswers;
