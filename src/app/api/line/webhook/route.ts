import { NextRequest, NextResponse } from "next/server";

/**
 * LINE Webhook Endpoint
 *
 * LINE Messaging API からのイベントを受信するエンドポイント。
 * 将来のLINE連携のためのプレースホルダー。
 *
 * LINE Developer Console でこのURLを Webhook URL として設定:
 * https://your-domain.com/api/line/webhook
 *
 * 主な対応予定イベント:
 * - follow: 友だち追加時 → 患者の line_user_id を紐付け
 * - message: メッセージ受信 → 予約確認・変更リクエスト
 * - postback: リッチメニュー操作 → 予約アクション
 */

// LINE Webhook verification endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", message: "LINE Webhook endpoint is active" });
}

// LINE Webhook event handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify LINE signature (placeholder)
    const signature = request.headers.get("x-line-signature");
    if (!signature) {
      // In development, allow without signature
      console.log("[LINE Webhook] No signature - development mode");
    }

    // TODO: Verify signature with channel secret
    // const channelSecret = process.env.LINE_CHANNEL_SECRET;
    // const isValid = validateSignature(body, channelSecret, signature);

    const events = body.events || [];

    for (const event of events) {
      switch (event.type) {
        case "follow": {
          // User added the bot as a friend
          const lineUserId = event.source?.userId;
          console.log(`[LINE Webhook] New follower: ${lineUserId}`);

          // TODO: Link LINE user ID to patient record
          // 1. Send a message asking for phone number
          // 2. When phone number is received, look up patient and update line_user_id
          break;
        }

        case "unfollow": {
          // User blocked or removed the bot
          const lineUserId = event.source?.userId;
          console.log(`[LINE Webhook] Unfollowed: ${lineUserId}`);

          // TODO: Remove line_user_id from patient record
          break;
        }

        case "message": {
          // Text message received
          const lineUserId = event.source?.userId;
          const messageText = event.message?.text;
          console.log(`[LINE Webhook] Message from ${lineUserId}: ${messageText}`);

          // TODO: Handle message types
          // - "予約" → Show available slots
          // - "確認" → Show upcoming reservations
          // - "キャンセル" → Cancel reservation flow
          // - Phone number → Link account
          break;
        }

        case "postback": {
          // Postback action (from rich menu, buttons, etc.)
          const postbackData = event.postback?.data;
          console.log(`[LINE Webhook] Postback: ${postbackData}`);

          // TODO: Parse postback data and handle actions
          // - action=reserve&date=2024-01-15&time=09:00
          // - action=cancel&reservation_id=xxx
          // - action=confirm&reservation_id=xxx
          break;
        }

        default:
          console.log(`[LINE Webhook] Unhandled event type: ${event.type}`);
      }
    }

    // LINE requires 200 OK response
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[LINE Webhook] Error processing webhook:", error);
    // Still return 200 to prevent LINE from retrying
    return NextResponse.json({ status: "error" });
  }
}
