import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/pro-solid-svg-icons';
import type { FeatureComparison } from '@/data/competitors/types';

type ComparisonTableProps = {
  features: FeatureComparison[];
  competitorName: string;
};

const CellValue = ({ value }: { value: boolean | string }) => {
  if (typeof value === 'string') {
    return <span className="text-sm text-gray">{value}</span>;
  }
  if (value) {
    return <FontAwesomeIcon icon={faCheck} className="text-teal" />;
  }
  return <FontAwesomeIcon icon={faXmark} className="text-gray/40" />;
};

const ComparisonTable = ({
  features,
  competitorName,
}: ComparisonTableProps) => (
  <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border bg-light">
          <th className="px-4 py-3 font-semibold text-dark">Feature</th>
          <th className="px-4 py-3 text-center font-semibold text-teal">
            Parking Ticket Pal
          </th>
          <th className="px-4 py-3 text-center font-semibold text-gray">
            {competitorName}
          </th>
        </tr>
      </thead>
      <tbody>
        {features.map((row, index) => (
          <tr
            key={row.feature}
            className={index % 2 === 0 ? 'bg-white' : 'bg-light/50'}
          >
            <td className="px-4 py-3 text-dark">{row.feature}</td>
            <td className="px-4 py-3 text-center">
              <CellValue value={row.ptp} />
            </td>
            <td className="px-4 py-3 text-center">
              <CellValue value={row.competitor} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ComparisonTable;
