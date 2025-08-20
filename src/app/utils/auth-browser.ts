// src/app/utils/auth-browser.ts
import { authenticator } from 'otplib';
import type { AuthenticatorOptions } from 'otplib/core';

authenticator.options = {
  encoding: 'base32',
} as unknown as Partial<AuthenticatorOptions<string>>;

export default authenticator;
