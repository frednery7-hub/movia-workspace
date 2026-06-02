import * as winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';

export const winstonConfig: winston.LoggerOptions = {
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    ...(isProd
      ? [
          new winston.transports.File({
            filename: 'logs/app.log',
            maxsize: 10_485_760,
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/security.log',
            level: 'warn',
            maxsize: 10_485_760,
            maxFiles: 10,
          }),
        ]
      : []),
  ],
};
