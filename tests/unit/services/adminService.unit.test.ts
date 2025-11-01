// tests/unit/services/adminService.unit.test.ts

const mockedPrisma = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as any;

const mockedBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};

jest.mock('@/db/prisma', () => ({ __esModule: true, default: mockedPrisma }));
jest.mock('bcrypt', () => mockedBcrypt);

const AdminService = require('@/services/adminService') as typeof import('../../../src/services/adminService');

import { BCRYPT_SALT_ROUNDS } from '../../../src/config';

describe('adminService (unit)', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('listUsers', () => {
    it('returns users and meta', async () => {
      mockedPrisma.user.findMany.mockResolvedValue([{ id: '1', name: 'A' }]);
      mockedPrisma.user.count.mockResolvedValue(1);

      const result = await AdminService.listUsers(1, 20);

      expect(mockedPrisma.user.findMany).toHaveBeenCalled();
      expect(mockedPrisma.user.count).toHaveBeenCalled();
      expect(result.users).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('createUser', () => {
    it('hashes password and creates user', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed-pass');
      const created = { id: '1', name: 'A', email: 'a@test.com', role: 'PATIENT' };
      mockedPrisma.user.create.mockResolvedValue(created);

      const out = await AdminService.createUser({
        name: 'A',
        email: 'a@test.com',
        password: 'plain',
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('plain', Number(BCRYPT_SALT_ROUNDS));
      expect(mockedPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ email: 'a@test.com' }),
        select: expect.any(Object),
      }));
      expect(out).toEqual(created);
    });

    it('rethrows P2002 as code P2002', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed-pass');
      mockedPrisma.user.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        AdminService.createUser({ name: 'A', email: 'a@test.com', password: 'p' })
      ).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  describe('updateUser', () => {
    it('hashes new password and updates', async () => {
      mockedBcrypt.hash.mockResolvedValue('new-hash');
      const updated = { id: '1', name: 'B' };
      mockedPrisma.user.update.mockResolvedValue(updated);

      const out = await AdminService.updateUser('1', { name: 'B', password: 'new' });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('new', Number(BCRYPT_SALT_ROUNDS));
      expect(mockedPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '1' },
        data: expect.objectContaining({ name: 'B', password: 'new-hash' }),
        select: expect.any(Object),
      }));
      expect(out).toEqual(updated);
    });

    it('rethrows P2002 as P2002', async () => {
      mockedBcrypt.hash.mockResolvedValue('h');
      mockedPrisma.user.update.mockRejectedValue({ code: 'P2002' });

      await expect(AdminService.updateUser('1', { email: 'x@test.com' })).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  describe('setUserStatus', () => {
    it('updates status', async () => {
      const out = { id: '1', isActive: false };
      mockedPrisma.user.update.mockResolvedValue(out);

      const res = await AdminService.setUserStatus('1', false);

      expect(mockedPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '1' },
        data: { isActive: false },
        select: expect.any(Object),
      }));
      expect(res).toEqual(out);
    });

    it('rethrows error from prisma', async () => {
      mockedPrisma.user.update.mockRejectedValue(new Error('boom'));
      await expect(AdminService.setUserStatus('1', true)).rejects.toThrow('boom');
    });
  });
});
