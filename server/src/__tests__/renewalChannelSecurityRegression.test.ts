import fs from 'fs';
import path from 'path';

describe('renewal channel mutation security', () => {
  const routes = fs.readFileSync(path.resolve(__dirname, '../routes/renewalFollowUpChannelActionRoutes.ts'), 'utf8');
  const controller = fs.readFileSync(path.resolve(__dirname, '../controllers/renewalFollowUpChannelActionController.ts'), 'utf8');

  it('requires Renewals can_edit for every channel mutation route', () => {
    const mutationLines = routes.split(/\r?\n/).filter(line => /router\.(post|put|delete)\(/.test(line));
    expect(mutationLines.length).toBeGreaterThan(0);
    for (const line of mutationLines) {
      expect(line).toContain("checkPrivilege('Renewals', 'can_edit')");
    }
  });

  it('uses the authenticated user for outbox completion endpoints', () => {
    expect(controller).not.toMatch(/req\.body\.user_id/);
    expect(controller.match(/const user = \(req as any\)\.user/g)?.length).toBeGreaterThanOrEqual(6);
  });
});
