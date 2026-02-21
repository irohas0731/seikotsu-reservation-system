// =============================================================================
// 整骨院予約システム - Supabase Client Utilities
// =============================================================================

import { createBrowserClient as _createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * サーバーサイド用 Supabase クライアント
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components では Cookie set 不可
        }
      },
    },
  });
}

/**
 * ブラウザサイド用 Supabase クライアント
 */
export function createBrowserClient() {
  return _createBrowserClient(supabaseUrl, supabaseAnonKey);
}
