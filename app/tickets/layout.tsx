import type React from 'react';
// This layout defines the slot for the modal.
const TicketsLayout = ({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) => (
  <>
    {children}
    {modal}
  </>
);

export default TicketsLayout;
