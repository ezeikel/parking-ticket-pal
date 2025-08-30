'use client';

import { useState, useEffect, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateTicketNotes } from '@/app/actions/ticket';
import { toast } from 'sonner';

type TicketNotesProps = {
  ticketId: string;
  initialNotes: string;
};

const TicketNotes = ({ ticketId, initialNotes }: TicketNotesProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [state, formAction, isPending] = useActionState(
    updateTicketNotes,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success('Notes saved successfully.');
      setIsEditing(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-2 border-t pt-6">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
        {!isEditing && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit Notes
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add any relevant notes for this ticket..."
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-base text-foreground whitespace-pre-wrap min-h-[40px]">
          {notes || (
            <span className="text-muted-foreground">No notes added yet.</span>
          )}
        </p>
      )}
    </form>
  );
};

export default TicketNotes;
