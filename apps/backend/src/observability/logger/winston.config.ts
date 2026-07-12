import * as winston from 'winston';

import { getRequestContext } from '../context/request-context';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Injeta o contexto da requisição (correlationId, método, rota) em todo
 * log emitido durante uma requisição — inclusive nos logs dos services,
 * que não têm acesso ao objeto Request.
 *
 * É o que permite rastrear uma requisição inteira: filtrar por
 * correlationId nos logs mostra tudo que aconteceu naquela chamada.
 */
const withRequestContext = winston.format((info) => {
  const context = getRequestContext();
  if (context) {
    info.correlationId = info.correlationId ?? context.correlationId;
    if (context.method) info.method = info.method ?? context.method;
    if (context.route) info.route = info.route ?? context.route;
  }
  return info;
});

/**
 * Transports de arquivo só fazem sentido onde o filesystem persiste.
 *
 * Em Cloud Run o filesystem é efêmero: os arquivos somem a cada
 * restart e o Cloud Logging captura o stdout de qualquer forma —
 * escrever em disco lá só consome espaço sem entregar nada.
 *
 * LOG_TO_FILES habilita os arquivos explicitamente (ex.: rodando em VM
 * ou on-premise, onde há disco persistente e rotação faz sentido).
 */
const logToFiles = process.env.LOG_TO_FILES === 'true';

export const winstonConfig: winston.LoggerOptions = {
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    withRequestContext(),
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    ...(logToFiles
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
