'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faArrowUp } from '@fortawesome/pro-solid-svg-icons';

type AnalyticsChartsProps = {
  ticketsOverTime?: { month: string; count: number }[];
  statusBreakdown?: { name: string; value: number; color: string }[];
  financialData?: { name: string; value: number; color: string }[];
  successRateTrend?: { month: string; rate: number }[];
  totalTicketsThisYear?: number;
  appealsSubmitted?: number;
  currentSuccessRate?: number;
  successRateChange?: number;
};

// Default mock data for when no data is provided
const defaultTicketsOverTime = [
  { month: 'Jan', count: 2 },
  { month: 'Feb', count: 3 },
  { month: 'Mar', count: 1 },
  { month: 'Apr', count: 4 },
  { month: 'May', count: 2 },
  { month: 'Jun', count: 5 },
  { month: 'Jul', count: 3 },
  { month: 'Aug', count: 2 },
  { month: 'Sep', count: 4 },
  { month: 'Oct', count: 3 },
  { month: 'Nov', count: 6 },
  { month: 'Dec', count: 3 },
];

const defaultStatusBreakdown = [
  { name: 'Pending', value: 5, color: '#222222' },
  { name: 'Won', value: 6, color: '#1ABC9C' },
  { name: 'Lost', value: 2, color: '#B0B0B0' },
  { name: 'Paid', value: 4, color: '#E5E5E5' },
];

const defaultFinancialData = [
  { name: 'Saved', value: 780, color: '#222222' },
  { name: 'Paid', value: 260, color: '#E5E5E5' },
];

const defaultSuccessRateTrend = [
  { month: 'Q1', rate: 65 },
  { month: 'Q2', rate: 70 },
  { month: 'Q3', rate: 68 },
  { month: 'Q4', rate: 78 },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

const AnalyticsCharts = ({
  ticketsOverTime = defaultTicketsOverTime,
  statusBreakdown = defaultStatusBreakdown,
  financialData = defaultFinancialData,
  successRateTrend = defaultSuccessRateTrend,
  totalTicketsThisYear = 38,
  appealsSubmitted = 8,
  currentSuccessRate = 78,
  successRateChange = 12,
}: AnalyticsChartsProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const totalTickets = statusBreakdown.reduce((sum, d) => sum + d.value, 0);
  const savedAmount = financialData.find((d) => d.name === 'Saved')?.value ?? 0;

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-dark">Your Ticket Analytics</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Tickets Over Time */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="rounded-2xl bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]"
        >
          <h3 className="font-semibold text-dark">Tickets Received</h3>
          <p className="text-sm text-gray">Last 12 months</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticketsOverTime}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#222222" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#222222" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#717171', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#717171', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#222222"
                  strokeWidth={2}
                  fill="url(#colorCount)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-gray">
            <span className="font-semibold text-dark">
              {totalTicketsThisYear}
            </span>{' '}
            tickets this year
          </p>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="rounded-2xl bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]"
        >
          <h3 className="font-semibold text-dark">Status Breakdown</h3>
          <div className="mt-4 flex items-center justify-center">
            <div className="relative h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-dark">
                  {totalTickets}
                </span>
                <span className="text-xs text-gray">total</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {statusBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Financial Impact */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="rounded-2xl bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]"
        >
          <h3 className="font-semibold text-dark">Financial Impact</h3>
          <div className="mt-4 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#717171', fontSize: 12 }}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`£${value}`, '']}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  animationDuration={1000}
                >
                  {financialData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 rounded-lg bg-teal/10 px-3 py-2">
            <p className="text-sm text-teal">
              <FontAwesomeIcon icon={faTrophy} className="mr-2" />
              You&apos;ve saved{' '}
              <span className="font-bold">£{savedAmount}</span> by challenging
              tickets
            </p>
          </div>
        </motion.div>

        {/* Success Rate Trend */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="rounded-2xl bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]"
        >
          <h3 className="font-semibold text-dark">Success Rate Trend</h3>
          <div className="mt-4 flex items-center gap-4">
            <div>
              <span className="text-4xl font-bold text-dark">
                {currentSuccessRate}%
              </span>
              <p className="mt-1 flex items-center gap-1 text-sm text-teal">
                <FontAwesomeIcon icon={faArrowUp} className="text-xs" />
                {successRateChange}% from last quarter
              </p>
            </div>
            <div className="h-20 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={successRateTrend}>
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#222222"
                    strokeWidth={2}
                    dot={{ fill: '#222222', strokeWidth: 0, r: 3 }}
                    animationDuration={1000}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value}%`, 'Success Rate']}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray">
            Based on{' '}
            <span className="font-medium text-dark">
              {appealsSubmitted} appeals
            </span>{' '}
            submitted
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
