import { describe, expect, it } from 'vitest';
import { Password } from '../../../contexts/auth/domain/value-objects/password.vo.js';
import { CryptoTemporaryPasswordAdapter } from './crypto-temporary-password.adapter.js';

const adapter = new CryptoTemporaryPasswordAdapter();

describe('CryptoTemporaryPasswordAdapter', () => {
  describe('generate', () => {
    it('produces a ten character code', () => {
      expect(adapter.generate()).toHaveLength(10);
    });

    it('avoids characters that are easy to misread aloud', () => {
      const codes = Array.from({ length: 200 }, () => adapter.generate()).join('');

      expect(codes).not.toMatch(/[ILO01l]/);
    });

    it('does not repeat itself', () => {
      const codes = new Set(Array.from({ length: 200 }, () => adapter.generate()));

      expect(codes.size).toBeGreaterThan(190);
    });
  });

  describe('generatePolicyCompliant', () => {
    it('produces a password the account policy accepts', () => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        expect(() => Password.create(adapter.generatePolicyCompliant())).not.toThrow();
      }
    });

    it('does not repeat itself', () => {
      const passwords = new Set(
        Array.from({ length: 100 }, () => adapter.generatePolicyCompliant()),
      );

      expect(passwords.size).toBe(100);
    });
  });
});
