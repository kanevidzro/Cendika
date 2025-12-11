import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';
import type { 
  ProviderInfo, 
  ProviderSelectionCriteria, 
  SMSPricing 
} from '../types/sms.types';
import { MessageType } from '../../../../generated/prisma/client';

export class SMSRouterService {
  // Select best provider based on criteria
  static async selectProvider(
    criteria: ProviderSelectionCriteria
  ): Promise<ProviderInfo | null> {
    try {
      // Get all active SMS providers
      const providers = await prisma.provider.findMany({
        where: {
          type: 'SMS',
          status: 'ACTIVE',
          supportedCountries: {
            has: criteria.country,
          },
        },
        orderBy: [
          { priority: 'desc' },
          { successRate: 'desc' },
        ],
      });

      if (providers.length === 0) {
        logger.warn({ criteria }, 'No SMS providers available for criteria');
        return null;
      }

      // Filter by network if specified
      let filteredProviders = providers;
      if (criteria.network) {
        filteredProviders = providers.filter(p => 
          p.supportedNetworks.includes(criteria.network!)
        );
        
        // Fall back to all providers if no network-specific provider found
        if (filteredProviders.length === 0) {
          filteredProviders = providers;
        }
      }

      // Apply priority criteria
      let selectedProvider = filteredProviders[0];

      switch (criteria.priority) {
        case 'cost':
          // Sort by cost (would need pricing data)
          selectedProvider = filteredProviders[0];
          break;
        
        case 'speed':
          // Sort by latency
          selectedProvider = filteredProviders.sort((a, b) => 
            (a.avgLatency || 1000) - (b.avgLatency || 1000)
          )[0];
          break;
        
        case 'reliability':
          // Sort by success rate
          selectedProvider = filteredProviders.sort((a, b) => 
            (b.successRate || 0) - (a.successRate || 0)
          )[0];
          break;
        
        default:
          // Use default priority
          selectedProvider = filteredProviders[0];
      }

      logger.info({
        provider: selectedProvider.name,
        criteria,
      }, 'Provider selected');

      return {
        id: selectedProvider.id,
        name: selectedProvider.name,
        type: selectedProvider.type,
        countries: selectedProvider.supportedCountries,
        networks: selectedProvider.supportedNetworks,
        priority: selectedProvider.priority,
        successRate: selectedProvider.successRate || undefined,
        avgLatency: selectedProvider.avgLatency || undefined,
        costPerUnit: 0.035, // TODO: Get from pricing table
      };

    } catch (error) {
      logger.error({ error, criteria }, 'Provider selection error');
      return null;
    }
  }

  // Get pricing for SMS
  static async getPricing(
    country: string,
    network?: string,
    messageType: MessageType = MessageType.SMS,
    units: number = 1
  ): Promise<SMSPricing> {
    try {
      // Get pricing from database
      const pricing = await prisma.pricingRate.findFirst({
        where: {
          country,
          network: network || null,
          messageType,
          serviceType: 'SMS',
          isActive: true,
          effectiveFrom: {
            lte: new Date(),
          },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      });

      if (!pricing) {
        logger.warn({ country, network }, 'No pricing found, using default');
        
        // Default fallback pricing
        return {
          country,
          network,
          ratePerUnit: 0.035,
          currency: 'GHS',
          units,
          totalCost: 0.035 * units,
        };
      }

      return {
        country,
        network: network || undefined,
        ratePerUnit: pricing.ratePerUnit,
        currency: pricing.currency,
        units,
        totalCost: pricing.ratePerUnit * units,
      };

    } catch (error) {
      logger.error({ error, country, network }, 'Pricing calculation error');
      
      // Return default pricing on error
      return {
        country,
        network,
        ratePerUnit: 0.035,
        currency: 'GHS',
        units,
        totalCost: 0.035 * units,
      };
    }
  }

  // Get country from phone number
  static getCountryFromPhone(phone: string): string {
    const countryCodeMap: Record<string, string> = {
      '233': 'GH', // Ghana
      '234': 'NG', // Nigeria
      '254': 'KE', // Kenya
      '27': 'ZA',  // South Africa
      '256': 'UG', // Uganda
      '255': 'TZ', // Tanzania
      '250': 'RW', // Rwanda
      '225': 'CI', // Côte d'Ivoire
      '221': 'SN', // Senegal
      '237': 'CM', // Cameroon
      '20': 'EG',  // Egypt
      '212': 'MA', // Morocco
      '213': 'DZ', // Algeria
      '251': 'ET', // Ethiopia
    };

    const cleaned = phone.replace(/\D/g, '');
    
    // Try to match country codes
    for (const [code, country] of Object.entries(countryCodeMap)) {
      if (cleaned.startsWith(code)) {
        return country;
      }
    }

    // Default to Ghana if not found
    logger.warn({ phone }, 'Could not determine country, defaulting to GH');
    return 'GH';
  }

  // Route message to best provider
  static async routeMessage(
    to: string,
    messageType: MessageType = MessageType.SMS,
    priority?: 'cost' | 'speed' | 'reliability'
  ): Promise<{
    provider: ProviderInfo | null;
    pricing: SMSPricing;
    country: string;
    network?: string;
  }> {
    // Detect country and network
    const country = this.getCountryFromPhone(to);
    const networkInfo = this.detectNetworkFromPhone(to);

    // Select provider
    const provider = await this.selectProvider({
      country,
      network: networkInfo?.network,
      messageType,
      priority,
    });

    // Get pricing
    const pricing = await this.getPricing(
      country,
      networkInfo?.network,
      messageType,
      1 // Default to 1 unit, will be calculated later
    );

    return {
      provider,
      pricing,
      country,
      network: networkInfo?.network,
    };
  }

  // Detect network from phone number
  private static detectNetworkFromPhone(phone: string): {
    network: string;
    operator: string;
  } | null {
    const cleaned = phone.replace(/\D/g, '');

    // Ghana networks
    if (cleaned.startsWith('233')) {
      const prefix = cleaned.substring(3, 5);
      if (['20', '50', '23', '28'].includes(prefix)) {
        return { network: 'vodafone', operator: 'Vodafone Ghana' };
      }
      if (['24', '54', '55', '59'].includes(prefix)) {
        return { network: 'mtn', operator: 'MTN Ghana' };
      }
      if (['26', '56', '27', '57'].includes(prefix)) {
        return { network: 'airteltigo', operator: 'AirtelTigo' };
      }
    }

    // Nigeria networks
    if (cleaned.startsWith('234')) {
      const prefix = cleaned.substring(3, 6);
      if (['803', '806', '810', '813', '816', '903', '906'].includes(prefix)) {
        return { network: 'mtn', operator: 'MTN Nigeria' };
      }
      if (['805', '807', '811', '815', '905'].includes(prefix)) {
        return { network: 'glo', operator: 'Globacom' };
      }
      if (['802', '808', '812', '902', '907', '901'].includes(prefix)) {
        return { network: 'airtel', operator: 'Airtel Nigeria' };
      }
    }

    // Kenya networks
    if (cleaned.startsWith('254')) {
      const prefix = cleaned.substring(3, 6);
      if (['701', '702', '703', '704', '705', '706', '707', '708', '709'].includes(prefix)) {
        return { network: 'safaricom', operator: 'Safaricom' };
      }
      if (['710', '711', '712', '713', '714', '715'].includes(prefix)) {
        return { network: 'airtel', operator: 'Airtel Kenya' };
      }
    }

    return null;
  }

  // Check provider health
  static async checkProviderHealth(providerId: string): Promise<boolean> {
    try {
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
      });

      if (!provider) return false;
      if (provider.status !== 'ACTIVE') return false;
      
      // Check if provider has had recent errors
      if (provider.errorCount > 10) {
        logger.warn({ providerId, errorCount: provider.errorCount }, 'Provider has high error count');
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error, providerId }, 'Provider health check error');
      return false;
    }
  }

  // Update provider statistics
  static async updateProviderStats(
    providerId: string,
    success: boolean,
    latency?: number
  ): Promise<void> {
    try {
      if (success) {
        await prisma.provider.update({
          where: { id: providerId },
          data: {
            lastCheckedAt: new Date(),
            errorCount: 0,
            // TODO: Update success rate and avg latency with proper calculation
          },
        });
      } else {
        await prisma.provider.update({
          where: { id: providerId },
          data: {
            lastErrorAt: new Date(),
            errorCount: { increment: 1 },
          },
        });
      }
    } catch (error) {
      logger.error({ error, providerId }, 'Failed to update provider stats');
    }
  }
}