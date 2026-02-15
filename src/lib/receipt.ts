import type { ApiOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/money";
import { printRaw } from "@/lib/qz";

type ReceiptOptions = {
  printerName: string;
  columns?: number;
};

const padRight = (value: string, length: number) =>
  value.length >= length ? value.slice(0, length) : value.padEnd(length, " ");

const padLeft = (value: string, length: number) =>
  value.length >= length ? value.slice(0, length) : value.padStart(length, " ");

const wrapText = (value: string, width: number) => {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  if (lines.length === 0) lines.push("");
  return lines;
};

const centerText = (value: string, width: number) => {
  const trimmed = value.length > width ? value.slice(0, width) : value;
  const left = Math.max(0, Math.floor((width - trimmed.length) / 2));
  return `${" ".repeat(left)}${trimmed}`;
};

const formatAddress = (order: ApiOrder) => {
  const address = order.address;
  if (!address) return "Pickup";
  return [address.line1, address.line2, address.city, address.postcode]
    .filter(Boolean)
    .join(", ");
};

const buildReceiptText = (order: ApiOrder, columns: number) => {
  const divider = "-".repeat(columns);
  const amountWidth = 8;
  const nameWidth = columns - amountWidth - 1;
  const lines: string[] = [];

  lines.push(centerText("Burger Guys", columns));
  lines.push(centerText(new Date(order.createdAt).toLocaleString(), columns));
  lines.push(centerText(`Receipt ${order.id.slice(0, 8).toUpperCase()}`, columns));
  lines.push(centerText(`Order: ${order.id.slice(0, 6).toUpperCase()}`, columns));
  lines.push(divider);
  lines.push(padRight("Products", nameWidth) + " " + padLeft("Amount", amountWidth));
  lines.push(divider);

  order.items.forEach((item) => {
    const label = `${item.quantity} x ${item.name}`;
    const price = formatCurrency(item.basePriceCents * item.quantity);
    const wrapped = wrapText(label, nameWidth);
    wrapped.forEach((line, index) => {
      if (index === 0) {
        lines.push(padRight(line, nameWidth) + " " + padLeft(price, amountWidth));
      } else {
        lines.push(padRight(line, nameWidth));
      }
    });

    item.addOns?.forEach((addOn) => {
      const addOnLabel = `+ ${addOn.name}`;
      wrapText(addOnLabel, nameWidth).forEach((line) => lines.push(padRight(line, nameWidth)));
    });
  });

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  lines.push(divider);
  lines.push(padRight(`Total Items ${totalItems}`, columns));
  lines.push(
    padRight(order.orderType === "DEAL" ? "Order Type: Deal" : "Order Type: Normal", columns),
  );
  lines.push(padRight(order.paymentMethod === "CASH" ? "Cash" : "Card", columns));
  lines.push(padRight(formatAddress(order), columns));
  lines.push(divider);
  lines.push(
    padRight("Sub Total", nameWidth) + " " + padLeft(formatCurrency(order.subtotalCents), amountWidth),
  );
  if (order.deliveryFeeCents > 0) {
    lines.push(
      padRight("Delivery", nameWidth) + " " + padLeft(formatCurrency(order.deliveryFeeCents), amountWidth),
    );
  }
  lines.push(
    padRight("Total Amount", nameWidth) + " " + padLeft(formatCurrency(order.totalCents), amountWidth),
  );
  lines.push(divider);
  lines.push(centerText("Thank you for your visit", columns));
  lines.push(centerText("Burger Guys", columns));

  const init = "\x1B\x40";
  const cut = "\x1D\x56\x41\x10";

  return `${init}\n${lines.join("\n")}\n\n\n${cut}`;
};

export const printOrderReceipt = async (order: ApiOrder, options: ReceiptOptions) => {
  const columns = options.columns ?? 32;
  const payload = buildReceiptText(order, columns);
  await printRaw(options.printerName, payload);
};
