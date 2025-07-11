import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuickActions from '@/components/QuickActions/QuickActions';
import RecentTickets from '@/components/RecentTickets/RecentTickets';
import StatsCards from '../../components/StatsCards/StatCards';

const DashboardPage = async () => (
  <div className="container mx-auto py-6 space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="font-slab font-bold text-3xl">Dashboard</h1>
    </div>

    <Suspense fallback={<div>Loading stats...</div>}>
      <StatsCards />
    </Suspense>

    <Suspense fallback={<div>Loading quick actions...</div>}>
      <QuickActions />
    </Suspense>

    <div className="grid gap-6 md:grid-cols-2">
      <Suspense fallback={<div>Loading recent tickets...</div>}>
        <RecentTickets />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle className="font-slab font-medium text-2xl">
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            More dashboard features coming soon, including:
          </p>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Ticket payment trends</li>
            <li>• Vehicle usage analytics</li>
            <li>• Payment reminders</li>
            <li>• Custom notifications</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default DashboardPage;
