/**
 * DVLA API wrapper for MOT History and Vehicle Enquiry Service
 *
 * MOT History API: https://history.mot.api.gov.uk (OAuth2 + API Key)
 * Vehicle Enquiry Service: https://driver-vehicle-licensing.api.gov.uk
 */

const DVLA_MOT_API_BASE = 'https://history.mot.api.gov.uk';

// OAuth2 token cache for MOT History API
let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Get an OAuth2 access token for the MOT History API.
 * Caches the token in-memory and refreshes 5 minutes before expiry.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const tokenUrl = process.env.DVSA_MOT_TOKEN_URL;
  const clientId = process.env.DVSA_MOT_CLIENT_ID;
  const clientSecret = process.env.DVSA_MOT_CLIENT_SECRET;

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error('MOT OAuth2 credentials not configured');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://tapi.dvsa.gov.uk/.default',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain access token: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Cache with 5-minute buffer before actual expiry
  tokenExpiry = now + (data.expires_in - 300) * 1000;

  return cachedToken!;
}

/** Clear the cached token (used on auth errors to force refresh) */
function clearTokenCache() {
  cachedToken = null;
  tokenExpiry = 0;
}

// Types for MOT History API
export type MOTDefect = {
  text: string;
  type:
    | 'ADVISORY'
    | 'MINOR'
    | 'MAJOR'
    | 'DANGEROUS'
    | 'PRS'
    | 'FAIL'
    | 'NON SPECIFIC'
    | 'SYSTEM GENERATED'
    | 'USER ENTERED';
  dangerous?: boolean;
};

export type MOTTest = {
  completedDate: string;
  testResult: 'PASSED' | 'FAILED';
  expiryDate?: string;
  odometerValue: string;
  odometerUnit: string;
  odometerResultType: string;
  motTestNumber: string;
  dataSource?: string;
  registrationAtTimeOfTest?: string;
  defects?: MOTDefect[];
  rfrAndComments?: MOTDefect[];
};

export type MOTVehicle = {
  registration: string;
  make: string;
  model: string;
  firstUsedDate?: string;
  fuelType?: string;
  primaryColour?: string;
  vehicleId?: string;
  registrationDate?: string;
  manufactureDate?: string;
  engineSize?: string;
  hasOutstandingRecall?: string;
  motTests?: MOTTest[];
  motTestExpiryDate?: string;
};

// Types for Vehicle Enquiry Service
export type VehicleDetails = {
  registrationNumber: string;
  taxStatus: 'Taxed' | 'SORN' | 'Not Taxed' | string;
  taxDueDate?: string;
  motStatus: 'Valid' | 'No details held by DVLA' | 'Not valid' | string;
  motExpiryDate?: string;
  make: string;
  yearOfManufacture: number;
  engineCapacity?: number;
  co2Emissions?: number;
  fuelType: string;
  markedForExport: boolean;
  colour: string;
  typeApproval?: string;
  dateOfLastV5CIssued?: string;
  wheelplan?: string;
  monthOfFirstRegistration?: string;
  euroStatus?: string;
  revenueWeight?: number;
};

export type MOTHistoryResponse = {
  success: boolean;
  data?: MOTVehicle;
  error?: string;
};

export type VehicleDetailsResponse = {
  success: boolean;
  data?: VehicleDetails;
  error?: string;
};

/**
 * Normalize a UK registration plate to a consistent format
 * Removes spaces and converts to uppercase
 */
export function normalizeRegistration(registration: string): string {
  return registration.replace(/\s+/g, '').toUpperCase();
}

/**
 * Validate a UK registration plate format
 * Basic validation for common UK formats
 */
export function isValidRegistration(registration: string): boolean {
  const normalized = normalizeRegistration(registration);

  // Current format: AB12 CDE
  const currentFormat = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/;
  // Prefix format (2001-): AB12 CDE
  const prefixFormat = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/;
  // Suffix format (1963-2001): ABC 123D
  const suffixFormat = /^[A-Z]{1,3}[0-9]{1,4}[A-Z]$/;
  // Dateless formats
  const datelessFormat1 = /^[A-Z]{1,3}[0-9]{1,4}$/;
  const datelessFormat2 = /^[0-9]{1,4}[A-Z]{1,3}$/;
  // Northern Ireland format
  const niFormat = /^[A-Z]{1,3}[0-9]{1,4}$/;

  return (
    currentFormat.test(normalized) ||
    prefixFormat.test(normalized) ||
    suffixFormat.test(normalized) ||
    datelessFormat1.test(normalized) ||
    datelessFormat2.test(normalized) ||
    niFormat.test(normalized) ||
    normalized.length >= 2 // Fallback for edge cases
  );
}

/**
 * Get MOT history for a vehicle
 * Uses the DVSA MOT History API (OAuth2 + API Key)
 */
export async function getMOTHistory(
  registration: string,
  _retry = false,
): Promise<MOTHistoryResponse> {
  const apiKey = process.env.DVSA_MOT_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'MOT API key not configured',
    };
  }

  const normalized = normalizeRegistration(registration);

  if (!isValidRegistration(normalized)) {
    return {
      success: false,
      error: 'Invalid registration format',
    };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `${DVLA_MOT_API_BASE}/v1/trade/vehicles/registration/${normalized}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-API-Key': apiKey,
        },
        next: {
          revalidate: 86400, // Cache for 24 hours
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorCode = errorData?.errorCode || errorData?.errorMessage || '';

      // Auth error — clear token cache and retry once
      if ((response.status === 401 || errorCode === 'MOTH-FB-02') && !_retry) {
        clearTokenCache();
        return await getMOTHistory(registration, true);
      }

      if (errorCode === 'MOTH-NF-01' || response.status === 404) {
        return {
          success: false,
          error: 'Vehicle not found. Please check the registration number.',
        };
      }

      if (errorCode === 'MOTH-IV-03' || response.status === 400) {
        return {
          success: false,
          error: 'Invalid registration number format.',
        };
      }

      if (errorCode === 'MOTH-RL-01' || errorCode === 'MOTH-RL-02') {
        return {
          success: false,
          error: 'Too many requests. Please try again later.',
        };
      }

      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    // Map the new API response to our MOTVehicle type
    const vehicle: MOTVehicle = {
      registration: data.registration,
      make: data.make,
      model: data.model,
      firstUsedDate: data.firstUsedDate,
      fuelType: data.fuelType,
      primaryColour: data.primaryColour,
      registrationDate: data.registrationDate,
      manufactureDate: data.manufactureDate,
      engineSize: data.engineSize,
      hasOutstandingRecall: data.hasOutstandingRecall,
      motTests: (data.motTests || []).map((test: Record<string, unknown>) => ({
        completedDate: test.completedDate,
        testResult: test.testResult,
        expiryDate: test.expiryDate,
        odometerValue: test.odometerValue,
        // Normalize to lowercase for formatMileage compatibility
        odometerUnit:
          typeof test.odometerUnit === 'string'
            ? test.odometerUnit.toLowerCase()
            : test.odometerUnit,
        odometerResultType: test.odometerResultType,
        motTestNumber: test.motTestNumber,
        dataSource: test.dataSource,
        registrationAtTimeOfTest: test.registrationAtTimeOfTest,
        defects: test.defects,
      })),
    };

    return {
      success: true,
      data: vehicle,
    };
  } catch (error) {
    console.error('MOT History API error:', error);
    return {
      success: false,
      error: 'Failed to fetch MOT history. Please try again later.',
    };
  }
}

/**
 * Get vehicle details from DVLA Vehicle Enquiry Service
 */
export async function getVehicleDetails(
  registration: string,
): Promise<VehicleDetailsResponse> {
  const apiKey = process.env.DVLA_API_KEY;
  const apiUrl = process.env.DVLA_VEHICLE_ENQUIRY_API_URL;

  if (!apiKey) {
    return {
      success: false,
      error: 'Vehicle API key not configured',
    };
  }

  if (!apiUrl) {
    return {
      success: false,
      error: 'Vehicle API URL not configured',
    };
  }

  const normalized = normalizeRegistration(registration);

  if (!isValidRegistration(normalized)) {
    return {
      success: false,
      error: 'Invalid registration format',
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        registrationNumber: normalized,
      }),
      next: {
        revalidate: 86400, // Cache for 24 hours
      },
    });

    if (response.status === 404) {
      return {
        success: false,
        error: 'Vehicle not found. Please check the registration number.',
      };
    }

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || 'Invalid registration number format.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: data as VehicleDetails,
    };
  } catch (error) {
    console.error('Vehicle Enquiry API error:', error);
    return {
      success: false,
      error: 'Failed to fetch vehicle details. Please try again later.',
    };
  }
}

/**
 * Get both MOT history and vehicle details in parallel
 */
export async function getFullVehicleInfo(registration: string): Promise<{
  mot: MOTHistoryResponse;
  vehicle: VehicleDetailsResponse;
}> {
  const [mot, vehicle] = await Promise.all([
    getMOTHistory(registration),
    getVehicleDetails(registration),
  ]);

  return { mot, vehicle };
}
