export const metadata = {
  title: 'Parking Ticket Pal Studio',
  description: 'Content management for Parking Ticket Pal blog',
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
