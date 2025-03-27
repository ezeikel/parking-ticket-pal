import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faMap } from '@fortawesome/pro-regular-svg-icons';

type ViewType = 'list' | 'map';

type ViewToggleProps = {
  activeView: ViewType;
  onChange: (view: ViewType) => void;
};

const ViewToggle = ({ activeView, onChange }: ViewToggleProps) => {
  return (
    <div className="inline-flex rounded-md shadow-sm">
      <Button
        variant={activeView === 'list' ? 'default' : 'outline'}
        className={`rounded-r-none ${activeView === 'list' ? '' : 'hover:bg-muted'}`}
        onClick={() => onChange('list')}
      >
        <FontAwesomeIcon icon={faList} className="mr-2 h-4 w-4" />
        List
      </Button>
      <Button
        variant={activeView === 'map' ? 'default' : 'outline'}
        className={`rounded-l-none ${activeView === 'map' ? '' : 'hover:bg-muted'}`}
        onClick={() => onChange('map')}
      >
        <FontAwesomeIcon icon={faMap} className="mr-2 h-4 w-4" />
        Map
      </Button>
    </div>
  );
};

export default ViewToggle;
