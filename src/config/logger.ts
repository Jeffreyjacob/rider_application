import pino from "pino";
import { env } from "./env";

const isDev = env.NODE_ENV === "development";
const hasLoki = !!process.env.LOKI_HOST;

const getTransport = () => {
  if (hasLoki) {
    return pino.transport({
      targets: [
        {
          target: "pino-loki",
          level: "info",
          options: {
            host: process.env.LOKI_HOST,
            label: {
              app: "rider-application",
              env: env.NODE_ENV,
            },
            replaceTimestamp: true,
            silenceErrors: false,
          },
        },
        ...(isDev
          ? [
              {
                target: "pino-pretty",
                options: {
                  colorize: true,
                  translateTime: "SYS:standard",
                  ignore: "pid,hostname",
                },
              },
            ]
          : []),
      ],
    });
  }

  if (isDev) {
    return pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    });
  }
};

export const logger = pino(
  {
    level: isDev ? "debug" : "info",
    redact: [
      "*.password",
      "*.token",
      "req.headers.authorization",
      "*.refreshtoken",
      "*.resetToken",
      "*.stripeCustomerId",
    ],
    base: {
      name: "rider application api",
      env: env.NODE_ENV,
    },
  },
  getTransport()
);
