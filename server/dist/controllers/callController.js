"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKRA = exports.getCalls = exports.logCall = void 0;
const client_1 = require("@prisma/client");
const dayjs_1 = __importDefault(require("dayjs"));
const prisma = new client_1.PrismaClient();
const logCall = async (req, res) => {
    try {
        const { lead_id, ...data } = req.body;
        data.user_id = req.user.id;
        data.lead_id = parseInt(lead_id);
        data.start_time = new Date(data.start_time);
        if (data.end_time)
            data.end_time = new Date(data.end_time);
        const call = await prisma.callLog.create({ data });
        // Update KRA for today
        const today = (0, dayjs_1.default)().startOf('day').toDate();
        const userId = req.user.id;
        const kra = await prisma.kraEntry.findFirst({
            where: { user_id: userId, date: today }
        });
        if (kra) {
            await prisma.kraEntry.update({
                where: { id: kra.id },
                data: { calls_actual: { increment: 1 } }
            });
        }
        else {
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
    }
    catch (error) {
        res.status(400).json({ message: 'Error logging call', error });
    }
};
exports.logCall = logCall;
const getCalls = async (req, res) => {
    try {
        const leadId = req.query.lead_id ? parseInt(req.query.lead_id) : undefined;
        const where = {};
        if (leadId)
            where.lead_id = leadId;
        const calls = await prisma.callLog.findMany({
            where,
            include: { user: { select: { first_name: true, last_name: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json(calls);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching calls' });
    }
};
exports.getCalls = getCalls;
const getKRA = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const today = (0, dayjs_1.default)().startOf('day').toDate();
        const kra = await prisma.kraEntry.findFirst({
            where: { user_id: userId, date: today }
        });
        res.json(kra || { calls_target: 20, calls_actual: 0 });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching KRA' });
    }
};
exports.getKRA = getKRA;
