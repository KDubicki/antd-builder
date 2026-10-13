import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { DataPanel, describeData } from './DataPanel';

const sources = () => useEditorStore.getState().mockData;

beforeEach(() => useEditorStore.setState({ mockData: [], past: [], future: [], lastEdit: null }));

describe('describeData', () => {
  it('summarizes the shape of a response', () => {
    expect(describeData([1, 2])).toBe('List of 2 items');
    expect(describeData([1])).toBe('List of 1 item');
    expect(describeData({ a: 1 })).toBe('Object with 1 key');
    expect(describeData({ a: 1, b: 2 })).toBe('Object with 2 keys');
    expect(describeData(null)).toBe('Empty (null)');
    expect(describeData('x')).toBe('Single string');
  });
});

describe('DataPanel', () => {
  it('starts empty and adds data sources with sample data', () => {
    render(<DataPanel />);
    expect(screen.getByText('No data sources yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add data source/ }));
    expect(sources()).toHaveLength(1);
    expect(screen.getByLabelText('Name')).toHaveValue('data');
    expect(screen.getByText('List of 3 items')).toBeInTheDocument();
  });

  it('renames on valid input and explains invalid names', () => {
    act(() => {
      useEditorStore.getState().addDataSource('users');
      useEditorStore.getState().addDataSource('orders');
    });
    render(<DataPanel />);
    const [users] = screen.getAllByLabelText('Name');

    fireEvent.change(users!, { target: { value: 'customers' } });
    expect(sources()[0]?.name).toBe('customers');

    fireEvent.change(users!, { target: { value: 'orders' } });
    expect(screen.getByText('"orders" is already used')).toBeInTheDocument();
    fireEvent.change(users!, { target: { value: 'Bad name' } });
    expect(screen.getByText(/starting with a lowercase letter/)).toBeInTheDocument();
    expect(sources()[0]?.name).toBe('customers');

    fireEvent.blur(users!); // an invalid draft reverts
    expect(users).toHaveValue('customers');
  });

  it('edits the response JSON; clearing it leaves null', () => {
    act(() => {
      useEditorStore.getState().addDataSource('stats');
    });
    render(<DataPanel />);
    const json = screen.getByLabelText('Response (JSON)');
    fireEvent.change(json, { target: { value: '{"total": 42}' } });
    expect(sources()[0]?.data).toEqual({ total: 42 });
    expect(screen.getByText('Object with 1 key')).toBeInTheDocument();

    fireEvent.change(json, { target: { value: '' } });
    expect(sources()[0]?.data).toBeNull();
  });

  it('deletes a data source after confirming', async () => {
    act(() => {
      useEditorStore.getState().addDataSource('users');
    });
    render(<DataPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete users' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(sources()).toEqual([]));
  });
});
