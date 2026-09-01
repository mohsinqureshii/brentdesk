/**
 * Rate Limiting Middleware
 * Implements API rate limits per user type
 * Per BRD V4 Security Requirements
 */

// Rate limit configuration by user type
interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message: string;       // Error message when limit exceeded
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  anonymous: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 30,         // 30 requests per minute
    message: 'Too many requests. Please try again later.'
  },
  authenticated: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 100,        // 100 requests per minute
    message: 'Rate limit exceeded. Please slow down.'
  },
  partner: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 200,        // 200 requests per minute (API access)
    message: 'API rate limit exceeded. Consider upgrading your plan.'
  },
  admin: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 500,        // 500 requests per minute
    message: 'Admin rate limit exceeded.'
  }
};

// Endpoint-specific rate limits (more restrictive)
const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  'auth.login': {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,             // 5 attempts per 15 minutes
    message: 'Too many login attempts. Please wait 15 minutes.'
  },
  'auth.register': {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,             // 3 registrations per hour per IP
    message: 'Too many registration attempts. Please try again later.'
  },
  'newsletter.subscribe': {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 5,             // 5 subscriptions per hour
    message: 'Too many subscription attempts.'
  },
  'leads.capture': {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 10,            // 10 lead captures per hour
    message: 'Too many form submissions.'
  },
  'resources.download': {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 20,            // 20 downloads per hour
    message: 'Download limit reached. Please try again later.'
  }
};

// Request tracking store
interface RequestTracker {
  count: number;
  windowStart: number;
}

const requestTrackers = new Map<string, RequestTracker>();

/**
 * Generate a unique key for rate limiting
 */
function getRateLimitKey(identifier: string, endpoint?: string): string {
  return endpoint ? `${identifier}:${endpoint}` : identifier;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(params: {
  identifier: string;      // IP address or user ID
  userType: 'anonymous' | 'authenticated' | 'partner' | 'admin';
  endpoint?: string;       // Optional specific endpoint
}): { allowed: boolean; remaining: number; resetIn: number; message?: string } {
  const { identifier, userType, endpoint } = params;

  // Get the appropriate rate limit config
  let config: RateLimitConfig;
  let key: string;

  if (endpoint && ENDPOINT_LIMITS[endpoint]) {
    config = ENDPOINT_LIMITS[endpoint];
    key = getRateLimitKey(identifier, endpoint);
  } else {
    config = RATE_LIMITS[userType] || RATE_LIMITS.anonymous;
    key = getRateLimitKey(identifier);
  }

  const now = Date.now();
  const tracker = requestTrackers.get(key);

  // Check if we need to reset the window
  if (!tracker || (now - tracker.windowStart) >= config.windowMs) {
    // Start new window
    requestTrackers.set(key, {
      count: 1,
      windowStart: now
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    };
  }

  // Increment counter
  tracker.count++;

  // Check if limit exceeded
  if (tracker.count > config.maxRequests) {
    const resetIn = config.windowMs - (now - tracker.windowStart);
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      message: config.message
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - tracker.count,
    resetIn: config.windowMs - (now - tracker.windowStart)
  };
}

/**
 * Record a request for rate limiting
 */
export function recordRequest(identifier: string, endpoint?: string): void {
  const key = getRateLimitKey(identifier, endpoint);
  const now = Date.now();
  const tracker = requestTrackers.get(key);

  if (!tracker) {
    requestTrackers.set(key, {
      count: 1,
      windowStart: now
    });
  } else {
    tracker.count++;
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(params: {
  identifier: string;
  userType: 'anonymous' | 'authenticated' | 'partner' | 'admin';
  endpoint?: string;
}): Record<string, string> {
  const result = checkRateLimit(params);
  const config = params.endpoint && ENDPOINT_LIMITS[params.endpoint]
    ? ENDPOINT_LIMITS[params.endpoint]
    : RATE_LIMITS[params.userType] || RATE_LIMITS.anonymous;

  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000))
  };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimitEntries(): number {
  const now = Date.now();
  let cleaned = 0;
  const maxWindowMs = Math.max(
    ...Object.values(RATE_LIMITS as any).map((c: any) => c.windowMs),
    ...Object.values(ENDPOINT_LIMITS as any).map((c: any) => c.windowMs)
  );

  const entries = Array.from(requestTrackers.entries());
  for (const [key, tracker] of entries) {
    if ((now - tracker.windowStart) > maxWindowMs * 2) {
      requestTrackers.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  totalTrackers: number;
  activeTrackers: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
} {
  const now = Date.now();
  let activeTrackers = 0;
  const endpointCounts = new Map<string, number>();

  const entries = Array.from(requestTrackers.entries());
  for (const [key, tracker] of entries) {
    // Check if tracker is still in active window
    const config = RATE_LIMITS.authenticated; // Use default window
    if ((now - tracker.windowStart) < config.windowMs) {
      activeTrackers++;
    }

    // Extract endpoint from key if present
    const parts = key.split(':');
    if (parts.length > 1) {
      const endpoint = parts.slice(1).join(':');
      endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + tracker.count);
    }
  }

  // Get top endpoints
  const topEndpoints = Array.from(endpointCounts.entries())
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTrackers: requestTrackers.size,
    activeTrackers,
    topEndpoints
  };
}
