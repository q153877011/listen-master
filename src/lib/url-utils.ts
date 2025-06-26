/**
 * 从请求中获取原始URL，支持多种fallback方式
 */
export function getOriginFromRequest(request: Request): string {
  // 尝试多种方式获取origin
  const origin = 
    request.headers.get('origin') || 
    request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` ||
    new URL(request.url).origin ||
    'http://localhost:3000';
  
  console.log('Available headers:', {
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    host: request.headers.get('host'),
    'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    'request-url': request.url
  });
  
  console.log('Resolved origin:', origin);
  return origin;
} 