import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Admin CRUD: BantCategory ────────────────────────────────────────────────

export const getBantCategoriesAdmin = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.bantCategory.findMany({
            orderBy: { id: 'asc' },
            include: { _count: { select: { questions: true } } },
        });
        res.json(categories);
    } catch (error) {
        console.error('getBantCategoriesAdmin error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT categories' });
    }
};

export const createBantCategory = async (req: Request, res: Response) => {
    try {
        const { code, name, status } = req.body;
        const category = await prisma.bantCategory.create({
            data: { code: (code as string).toUpperCase(), name, status: status || 'active' },
        });
        res.status(201).json(category);
    } catch (error: any) {
        console.error('createBantCategory error:', error);
        res.status(400).json({ error: error.message || 'Failed to create BANT category' });
    }
};

export const updateBantCategory = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { code, name, status } = req.body;
        const category = await prisma.bantCategory.update({
            where: { id },
            data: { code: code ? (code as string).toUpperCase() : undefined, name, status },
        });
        res.json(category);
    } catch (error: any) {
        console.error('updateBantCategory error:', error);
        res.status(400).json({ error: error.message || 'Failed to update BANT category' });
    }
};

export const deleteBantCategory = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.bantCategory.update({ where: { id }, data: { status: 'inactive' } });
        res.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        console.error('deleteBantCategory error:', error);
        res.status(400).json({ error: error.message || 'Failed to delete BANT category' });
    }
};

// ─── Admin CRUD: BantQuestion ────────────────────────────────────────────────

export const getBantQuestionsAdmin = async (req: Request, res: Response) => {
    try {
        const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : undefined;
        const questions = await prisma.bantQuestion.findMany({
            where: categoryId ? { category_id: categoryId } : undefined,
            include: { category: true },
            orderBy: [{ category_id: 'asc' }, { sort_order: 'asc' }],
        });
        res.json(questions);
    } catch (error) {
        console.error('getBantQuestionsAdmin error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT questions' });
    }
};

export const createBantQuestion = async (req: Request, res: Response) => {
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
    } catch (error: any) {
        console.error('createBantQuestion error:', error);
        res.status(400).json({ error: error.message || 'Failed to create BANT question' });
    }
};

export const updateBantQuestion = async (req: Request, res: Response) => {
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
    } catch (error: any) {
        console.error('updateBantQuestion error:', error);
        res.status(400).json({ error: error.message || 'Failed to update BANT question' });
    }
};

export const deleteBantQuestion = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.bantQuestion.update({ where: { id }, data: { is_active: false } });
        res.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        console.error('deleteBantQuestion error:', error);
        res.status(400).json({ error: error.message || 'Failed to delete BANT question' });
    }
};

// ─── Lead-facing reads ───────────────────────────────────────────────────────

export const getBantCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.bantCategory.findMany({
            where: { status: 'active' },
            orderBy: { id: 'asc' },
        });
        res.json(categories);
    } catch (error) {
        console.error('getBantCategories error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT categories' });
    }
};

export const getBantQuestions = async (req: Request, res: Response) => {
    try {
        const categoryId = parseInt(req.query.category_id as string);
        if (!categoryId) return res.status(400).json({ error: 'category_id is required' });

        const questions = await prisma.bantQuestion.findMany({
            where: { category_id: categoryId, is_active: true },
            orderBy: { sort_order: 'asc' },
        });
        res.json(questions);
    } catch (error) {
        console.error('getBantQuestions error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT questions' });
    }
};

export const getLeadBantAnswers = async (req: Request, res: Response) => {
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
    } catch (error) {
        console.error('getLeadBantAnswers error:', error);
        res.status(500).json({ error: 'Failed to fetch BANT answers' });
    }
};

export const saveLeadBantAnswers = async (req: any, res: Response) => {
    try {
        const leadId = parseInt(req.params.id);
        const userId = req.user?.id;
        const { category_id, answers } = req.body as {
            category_id: number;
            answers: { question_id: number; answer: string }[];
        };

        if (!category_id || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'category_id and answers array are required' });
        }

        const upserts = answers.map((a) =>
            prisma.leadBantAnswer.upsert({
                where: { lead_id_question_id: { lead_id: leadId, question_id: a.question_id } },
                update: { answer: a.answer },
                create: {
                    lead_id: leadId,
                    category_id,
                    question_id: a.question_id,
                    answer: a.answer,
                    created_by: userId ?? null,
                },
            })
        );

        await prisma.$transaction(upserts);
        res.json({ success: true });
    } catch (error) {
        console.error('saveLeadBantAnswers error:', error);
        res.status(500).json({ error: 'Failed to save BANT answers' });
    }
};
