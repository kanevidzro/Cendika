import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { logger } from '@utils/logger';

// Geolocation middleware - extracts and validates location info
export const geoLocation = createMiddleware(async (c: Context, next: Next) => {
  // Get location from headers (set by CDN/Load Balancer)
  const country = c.req.header('cf-ipcountry') || // Cloudflare
                  c.req.header('x-vercel-ip-country') || // Vercel
                  c.req.header('x-country-code'); // Custom

  const city = c.req.header('cf-ipcity') ||
               c.req.header('x-vercel-ip-city');

  const region = c.req.header('cf-region') ||
                 c.req.header('x-vercel-ip-country-region');

  const timezone = c.req.header('cf-timezone') ||
                   c.req.header('x-vercel-ip-timezone');

  // Set geo info in context
  if (country) {
    c.set('country', country);
    c.set('city', city || 'Unknown');
    c.set('region', region || 'Unknown');
    c.set('timezone', timezone || 'UTC');

    logger.debug({
      country,
      city,
      region,
      timezone,
    }, 'Geolocation detected');
  }

  await next();
});

// African region validator
export const requireAfricanRegion = createMiddleware(async (c: Context, next: Next) => {
  const country = c.get('country') as string;

  const africanCountries = [
    'GH', 'NG', 'KE', 'ZA', 'UG', 'TZ', 'RW', 'CI', 'SN', 'CM',
    'EG', 'MA', 'DZ', 'ET', 'BF', 'ML', 'ZM', 'ZW', 'BW', 'MZ',
    'MW', 'AO', 'CD', 'CG', 'GA', 'GN', 'TD', 'SO', 'SD', 'SS',
    'LY', 'TN', 'MR', 'NE', 'BJ', 'TG', 'LR', 'SL', 'GM', 'GW',
    'CV', 'ST', 'GQ', 'DJ', 'ER', 'KM', 'SC', 'MU', 'RE', 'YT',
  ];

  if (country && !africanCountries.includes(country)) {
    logger.warn({ country }, 'Non-African region detected');
    
    // Add header for analytics
    c.header('X-Region-Warning', 'This service is optimized for African regions');
  }

  await next();
});

// Country-specific routing
export const countryRouter = createMiddleware(async (c: Context, next: Next) => {
  const country = c.get('country') as string;
  const account = c.get('account');

  if (country && account) {
    // Set preferred provider based on country
    const preferredProvider = getPreferredProvider(country);
    c.set('preferredProvider', preferredProvider);

    // Set pricing tier based on country
    const pricingTier = getPricingTier(country);
    c.set('pricingTier', pricingTier);

    logger.debug({
      country,
      preferredProvider,
      pricingTier,
    }, 'Country-specific routing applied');
  }

  await next();
});

// Get preferred SMS provider for country
function getPreferredProvider(country: string): string {
  const providerMap: Record<string, string> = {
    'GH': 'telecel', // Ghana
    'NG': 'mtn', // Nigeria
    'KE': 'safaricom', // Kenya
    'ZA': 'vodacom', // South Africa
    'UG': 'mtn', // Uganda
    'TZ': 'vodacom', // Tanzania
    'RW': 'mtn', // Rwanda
    'CI': 'orange', // Côte d'Ivoire
    'SN': 'orange', // Senegal
    'CM': 'orange', // Cameroon
  };

  return providerMap[country] || 'africastalking'; // Default fallback
}

// Get pricing tier for country
function getPricingTier(country: string): string {
  // Tier 1: Premium markets (higher rates)
  const tier1 = ['ZA', 'NG', 'KE'];
  
  // Tier 2: Standard markets
  const tier2 = ['GH', 'UG', 'TZ', 'RW', 'CI'];
  
  // Tier 3: Emerging markets (lower rates)
  const tier3 = ['BF', 'ML', 'NE', 'TD', 'SL'];

  if (tier1.includes(country)) return 'tier1';
  if (tier2.includes(country)) return 'tier2';
  if (tier3.includes(country)) return 'tier3';
  
  return 'standard';
}

// Network detection from phone number
export const detectNetwork = (phone: string): {
  country: string | null;
  network: string | null;
  operator: string | null;
} => {
  // Remove non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Ghana networks
  if (cleaned.startsWith('233')) {
    const prefix = cleaned.substring(3, 5);
    if (['20', '50', '23', '28'].includes(prefix)) {
      return { country: 'GH', network: 'telecel', operator: 'Telecel Ghana' };
    }
    if (['24', '54', '55', '53', '23','59'].includes(prefix)) {
      return { country: 'GH', network: 'mtn', operator: 'MTN Ghana' };
    }
    if (['26', '56', '27', '57'].includes(prefix)) {
      return { country: 'GH', network: 'airteltigo', operator: 'AirtelTigo' };
    }
  }

  // Nigeria networks
  if (cleaned.startsWith('234')) {
    const prefix = cleaned.substring(3, 6);
    if (['803', '806', '810', '813', '816', '903', '906'].includes(prefix)) {
      return { country: 'NG', network: 'mtn', operator: 'MTN Nigeria' };
    }
    if (['805', '807', '811', '815', '905'].includes(prefix)) {
      return { country: 'NG', network: 'glo', operator: 'Globacom' };
    }
    if (['802', '808', '812', '902', '907', '901'].includes(prefix)) {
      return { country: 'NG', network: 'airtel', operator: 'Airtel Nigeria' };
    }
    if (['809', '817', '818', '909'].includes(prefix)) {
      return { country: 'NG', network: '9mobile', operator: '9mobile' };
    }
  }

  // Kenya networks
  if (cleaned.startsWith('254')) {
    const prefix = cleaned.substring(3, 6);
    if (['701', '702', '703', '704', '705', '706', '707', '708', '709'].includes(prefix)) {
      return { country: 'KE', network: 'safaricom', operator: 'Safaricom' };
    }
    if (['710', '711', '712', '713', '714', '715'].includes(prefix)) {
      return { country: 'KE', network: 'airtel', operator: 'Airtel Kenya' };
    }
    if (['770', '771', '772', '773', '774', '775'].includes(prefix)) {
      return { country: 'KE', network: 'telkom', operator: 'Telkom Kenya' };
    }
  }

  // South Africa networks
  if (cleaned.startsWith('27')) {
    const prefix = cleaned.substring(2, 4);
    if (['82', '83', '84'].includes(prefix)) {
      return { country: 'ZA', network: 'vodacom', operator: 'Vodacom' };
    }
    if (['71', '72', '73', '74', '76', '78'].includes(prefix)) {
      return { country: 'ZA', network: 'mtn', operator: 'MTN South Africa' };
    }
    if (['81', '84'].includes(prefix)) {
      return { country: 'ZA', network: 'cellc', operator: 'Cell C' };
    }
  }

  return { country: null, network: null, operator: null };
};