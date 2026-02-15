import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/money";
import { Search, Wallet, ArrowDownToLine } from "lucide-react";
import PaginationFooter from "@/components/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";

type WalletTransactionType = "PAYMENT" | "WITHDRAWAL";
type WalletTransactionStatus = "COMPLETED" | "PENDING" | "FAILED";

interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  customerName?: string;
  customerEmail?: string;
  amountCents: number;
  feeCents: number;
  createdAt: string;
}

const DEMO_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "PAY-7HW3R1",
    type: "PAYMENT",
    status: "COMPLETED",
    customerName: "Hamza Khan",
    customerEmail: "hamza@example.com",
    amountCents: 3299,
    feeCents: 129,
    createdAt: "2026-02-11T08:40:00Z",
  },
  {
    id: "PAY-5FD8L2",
    type: "PAYMENT",
    status: "COMPLETED",
    customerName: "Ayesha Malik",
    customerEmail: "ayesha@example.com",
    amountCents: 1899,
    feeCents: 89,
    createdAt: "2026-02-11T07:05:00Z",
  },
  {
    id: "WD-9021AA",
    type: "WITHDRAWAL",
    status: "COMPLETED",
    amountCents: 5000,
    feeCents: 0,
    createdAt: "2026-02-10T19:30:00Z",
  },
  {
    id: "PAY-A1D9Q7",
    type: "PAYMENT",
    status: "PENDING",
    customerName: "Omar Ali",
    customerEmail: "omar@example.com",
    amountCents: 2499,
    feeCents: 99,
    createdAt: "2026-02-10T17:25:00Z",
  },
  {
    id: "PAY-K0M4X2",
    type: "PAYMENT",
    status: "COMPLETED",
    customerName: "Sara Noor",
    customerEmail: "sara@example.com",
    amountCents: 4599,
    feeCents: 155,
    createdAt: "2026-02-09T15:10:00Z",
  },
  {
    id: "WD-44X7PQ",
    type: "WITHDRAWAL",
    status: "PENDING",
    amountCents: 4200,
    feeCents: 0,
    createdAt: "2026-02-09T10:20:00Z",
  },
  {
    id: "PAY-C8M2J4",
    type: "PAYMENT",
    status: "FAILED",
    customerName: "Bilal Ahmed",
    customerEmail: "bilal@example.com",
    amountCents: 1599,
    feeCents: 0,
    createdAt: "2026-02-08T22:05:00Z",
  },
];

const FILTER_OPTIONS = [
  { id: "ALL", label: "All" },
  { id: "PAYMENT", label: "Customer Payments" },
  { id: "WITHDRAWAL", label: "Withdrawals" },
] as const;

type FilterId = (typeof FILTER_OPTIONS)[number]["id"];

const getStatusClasses = (status: WalletTransactionStatus) => {
  if (status === "COMPLETED") {
    return "bg-secondary/20 text-brand-black";
  }
  if (status === "PENDING") {
    return "bg-primary/20 text-foreground";
  }
  return "bg-destructive/20 text-destructive";
};

const AdminWallet = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterId>("ALL");

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return DEMO_TRANSACTIONS.filter((transaction) => {
      if (filter !== "ALL" && transaction.type !== filter) return false;
      if (!term) return true;

      return (
        transaction.id.toLowerCase().includes(term) ||
        (transaction.customerName ?? "").toLowerCase().includes(term) ||
        (transaction.customerEmail ?? "").toLowerCase().includes(term) ||
        transaction.type.toLowerCase().includes(term) ||
        transaction.status.toLowerCase().includes(term)
      );
    });
  }, [filter, searchTerm]);
  const transactionsPagination = usePagination(filteredTransactions, {
    pageSize: 10,
    resetDeps: [filter, searchTerm],
  });
  const paginatedTransactions = transactionsPagination.paginatedItems;

  const summary = useMemo(() => {
    const completedPayments = DEMO_TRANSACTIONS.filter(
      (item) => item.type === "PAYMENT" && item.status === "COMPLETED",
    );
    const completedWithdrawals = DEMO_TRANSACTIONS.filter(
      (item) => item.type === "WITHDRAWAL" && item.status === "COMPLETED",
    );
    const pendingItems = DEMO_TRANSACTIONS.filter((item) => item.status === "PENDING");

    const grossSalesCents = completedPayments.reduce((sum, item) => sum + item.amountCents, 0);
    const feesCents = completedPayments.reduce((sum, item) => sum + item.feeCents, 0);
    const netSalesCents = grossSalesCents - feesCents;
    const withdrawnCents = completedWithdrawals.reduce((sum, item) => sum + item.amountCents, 0);
    const availableBalanceCents = netSalesCents - withdrawnCents;
    const pendingCents = pendingItems.reduce(
      (sum, item) => sum + (item.type === "PAYMENT" ? item.amountCents - item.feeCents : -item.amountCents),
      0,
    );

    return {
      grossSalesCents,
      feesCents,
      withdrawnCents,
      availableBalanceCents,
      pendingCents,
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/40 bg-gradient-to-r from-primary/20 via-secondary/15 to-background p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-black/70">
              Demo Wallet
            </p>
            <h1 className="mt-2 font-display text-4xl text-foreground">PayPal Wallet</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Demo transaction feed for customer payments and withdrawals.
            </p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            PayPal Sandbox UI
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Available Balance"
          value={formatCurrency(summary.availableBalanceCents)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <SummaryCard
          title="Gross Customer Sales"
          value={formatCurrency(summary.grossSalesCents)}
          icon={<ArrowDownToLine className="h-5 w-5" />}
        />
        <SummaryCard
          title="PayPal Fees"
          value={formatCurrency(summary.feesCents)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <SummaryCard
          title="Money Withdrawn"
          value={formatCurrency(summary.withdrawnCents)}
          icon={<ArrowDownToLine className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer, email, or transaction ID"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-background p-1 shadow-sm">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant={filter === option.id ? "default" : "ghost"}
                className="rounded-full px-4"
                onClick={() => setFilter(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-4 text-xs text-muted-foreground">
          Pending movement: <span className="font-semibold text-foreground">{formatCurrency(summary.pendingCents)}</span>
        </div>

        <div className="overflow-x-auto p-4">
          <Table className="min-w-[980px]">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 text-xs uppercase tracking-wide">Txn ID</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Type</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Customer</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Email</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide text-right">Amount</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide text-right">Fee</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide text-right">Net</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                paginatedTransactions.map((transaction) => {
                  const netCents =
                    transaction.type === "PAYMENT"
                      ? transaction.amountCents - transaction.feeCents
                      : -transaction.amountCents;

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-semibold text-foreground">{transaction.id}</TableCell>
                      <TableCell>
                        <span className="rounded-full border border-border px-2 py-1 text-xs font-semibold">
                          {transaction.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.customerName ?? "Admin Wallet"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.customerEmail ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {formatCurrency(transaction.amountCents)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(transaction.feeCents)}
                      </TableCell>
                      <TableCell
                        className={[
                          "text-right font-semibold",
                          netCents >= 0 ? "text-secondary" : "text-destructive",
                        ].join(" ")}
                      >
                        {netCents >= 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(netCents))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            getStatusClasses(transaction.status),
                          ].join(" ")}
                        >
                          {transaction.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No transactions match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationFooter
          currentPage={transactionsPagination.currentPage}
          totalPages={transactionsPagination.totalPages}
          totalItems={transactionsPagination.totalItems}
          startItem={transactionsPagination.startItem}
          endItem={transactionsPagination.endItem}
          label="transaction"
          onPageChange={transactionsPagination.setCurrentPage}
        />
      </div>
    </div>
  );
};

const SummaryCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default AdminWallet;
