/**
 * シリアライゼーション関連のユーティリティ関数
 * BigIntとかDateとかを安全にJSONシリアライズするためのヘルパー💪
 */

/**
 * BigIntをシリアライズするためのヘルパー関数
 * PrismaのBigIntフィールドを文字列に変換してJSONシリアライズ可能にするよ！
 * @param obj シリアライズしたいオブジェクト
 * @returns BigIntが文字列に変換されたオブジェクト
 */
export function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

/**
 * DateオブジェクトをISO文字列に変換するヘルパー関数
 * @param obj シリアライズしたいオブジェクト
 * @returns Dateが文字列に変換されたオブジェクト
 */
export function serializeDate(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    value instanceof Date ? value.toISOString() : value
  ));
}

/**
 * BigIntとDateの両方を一度に処理するヘルパー関数
 * APIレスポンスでよく使うパターンだよ！
 * @param obj シリアライズしたいオブジェクト
 * @returns 安全にシリアライズできる形に変換されたオブジェクト
 */
export function serializeForAPI(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}
