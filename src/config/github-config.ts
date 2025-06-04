/**
 * GitHubの設定を管理するファイル
 * Next.jsのAPIルートやバックエンドスクリプトで共通で使うよ！
 */

// GitHub APIのトークン
export const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;

// デフォルトのリポジトリオーナーとリポジトリ名
export const DEFAULT_REPO_OWNER = process.env.DEFAULT_REPO_OWNER;
export const DEFAULT_REPO_NAME = process.env.DEFAULT_REPO_NAME;

// その他の共通設定もここに追加できるよ
export const GITHUB_API_VERSION = '2022-11-28'; // GitHub API のバージョン
