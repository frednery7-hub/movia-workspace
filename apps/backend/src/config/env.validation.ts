import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  MAPBOX_PUBLIC_TOKEN: Joi.string().allow('').optional(),
  SENTRY_DSN: Joi.string().allow('').optional(),
});
