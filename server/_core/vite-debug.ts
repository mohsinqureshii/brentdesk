// Debug helper to understand production SSR issues
// This file contains diagnostic functions to help troubleshoot why production
// is not executing SSR code for article pages

export function logSSRDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SSR-DEBUG] ${message}`, data || '');
}

export function logSSRError(message: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [SSR-ERROR] ${message}`, error);
}
