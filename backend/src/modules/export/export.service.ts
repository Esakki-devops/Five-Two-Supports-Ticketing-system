import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { Ticket } from '../tickets/ticket.model';

interface ExportRow {
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  department: string;
  category: string;
  requester: string;
  assignee: string;
  createdAt: string;
  resolvedAt: string;
  closedAt: string;
}

interface LeanTicket {
  ticketNumber?: string;
  title?: string;
  status?: string;
  priority?: string;
  department?: { name?: string } | null;
  category?: { name?: string } | null;
  requester?: { name?: string } | null;
  assignee?: { name?: string } | null;
  createdAt?: Date;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
}

const COLUMNS: { header: string; key: keyof ExportRow }[] = [
  { header: 'Ticket #', key: 'ticketNumber' },
  { header: 'Title', key: 'title' },
  { header: 'Status', key: 'status' },
  { header: 'Priority', key: 'priority' },
  { header: 'Department', key: 'department' },
  { header: 'Category', key: 'category' },
  { header: 'Requester', key: 'requester' },
  { header: 'Assignee', key: 'assignee' },
  { header: 'Created', key: 'createdAt' },
  { header: 'Resolved', key: 'resolvedAt' },
  { header: 'Closed', key: 'closedAt' },
];

const fmtDate = (d?: Date | null): string => (d instanceof Date ? d.toISOString() : '');

function ticketCursor() {
  return Ticket.find({ isDeleted: false })
    .populate('department', 'name')
    .populate('category', 'name')
    .populate('requester', 'name email')
    .populate('assignee', 'name email')
    .sort({ createdAt: -1 })
    .lean()
    .cursor();
}

function toRow(t: LeanTicket): ExportRow {
  return {
    ticketNumber: t.ticketNumber ?? '',
    title: t.title ?? '',
    status: t.status ?? '',
    priority: t.priority ?? '',
    department: t.department?.name ?? '',
    category: t.category?.name ?? '',
    requester: t.requester?.name ?? '',
    assignee: t.assignee?.name ?? '',
    createdAt: fmtDate(t.createdAt),
    resolvedAt: fmtDate(t.resolvedAt),
    closedAt: fmtDate(t.closedAt),
  };
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function filename(ext: string): string {
  return `tickets-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export async function streamCsv(res: Response): Promise<void> {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename('csv')}"`);
  res.write('﻿'); // UTF-8 BOM so Excel opens it correctly
  res.write(`${COLUMNS.map((c) => c.header).join(',')}\n`);
  for await (const doc of ticketCursor()) {
    const row = toRow(doc as unknown as LeanTicket);
    res.write(`${COLUMNS.map((c) => csvEscape(String(row[c.key] ?? ''))).join(',')}\n`);
  }
  res.end();
}

export async function streamXlsx(res: Response): Promise<void> {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename('xlsx')}"`);

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const sheet = workbook.addWorksheet('Tickets');
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  for await (const doc of ticketCursor()) {
    sheet.addRow(toRow(doc as unknown as LeanTicket)).commit();
  }
  sheet.commit();
  await workbook.commit();
}
