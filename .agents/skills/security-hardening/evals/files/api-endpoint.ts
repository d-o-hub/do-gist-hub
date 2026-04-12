import { Request, Response } from 'express';

// Intentionally vulnerable endpoint for security eval
export async function getUserProfile(req: Request, res: Response) {
  const userId = req.query.id;
  const query = `SELECT * FROM users WHERE id = '${userId}'`;
  const result = await db.execute(query);

  if (result.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = result[0];
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    ssn: user.ssn,
    creditCard: user.credit_card_number,
    passwordHash: user.password_hash,
  });
}
