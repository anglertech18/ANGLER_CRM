import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

export const logCall = async (req: Request, res: Response) => {
    try {
        const { lead_id, ...data } = req.body;
        data.user_id = (req as any).user.id;
        data.lead_id = parseInt(lead_id);
        data.start_time = new Date(data.start_time);
        if (data.end_time) data.end_time = new Date(data.end_time);

        const call = await prisma.callLog.create({ data });

        // Update KRA for today
        const today = dayjs().startOf('day').toDate();
        const userId = (req as any).user.id;

        const kra = await prisma.kraEntry.findFirst({
            where: { user_id: userId, date: today }
        });

        if (kra) {
            await prisma.kraEntry.update({
                where: { id: kra.id },
                data: { calls_actual: { increment: 1 } }
            });
        } else {
            // Create KRA entry if missing (should be created by cron/login, but fallback here)
            await prisma.kraEntry.create({
                data: {
                    user_id: userId,
                    date: today,
                    calls_target: 20, // Default target
                    calls_actual: 1
                }
            });
        }

        res.status(201).json(call);
    } catch (error) {
        res.status(400).json({ message: 'Error logging call', error });
    }
};

export const getCalls = async (req: Request, res: Response) => {
    try {
        const leadId = req.query.lead_id ? parseInt(req.query.lead_id as string) : undefined;
        const where: any = {};
        if (leadId) where.lead_id = leadId;

        const calls = await prisma.callLog.findMany({
            where,
            include: { user: { select: { first_name: true, last_name: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json(calls);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching calls' });
    }
};

export const getKRA = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const today = dayjs().startOf('day').toDate();

        const kra = await prisma.kraEntry.findFirst({
            where: { user_id: userId, date: today }
        });

        res.json(kra || { calls_target: 20, calls_actual: 0 });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching KRA' });
    }
};
