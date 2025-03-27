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
import UploadDocumentForm from '@/components/forms/UploadDocumentForm/UploadDocumentForm';

const UploadPage = () => {
  const [activeTab, setActiveTab] = useState<'ticket' | 'letter'>('ticket');

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>
              Add {activeTab === 'ticket' ? 'Parking Ticket' : 'Letter'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'ticket'
                ? 'Enter the details of your parking ticket or upload an image to pre-fill the form.'
                : 'Upload an image or PDF of your letter.'}
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

              <UploadDocumentForm type={activeTab} />
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadPage;
