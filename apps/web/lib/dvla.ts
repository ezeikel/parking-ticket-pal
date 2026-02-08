/**
 * DVLA API wrapper for MOT History and Vehicle Enquiry Service
 *
 * MOT History API: https://beta.check-mot.service.gov.uk
 * Vehicle Enquiry Service: https://driver-vehicle-licensing.api.gov.uk
 */

const DVLA_MOT_API_BASE = 'https://beta.check-mot.service.gov.uk';

// Types for MOT History API
export type MOTDefect = {
  text: string;
  type: 'ADVISORY' | 'MINOR' | 'MAJOR' | 'DANGEROUS' | 'PRS' | 'FAIL';
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
 * Uses the DVLA MOT History API
 */
export async function getMOTHistory(
  registration: string,
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
    const response = await fetch(
      `${DVLA_MOT_API_BASE}/trade/vehicles/mot-tests?registration=${normalized}`,
      {
        headers: {
          Accept: 'application/json+v6',
          'x-api-key': apiKey,
        },
        next: {
          revalidate: 86400, // Cache for 24 hours
        },
      },
    );

    if (response.status === 404) {
      return {
        success: false,
        error: 'Vehicle not found. Please check the registration number.',
      };
    }

    if (response.status === 400) {
      return {
        success: false,
        error: 'Invalid registration number format.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    // API returns an array of vehicles (usually just one)
    if (Array.isArray(data) && data.length > 0) {
      return {
        success: true,
        data: data[0] as MOTVehicle,
      };
    }

    return {
      success: false,
      error: 'No MOT data found for this vehicle.',
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
