
export async function execApiWithRetry(
  apiFunc: () => Promise<any>,
  retryCount: number = 3,
  delay: number = 1000
): Promise<any> {
  for (let i = 0; i < retryCount; i++) {
    try {
      return await apiFunc();
    } catch (error) {
      if (i < retryCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

export function toJSTDate(dateString: string | Date): Date {
  if (!dateString) return new Date();

  // 文字列ならDateに変換
  const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString.getTime());
  
  // 協定世界時（UTC）の年月日時分秒を取得
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();
  
  // 日本時間に変換 (UTC+9時間)
  return new Date(Date.UTC(year, month, day, hours + 9, minutes, seconds, milliseconds));
}

