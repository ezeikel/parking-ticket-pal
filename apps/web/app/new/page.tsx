'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';

export const maxDuration = 60;

const UploadContent = () => {
  const searchParams = useSearchParams();
  const tier = searchParams.get('tier') as 'standard' | 'premium' | null;
  const source = searchParams.get('source');
  const [activeTab, setActiveTab] = useState<'ticket' | 'letter'>('ticket');

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-slab font-medium text-2xl">
                Add {activeTab === 'ticket' ? 'Parking Ticket' : 'Letter'}
              </CardTitle>
              {tier && activeTab === 'ticket' && (
                <Badge variant="default" className="ml-2">
                  {tier === 'standard' ? 'Standard' : 'Premium'} Selected
                </Badge>
              )}
            </div>
            <CardDescription>
              {(() => {
                if (activeTab === 'letter') {
                  return 'Enter the details of your letter or upload an image to pre-fill the form.';
                }
                if (tier) {
                  const tierName = tier === 'standard' ? 'Standard' : 'Premium';
                  const price = tier === 'standard' ? '2.99' : '9.99';
                  return `Add your ticket details to continue with ${tierName} (£${price}).`;
                }
                return 'Enter the details of your parking ticket or upload an image to pre-fill the form.';
              })()}
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
                <CreateTicketForm tier={tier} source={source} />
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

const UploadPage = () => (
  <Suspense
    fallback={
      <div className="container mx-auto py-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-slab font-medium text-2xl">
                Loading...
              </CardTitle>
              <CardDescription>Please wait</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-8">
                <div className="animate-pulse">Loading form...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }
  >
    <UploadContent />
  </Suspense>
);

export default UploadPage;
