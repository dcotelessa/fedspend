import { Injectable } from '@nestjs/common';
import { RawFemaPAGrantAwardActivity, RawFemaDisasterDeclarationSummary } from './openfema.types';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

const API_BASE = 'https://www.fema.gov/api/open/v2';

interface RawDeclaration {
  incidentType: string;
  state: string;
  stateName?: string;
  declarationDate: string;
  obligatedAmount?: number;
  fyDeclared?: number;
}

interface StateAggregationResult {
  stateCode: string;
  stateName: string;
  fiscalYear: number;
  femaObligatedCents: number;
  declarationCount: number;
  dominantIncidentType: string;
}

const fetchWithRetry = async (url: string): Promise<unknown> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const body = await response.json();
      return body;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

const fetchAllPages = async (baseUrl: string): Promise<RawFemaPAGrantAwardActivity[]> => {
  const firstBody = (await fetchWithRetry(baseUrl)) as {
    PublicAssistanceGrantAwardActivities: RawFemaPAGrantAwardActivity[];
    metadata: { count: number; top: number };
  };

  const allRows = [...(firstBody.PublicAssistanceGrantAwardActivities || [])];
  const totalCount = firstBody.metadata?.count ?? allRows.length;
  const pageSize = firstBody.metadata?.top ?? 100;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      const skip = (page - 1) * pageSize;
      const sep = baseUrl.includes('?') ? '&' : '?';
      const pageBody = (await fetchWithRetry(`${baseUrl}${sep}$skip=${skip}`)) as {
        PublicAssistanceGrantAwardActivities: RawFemaPAGrantAwardActivity[];
      };
      allRows.push(...(pageBody.PublicAssistanceGrantAwardActivities || []));
    }
  }

  return allRows;
};

const getFiscalYear = (dateStr: string): number => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 10 ? year + 1 : year;
};

const computeDominantIncidentType = (
  incidentTypes: string[],
): string => {
  const counts = new Map<string, number>();

  for (const type of incidentTypes) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  let maxCount = 0;
  let dominantType = '';

  const sortedKeys = Array.from(counts.keys()).sort();
  for (const type of sortedKeys) {
    const count = counts.get(type)!;
    if (count > maxCount) {
      maxCount = count;
      dominantType = type;
    }
  }

  return dominantType;
};

const aggregatePAGrantAwards = (
  activities: RawFemaPAGrantAwardActivity[],
): StateAggregationResult[] => {
  const groups = new Map<
    string,
    {
      stateCode: string;
      stateName: string;
      fiscalYear: number;
      totalCents: number;
      count: number;
      incidentTypes: string[];
    }
  >();

  for (const activity of activities) {
    const fiscalYear = getFiscalYear(activity.declarationDate);
    const key = `${activity.stateAbbreviation}_${fiscalYear}`;
    const existing = groups.get(key);

    if (existing) {
      existing.totalCents += Math.round((activity.federalShareObligated ?? 0) * 100);
      existing.count += 1;
      existing.incidentTypes.push(activity.incidentType);
    } else {
      groups.set(key, {
        stateCode: activity.stateAbbreviation,
        stateName: activity.state,
        fiscalYear,
        totalCents: Math.round((activity.federalShareObligated ?? 0) * 100),
        count: 1,
        incidentTypes: [activity.incidentType],
      });
    }
  }

  const results: StateAggregationResult[] = [];

  for (const group of groups.values()) {
    results.push({
      stateCode: group.stateCode,
      stateName: group.stateName,
      fiscalYear: group.fiscalYear,
      femaObligatedCents: group.totalCents,
      declarationCount: group.count,
      dominantIncidentType: computeDominantIncidentType(group.incidentTypes),
    });
  }

  return results;
};

@Injectable()
export class OpenFemaService {
  async fetchDeclarationsByState(): Promise<StateAggregationResult[]> {
    const baseUrl = `${API_BASE}/PublicAssistanceGrantAwardActivities?limit=100`;
    const activities = await fetchAllPages(baseUrl);

    return aggregatePAGrantAwards(activities);
  }
}
