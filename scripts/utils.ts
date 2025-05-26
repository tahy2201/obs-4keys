
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
