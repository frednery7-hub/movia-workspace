import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().optional().allow(''),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  ALLOWED_ORIGINS: Joi.string().default(''),
  CORS_ORIGIN: Joi.string().optional().allow(''),
  PRIVACY_REGION: Joi.string().default('CL'),
  PRIVACY_RESPONSE_SLA_DAYS: Joi.number().integer().positive().default(30),
  MAPBOX_PUBLIC_TOKEN: Joi.string().allow('').optional(),
  SENTRY_DSN: Joi.string().allow('').optional(),
  ADDRESS_SEARCH_ENABLED: Joi.string().valid('true', 'false').default('false'),
  GOOGLE_GEOCODING_API_KEY: Joi.string().allow('').optional(),
  ADDRESS_SEARCH_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(604_800),
  ADDRESS_SEARCH_MAX_RESULTS: Joi.number().integer().positive().default(5),
  PLACES_SEARCH_ENABLED: Joi.string().valid('true', 'false').default('false'),
  GOOGLE_PLACES_API_KEY: Joi.string().allow('').optional(),
  PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(300),
  PLACES_DETAILS_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(604_800),
  PLACES_MAX_RESULTS: Joi.number().integer().positive().default(5),
  PLACES_COUNTRY_CODE: Joi.string().length(2).default('CL'),
  PLACES_LOCATION_BIAS_LAT: Joi.number().default(-33.4489),
  PLACES_LOCATION_BIAS_LNG: Joi.number().default(-70.6693),
  PLACES_LOCATION_BIAS_RADIUS_METERS: Joi.number().positive().default(35_000),
  METRICS_TOKEN: Joi.when('NODE_ENV', {
    is: Joi.valid('production', 'staging'),
    then: Joi.string().min(16).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
});
