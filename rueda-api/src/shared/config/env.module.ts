import { Global, Module } from '@nestjs/common';
import { type Env, parseEnv } from './env.schema.js';

/** Injection token for the validated environment. */
export const ENV = Symbol('Env');

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: (): Env => parseEnv() }],
  exports: [ENV],
})
export class EnvModule {}
