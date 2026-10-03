import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' }
        });
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching departments' });
    }
};

export const getAllDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching departments' });
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const department = await prisma.department.create({
            data: { name }
        });
        res.status(201).json(department);
    } catch (error) {
        res.status(400).json({ message: 'Error creating department', error });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, is_active } = req.body;
        const department = await prisma.department.update({
            where: { id: parseInt(id) },
            data: { name, is_active }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ message: 'Error updating department', error });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Hard delete for master data usually restricted, but user asked for master
        await prisma.department.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Department deleted' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting department', error });
    }
};
