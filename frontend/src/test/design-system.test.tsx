import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { Input } from '@/design-system/primitives/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/design-system/primitives/Dialog';
import { FormField } from '@/design-system/patterns/FormField';
import { StatusBadge } from '@/design-system/patterns/StatusBadge';
import { DataTable, type Column } from '@/design-system/patterns/DataTable';

describe('Button', () => {
  it('renders and handles clicks', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled while loading', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

describe('FormField', () => {
  it('associates the label and surfaces the error', () => {
    render(
      <FormField htmlFor="email" label="Email" error="Required">
        <Input id="email" aria-invalid />
      </FormField>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
});

describe('StatusBadge', () => {
  it('maps a status to a human label', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });
});

describe('Dialog', () => {
  it('renders content when open', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>Are you sure?</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });
});

describe('DataTable', () => {
  interface Row {
    id: string;
    name: string;
  }
  const columns: Column<Row>[] = [{ key: 'name', header: 'Name' }];

  it('renders rows', () => {
    render(
      <DataTable columns={columns} data={[{ id: '1', name: 'Alpha' }]} rowKey={(r) => r.id} />,
    );
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
  });

  it('renders an empty state', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(r) => r.id} />);
    expect(screen.getAllByText(/no results/i).length).toBeGreaterThan(0);
  });
});
