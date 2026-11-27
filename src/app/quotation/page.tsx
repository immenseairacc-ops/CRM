'use client';

import React from 'react';
import { QuotationBuilder } from '@/components/quotation-app/QuotationBuilder';

export default function StandaloneQuotationPage() {
  return (
    <div className="min-h-screen bg-[#f4f6fa]">
      <QuotationBuilder />
    </div>
  );
}
