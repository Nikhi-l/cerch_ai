import { tool } from 'ai';
import { z } from 'zod';
import { fetchWithTimeout } from '@/lib/network';

export const getWeather = tool({
  description: 'Get the current weather at a location',
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  execute: async ({ latitude, longitude }) => {
    try {
      const response = await fetchWithTimeout(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
        { timeoutMs: 60000 },
      );
      const weatherData = await response.json();
      return weatherData;
    } catch (error: any) {
      return { error: `Weather service unavailable: ${error?.message || 'network error'}` } as const;
    }
  },
});
