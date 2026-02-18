// Root page - rewritten to /landing.html via next.config.mjs beforeFiles rewrite
// This file exists only as a fallback; the rewrite should serve landing.html directly
import { redirect } from 'next/navigation';
export default function RootPage() {
  redirect('/landing.html');
}
