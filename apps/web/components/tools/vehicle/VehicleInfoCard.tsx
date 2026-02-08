'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faCalendar,
  faGasPump,
  faPalette,
  faLeaf,
  faFileLines,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
} from '@fortawesome/pro-solid-svg-icons';
import type { VehicleDetails, MOTVehicle } from '@/lib/dvla';

type VehicleInfoCardProps = {
  vehicle?: VehicleDetails | null;
  motData?: MOTVehicle | null;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: typeof faCar;
  label: string;
  value: string | number | undefined;
}) => (
  <div className="flex items-center gap-3 rounded-lg bg-light p-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
      <FontAwesomeIcon icon={icon} className="text-dark" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray">{label}</p>
      <p className="truncate font-semibold text-dark">{value || 'N/A'}</p>
    </div>
  </div>
);

const StatusBadge = ({
  status,
  type,
  expiryDate,
}: {
  status: string;
  type: 'tax' | 'mot';
  expiryDate?: string;
}) => {
  const isValid =
    type === 'tax'
      ? status === 'Taxed'
      : status === 'Valid';

  const isSorn = status === 'SORN';

  return (
    <div
      className={`rounded-xl p-4 ${
        isValid
          ? 'bg-success/10'
          : isSorn
            ? 'bg-amber/10'
            : 'bg-coral/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <FontAwesomeIcon
          icon={
            isValid
              ? faCircleCheck
              : isSorn
                ? faTriangleExclamation
                : faCircleXmark
          }
          className={`text-xl ${
            isValid ? 'text-success' : isSorn ? 'text-amber' : 'text-coral'
          }`}
        />
        <div>
          <p className="text-xs uppercase text-gray">
            {type === 'tax' ? 'Vehicle Tax' : 'MOT Status'}
          </p>
          <p
            className={`font-bold ${
              isValid ? 'text-success' : isSorn ? 'text-amber' : 'text-coral'
            }`}
          >
            {status}
          </p>
        </div>
      </div>
      {expiryDate && (
        <p className="mt-2 text-sm text-gray">
          {isValid ? 'Expires' : 'Expired'}: {formatDate(expiryDate)}
        </p>
      )}
    </div>
  );
};

const VehicleInfoCard = ({ vehicle, motData }: VehicleInfoCardProps) => {
  if (!vehicle && !motData) {
    return null;
  }

  const make = vehicle?.make || motData?.make || 'Unknown';
  const model = motData?.model || '';
  const colour = vehicle?.colour || motData?.primaryColour || 'Unknown';
  const fuelType = vehicle?.fuelType || motData?.fuelType || 'Unknown';
  const yearOfManufacture = vehicle?.yearOfManufacture;
  const engineCapacity = vehicle?.engineCapacity;
  const co2Emissions = vehicle?.co2Emissions;
  const registration =
    vehicle?.registrationNumber || motData?.registration || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]"
    >
      {/* Header with registration */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex overflow-hidden rounded-lg border-2 border-dark">
          <div className="flex items-center bg-[#003399] px-2 py-1">
            <span className="text-[10px] font-bold text-white">GB</span>
          </div>
          <div className="bg-yellow px-3 py-1">
            <span className="font-plate text-lg font-bold tracking-wider text-dark">
              {registration}
            </span>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-dark">
            {make} {model}
          </h2>
          {yearOfManufacture && (
            <p className="text-sm text-gray">{yearOfManufacture}</p>
          )}
        </div>
      </div>

      {/* Status badges */}
      {vehicle && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <StatusBadge
            status={vehicle.taxStatus}
            type="tax"
            expiryDate={vehicle.taxDueDate}
          />
          <StatusBadge
            status={vehicle.motStatus}
            type="mot"
            expiryDate={vehicle.motExpiryDate}
          />
        </div>
      )}

      {/* Vehicle details grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoRow icon={faPalette} label="Colour" value={colour} />
        <InfoRow icon={faGasPump} label="Fuel Type" value={fuelType} />
        {engineCapacity && (
          <InfoRow
            icon={faCar}
            label="Engine Size"
            value={`${engineCapacity}cc`}
          />
        )}
        {co2Emissions && (
          <InfoRow
            icon={faLeaf}
            label="CO2 Emissions"
            value={`${co2Emissions} g/km`}
          />
        )}
        {vehicle?.dateOfLastV5CIssued && (
          <InfoRow
            icon={faFileLines}
            label="Last V5C Issued"
            value={formatDate(vehicle.dateOfLastV5CIssued)}
          />
        )}
        {vehicle?.monthOfFirstRegistration && (
          <InfoRow
            icon={faCalendar}
            label="First Registered"
            value={vehicle.monthOfFirstRegistration}
          />
        )}
      </div>

      {/* Export warning */}
      {vehicle?.markedForExport && (
        <div className="mt-4 rounded-lg bg-coral/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-coral">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            This vehicle is marked for export
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default VehicleInfoCard;
