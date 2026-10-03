"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getAllDepartments = exports.getDepartments = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' }
        });
        res.json(departments);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching departments' });
    }
};
exports.getDepartments = getDepartments;
const getAllDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(departments);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching departments' });
    }
};
exports.getAllDepartments = getAllDepartments;
const createDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        const department = await prisma.department.create({
            data: { name }
        });
        res.status(201).json(department);
    }
    catch (error) {
        res.status(400).json({ message: 'Error creating department', error });
    }
};
exports.createDepartment = createDepartment;
const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, is_active } = req.body;
        const department = await prisma.department.update({
            where: { id: parseInt(id) },
            data: { name, is_active }
        });
        res.json(department);
    }
    catch (error) {
        res.status(400).json({ message: 'Error updating department', error });
    }
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        // Hard delete for master data usually restricted, but user asked for master
        await prisma.department.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Department deleted' });
    }
    catch (error) {
        res.status(400).json({ message: 'Error deleting department', error });
    }
};
exports.deleteDepartment = deleteDepartment;
