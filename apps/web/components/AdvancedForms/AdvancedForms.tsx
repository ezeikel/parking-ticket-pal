'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilePdf,
  faSignature,
  faSpinnerThird,
  faInfoCircle,
} from '@fortawesome/pro-regular-svg-icons';
import { FormType, TicketTier } from '@parking-ticket-pal/db/types';
import { toast } from 'sonner';
import {
  generatePE2Form,
  generatePE3Form,
  generateTE7Form,
  generateTE9Form,
  getFormFillDataFromTicket,
} from '@/app/actions/form';
import { TicketWithRelations } from '@/types';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type AdvancedFormsProps = {
  ticket: TicketWithRelations;
  hasSignature: boolean;
};

const formOptions: {
  value: FormType;
  label: string;
  requiresSignature: boolean;
}[] = [
  {
    value: FormType.PE2,
    label: 'PE2: Application to file a statement out of time',
    requiresSignature: false,
  },
  {
    value: FormType.PE3,
    label: 'PE3: Statutory Declaration - Unpaid penalty charge',
    requiresSignature: false,
  },
  {
    value: FormType.TE7,
    label: 'TE7: Application to file a statement out of time',
    requiresSignature: true,
  },
  {
    value: FormType.TE9,
    label: 'TE9: Witness Statement - Unpaid penalty charge',
    requiresSignature: true,
  },
];

// This component will render the specific fields for the TE9 form
const TE9Fields = ({ onDataChange }: { onDataChange: (data: any) => void }) => {
  const [grounds, setGrounds] = useState({
    didNotReceiveNotice: false,
    madeRepresentations: false,
    hadNoResponse: false,
    appealNotDetermined: false,
    appealInFavour: false,
    paidInFull: false,
  });

  const handleGroundChange = (key: keyof typeof grounds, checked: boolean) => {
    const newGrounds = { ...grounds, [key]: checked };
    setGrounds(newGrounds);
    onDataChange(newGrounds);
  };

  return (
    <div className="space-y-4">
      <Label className="font-medium">
        Grounds for statement (Tick all that apply)
      </Label>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="te9-did-not-receive-notice"
          checked={grounds.didNotReceiveNotice}
          onCheckedChange={(checked) =>
            handleGroundChange('didNotReceiveNotice', checked as boolean)
          }
        />
        <Label htmlFor="te9-did-not-receive-notice">
          I did not receive the penalty charge notice.
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="te9-made-representations"
          checked={grounds.madeRepresentations}
          onCheckedChange={(checked) =>
            handleGroundChange('madeRepresentations', checked as boolean)
          }
        />
        <Label htmlFor="te9-made-representations">
          I made representations... but did not receive a rejection notice.
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="te9-had-no-response"
          checked={grounds.hadNoResponse}
          onCheckedChange={(checked) =>
            handleGroundChange('hadNoResponse', checked as boolean)
          }
        />
        <Label htmlFor="te9-had-no-response">
          I appealed to an adjudicator... but had no response.
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="te9-appeal-not-determined"
          checked={grounds.appealNotDetermined}
          onCheckedChange={(checked) =>
            handleGroundChange('appealNotDetermined', checked as boolean)
          }
        />
        <Label htmlFor="te9-appeal-not-determined">
          My appeal had not been determined.
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="te9-appeal-in-favour"
          checked={grounds.appealInFavour}
          onCheckedChange={(checked) =>
            handleGroundChange('appealInFavour', checked as boolean)
          }
        />
        <Label htmlFor="te9-appeal-in-favour">
          My appeal was determined in my favour.
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="te9-paid-in-full"
          checked={grounds.paidInFull}
          onCheckedChange={(checked) =>
            handleGroundChange('paidInFull', checked as boolean)
          }
        />
        <Label htmlFor="te9-paid-in-full">
          The penalty charge has been paid in full.
        </Label>
      </div>
    </div>
  );
};

// This component will render the specific fields for the PE3 form
const PE3Fields = ({ onDataChange }: { onDataChange: (data: any) => void }) => {
  const [grounds, setGrounds] = useState({
    didNotReceiveNotice: false,
    madeRepresentations: false,
    appealedToAdjudicator: false,
  });
  const [reason, setReason] = useState('');

  const handleGroundChange = (key: keyof typeof grounds, checked: boolean) => {
    const newGrounds = { ...grounds, [key]: checked };
    setGrounds(newGrounds);
    onDataChange({ ...newGrounds, reasonText: reason });
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    onDataChange({ ...grounds, reasonText: value });
  };

  return (
    <div className="space-y-4">
      <Label className="font-medium">
        Grounds for statement (Tick all that apply)
      </Label>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="pe3-did-not-receive-notice"
          checked={grounds.didNotReceiveNotice}
          onCheckedChange={(checked) =>
            handleGroundChange('didNotReceiveNotice', checked as boolean)
          }
        />
        <Label htmlFor="pe3-did-not-receive-notice">
          I did not receive the notice.
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="pe3-made-representations"
          checked={grounds.madeRepresentations}
          onCheckedChange={(checked) =>
            handleGroundChange('madeRepresentations', checked as boolean)
          }
        />
        <Label htmlFor="pe3-made-representations">
          I made representations.
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="pe3-appealed-to-adjudicator"
          checked={grounds.appealedToAdjudicator}
          onCheckedChange={(checked) =>
            handleGroundChange('appealedToAdjudicator', checked as boolean)
          }
        />
        <Label htmlFor="pe3-appealed-to-adjudicator">
          I appealed to the Parking/Traffic Adjudicator.
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pe3-reason" className="font-medium">
          Supporting explanation
        </Label>
        <Alert>
          <FontAwesomeIcon icon={faInfoCircle} size="lg" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Provide a detailed explanation of your circumstances that supports
            the grounds you have selected above. This is your chance to convince
            the court that your declaration is genuine and justified.
          </AlertDescription>
        </Alert>
        <Textarea
          id="pe3-reason"
          placeholder="Explain your circumstances in detail..."
          rows={5}
          value={reason}
          onChange={(e) => handleReasonChange(e.target.value)}
        />
      </div>
    </div>
  );
};

// This component will render the specific fields for the TE7 form
const TE7Fields = ({ onDataChange }: { onDataChange: (data: any) => void }) => {
  const [reason, setReason] = useState('');

  const handleReasonChange = (value: string) => {
    setReason(value);
    onDataChange({ reasonText: value });
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="te7-reason" className="font-medium">
        Reason(s) for filing out of time
      </Label>
      <Alert>
        <FontAwesomeIcon icon={faInfoCircle} size="lg" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Do NOT give your reasons for appealing the original penalty charge
          here. Only explain why your statement is late.
        </AlertDescription>
      </Alert>
      <Textarea
        id="te7-reason"
        placeholder="Explain why you are filing this application late..."
        rows={5}
        value={reason}
        onChange={(e) => handleReasonChange(e.target.value)}
      />
    </div>
  );
};

const AdvancedForms = ({ ticket, hasSignature }: AdvancedFormsProps) => {
  const [selectedForm, setSelectedForm] = useState<FormType | ''>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({});
  const { track } = useAnalytics();

  const isPremiumTier = ticket.tier === TicketTier.PREMIUM;
  const currentFormInfo = formOptions.find((f) => f.value === selectedForm);

  const handleGenerate = async () => {
    if (!currentFormInfo) {
      toast.error('Please select a form to generate.');
      return;
    }

    if (currentFormInfo.requiresSignature && !hasSignature) {
      toast.error(
        'A signature is required for this form. Please upload one in your profile.',
      );
      return;
    }

    await track(TRACKING_EVENTS.FORM_GENERATED, {
      ticketId: ticket.id,
      formType: selectedForm as FormType,
    });

    setIsGenerating(true);
    toast.info(`Generating ${currentFormInfo.label}...`);

    try {
      const baseFormData = await getFormFillDataFromTicket(ticket.pcnNumber);

      if (!baseFormData) {
        toast.error('Could not find ticket data. Please try again.');
        return;
      }

      // merge the collected form data with the base data
      const finalFormData = {
        ...baseFormData,
        ...formData,
      };

      // call the appropriate generation function
      let result;
      switch (selectedForm) {
        case FormType.PE2:
          result = await generatePE2Form(finalFormData);
          break;
        case FormType.PE3:
          result = await generatePE3Form(finalFormData);
          break;
        case FormType.TE7:
          result = await generateTE7Form(finalFormData);
          break;
        case FormType.TE9:
          result = await generateTE9Form(finalFormData);
          break;
        default:
          toast.error('Invalid form type selected.');
          return;
      }

      if (result.success) {
        toast.success(
          `${currentFormInfo.label} has been generated and sent to your email.`,
        );
      } else {
        toast.error(
          result.error || 'Failed to generate form. Please try again.',
        );
      }
    } catch (error) {
      console.error('Error generating form:', error);
      toast.error('Failed to generate form. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFormFields = () => {
    if (!selectedForm) return null;

    let FormComponent = null;
    switch (selectedForm) {
      case FormType.TE9:
        FormComponent = <TE9Fields onDataChange={setFormData} />;
        break;
      case FormType.PE3:
        FormComponent = <PE3Fields onDataChange={setFormData} />;
        break;
      case FormType.TE7:
        FormComponent = <TE7Fields onDataChange={setFormData} />;
        break;
      case FormType.PE2: // assuming PE2 has similar fields to TE7 for this example
        FormComponent = <TE7Fields onDataChange={setFormData} />;
        break;
      default:
        return null;
    }

    return (
      <div className="mt-6 space-y-4 rounded-md border bg-background p-4">
        <h4 className="font-semibold">
          Required Information for {selectedForm}
        </h4>
        {FormComponent}
      </div>
    );
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Advanced Forms</CardTitle>
        <CardDescription>
          Generate statutory declarations (PE2, PE3) or witness statements (TE7,
          TE9) for later-stage appeals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="form-type">Select Form Type</Label>
          <Select
            value={selectedForm}
            onValueChange={(value) => setSelectedForm(value as FormType)}
          >
            <SelectTrigger id="form-type">
              <SelectValue placeholder="Choose a form to generate..." />
            </SelectTrigger>
            <SelectContent>
              {formOptions.map((form) => (
                <SelectItem key={form.value} value={form.value}>
                  {form.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {renderFormFields()}

        {currentFormInfo?.requiresSignature && (
          <div
            className={`mt-4 flex items-center gap-2 text-sm ${hasSignature ? 'text-green-600' : 'text-amber-600'}`}
          >
            <FontAwesomeIcon icon={faSignature} size="lg" />
            <span>
              {hasSignature
                ? 'Your signature on file will be applied to this form.'
                : 'A signature is required for this form.'}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t bg-muted/50 px-6 py-4">
        {isPremiumTier ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
            className="w-full"
          >
            <div className="flex w-full justify-end">
              <Button type="submit" disabled={!selectedForm || isGenerating}>
                <FontAwesomeIcon
                  icon={isGenerating ? faSpinnerThird : faFilePdf}
                  size="lg"
                  className={`mr-2 ${isGenerating ? 'animate-spin' : ''}`}
                />
                Generate Form
              </Button>
            </div>
          </form>
        ) : (
          <div className="w-full text-center">
            <p className="mb-2 font-semibold">
              Upgrade to PREMIUM to generate advanced forms.
            </p>
            <Button>Upgrade Now</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default AdvancedForms;
