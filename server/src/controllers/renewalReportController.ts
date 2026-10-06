import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import dayjs from 'dayjs';

// GET /api/renewal-reports/monthly
export const getMonthlyReport = async (req: Request, res: Response) => {
  try {
    const { months = 6, companyId, categoryId } = req.query;
    const numMonths = parseInt(String(months));

    const monthRanges = Array.from({ length: numMonths }, (_, i) => {
      const d = dayjs().subtract(numMonths - 1 - i, 'month');
      return { start: d.startOf('month').toDate(), end: d.endOf('month').toDate(), label: d.format('MMM YY') };
    });

    // Run all months in parallel — was sequential for-loop (N×3 serial queries)
    const results = await Promise.all(
      monthRanges.map(async ({ start, end, label }) => {
        const where: any = { expiry_date: { gte: start, lte: end } };
        if (companyId) where.renewal_account = { company_id: parseInt(String(companyId)) };
        if (categoryId) where.service_master = { category_id: parseInt(String(categoryId)) };

        const [due, renewed, amtAgg] = await Promise.all([
          (prisma as any).renewalCycle.count({ where }),
          (prisma as any).renewalCycle.count({ where: { ...where, status: 'RENEWED' } }),
          (prisma as any).renewalCycle.aggregate({ where, _sum: { amount_due: true, amount_collected: true } }),
        ]);

        return {
          month: label,
          due,
          renewed,
          renewal_pct: due > 0 ? Math.round((renewed / due) * 100) : 0,
          amount_due: parseFloat(amtAgg._sum?.amount_due ?? 0),
          amount_collected: parseFloat(amtAgg._sum?.amount_collected ?? 0),
        };
      })
    );

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ message: 'Error generating monthly report', detail: err.message });
  }
};

// GET /api/renewal-reports/service-wise
export const getServiceWiseReport = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    // Single SQL GROUP BY replaces 4-level nested include + JS aggregation over entire tree
    let dateClause = '';
    const params: any[] = [];
    if (from) { dateClause += ' AND rc.expiry_date >= ?'; params.push(new Date(String(from))); }
    if (to)   { dateClause += ' AND rc.expiry_date <= ?'; params.push(new Date(String(to))); }

    const rows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT
        c.id                                                        AS category_id,
        c.name                                                      AS category,
        c.code                                                      AS category_code,
        c.color,
        COUNT(rc.id)                                                AS due,
        SUM(CASE WHEN rc.status = 'RENEWED' THEN 1 ELSE 0 END)     AS renewed,
        SUM(COALESCE(rc.amount_due, 0))                            AS amount_due,
        SUM(COALESCE(rc.amount_collected, 0))                      AS amount_collected
      FROM renewal_service_category c
      LEFT JOIN renewal_service_master s
        ON s.category_id = c.id AND s.is_active = 1
      LEFT JOIN renewal_service_instance si
        ON si.service_master_id = s.id AND si.is_active = 1
      LEFT JOIN renewal_cycle rc
        ON rc.service_instance_id = si.id${dateClause}
      WHERE c.is_active = 1
      GROUP BY c.id, c.name, c.code, c.color, c.sort_order
      ORDER BY c.sort_order, c.name
    `, ...params);

    const result = rows.map((r: any) => {
      const due = Number(r.due ?? 0);
      const renewed = Number(r.renewed ?? 0);
      const amount_due = parseFloat(r.amount_due ?? 0);
      const amount_collected = parseFloat(r.amount_collected ?? 0);
      return {
        category: r.category,
        category_code: r.category_code,
        color: r.color,
        due,
        renewed,
        renewal_pct: due > 0 ? Math.round((renewed / due) * 100) : 0,
        amount_due,
        amount_collected,
        outstanding: amount_due - amount_collected,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: 'Error generating service-wise report', detail: err.message });
  }
};

// GET /api/renewal-reports/upcoming
export const getUpcomingReport = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const until = dayjs().add(parseInt(String(days)), 'day').toDate();

    const instances = await (prisma as any).renewalServiceInstance.findMany({
      where: {
        expiry_date: { gte: new Date(), lte: until },
        status: { notIn: ['RENEWED', 'NOT_RENEWING', 'CANCELLED'] },
        is_active: true,
      },
      orderBy: { expiry_date: 'asc' },
      select: {
        id: true, identifier: true, expiry_date: true, status: true, amount_due: true,
        service_master: { select: { id: true, name: true, category: { select: { id: true, name: true, color: true } } } },
        renewal_account: { select: { id: true, client_company: { select: { id: true, name: true } } } },
      },
    });

    res.json(instances);
  } catch (err: any) {
    res.status(500).json({ message: 'Error generating upcoming report', detail: err.message });
  }
};

// GET /api/renewal-reports/overdue
export const getOverdueReport = async (req: Request, res: Response) => {
  try {
    const instances = await (prisma as any).renewalServiceInstance.findMany({
      where: {
        expiry_date: { lt: new Date() },
        status: { notIn: ['RENEWED', 'NOT_RENEWING', 'CANCELLED', 'DEACTIVATED'] },
        is_active: true,
      },
      orderBy: { expiry_date: 'asc' },
      select: {
        id: true, identifier: true, expiry_date: true, status: true, amount_due: true,
        service_master: { select: { id: true, name: true, category: { select: { id: true, name: true, color: true } } } },
        renewal_account: { select: { id: true, client_company: { select: { id: true, name: true } } } },
      },
    });
    res.json(instances);
  } catch (err: any) {
    res.status(500).json({ message: 'Error generating overdue report', detail: err.message });
  }
};
