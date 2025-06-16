'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateTicketForm from '@/components/forms/CreateTicketForm/CreateTicketForm';
import CreateLetterForm from '@/components/forms/CreateLetterForm/CreateLetterForm';

const UploadPage = () => {
  const [activeTab, setActiveTab] = useState<'ticket' | 'letter'>('ticket');

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="font-slab font-medium text-2xl">
              Add {activeTab === 'ticket' ? 'Parking Ticket' : 'Letter'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'ticket'
                ? 'Enter the details of your parking ticket or upload an image to pre-fill the form.'
                : 'Enter the details of your letter or upload an image to pre-fill the form.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="ticket"
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as 'ticket' | 'letter')
              }
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ticket">Parking Ticket</TabsTrigger>
                <TabsTrigger value="letter">Letter</TabsTrigger>
              </TabsList>

              {activeTab === 'ticket' ? (
                <CreateTicketForm />
              ) : (
                <CreateLetterForm />
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadPage;
