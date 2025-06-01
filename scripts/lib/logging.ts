import winston from 'winston';
import { format as dateFnsFormat, toZonedTime } from 'date-fns-tz';

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const TIME_ZONE = 'Asia/Tokyo';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => {
      // UTCのタイムスタンプをJSTに変換し、指定のフォーマットに整形
      const jstDate = toZonedTime(new Date(), TIME_ZONE);
      const formattedTimestamp = dateFnsFormat(jstDate, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", { timeZone: TIME_ZONE });
      return `[${formattedTimestamp}] ${info.level}: ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;