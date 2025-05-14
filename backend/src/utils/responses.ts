import type { FastifyReply } from "fastify";

/**
 * APIエラーレスポンスを返すユーティリティ関数
 * @param reply Fastifyのレスポンスオブジェクト
 * @param statusCode HTTPステータスコード
 * @param message エラーメッセージ
 * @returns Fastifyレスポンス
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  message: string
): FastifyReply {
  return reply.status(statusCode).send({ error: message });
}

/**
 * 成功レスポンスを返すユーティリティ関数
 * @param reply Fastifyのレスポンスオブジェクト
 * @param data レスポンスデータ
 * @param statusCode HTTPステータスコード (デフォルト: 200)
 * @returns Fastifyレスポンス
 */
export function sendSuccess(
  reply: FastifyReply,
  data: object,
  statusCode: number = 200
): FastifyReply {
  return reply.status(statusCode).send(data);
}
