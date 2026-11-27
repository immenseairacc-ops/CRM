'use client';

import React from 'react';
import { User } from '@/types/crm';
import { QuotationBuilder } from './quotation-app/QuotationBuilder';

export function QuotationsSection({
  currentUser,
}: {
  currentUser: User;
}) {
  return (
    <div className="w-full">
      <QuotationBuilder />
    </div>
  );
}
