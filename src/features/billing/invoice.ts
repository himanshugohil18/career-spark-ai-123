import { PLANS, type PlanId } from "@/lib/billing/plans";
import { COMPANY, GST_RATE } from "./company";

export interface InvoicePayment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  order_id: string;
  payment_id: string | null;
  status: string;
  plan: string | null;
  method: string | null;
  receipt: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  created_at: string;
}

export interface InvoiceSubscription {
  id: string;
  plan: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
}

export interface InvoiceCustomer {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  location?: string | null;
}

export interface InvoiceData {
  company: typeof COMPANY;
  invoiceNumber: string;
  issueDate: string;
  paymentDate: string;
  status: string;
  customer: InvoiceCustomer;
  payment: InvoicePayment;
  subscription: InvoiceSubscription | null;
  plan: (typeof PLANS)[PlanId];
  amounts: {
    grandTotalPaise: number;
    subtotalPaise: number;
    taxPaise: number;
    unitPricePaise: number;
    quantity: number;
    discountPaise: number;
  };
  features: string[];
}

export function buildInvoice(args: {
  payment: InvoicePayment;
  subscription: InvoiceSubscription | null;
  customer: InvoiceCustomer;
}): InvoiceData {
  const { payment, subscription, customer } = args;
  const planId = (payment.plan ?? subscription?.plan ?? "pro") as PlanId;
  const plan = PLANS[planId] ?? PLANS.pro;

  // GST-inclusive breakdown: assume amount includes 18% GST
  const grandTotal = payment.amount;
  const subtotal = Math.round(grandTotal / (1 + GST_RATE));
  const tax = grandTotal - subtotal;

  return {
    company: COMPANY,
    invoiceNumber: payment.invoice_number ?? `COS-${new Date(payment.created_at).getFullYear()}-PENDING`,
    issueDate: payment.invoice_issued_at ?? payment.created_at,
    paymentDate: payment.created_at,
    status: payment.status,
    customer,
    payment,
    subscription,
    plan,
    amounts: {
      grandTotalPaise: grandTotal,
      subtotalPaise: subtotal,
      taxPaise: tax,
      unitPricePaise: subtotal,
      quantity: 1,
      discountPaise: 0,
    },
    features: plan.features,
  };
}

export function formatINR(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
