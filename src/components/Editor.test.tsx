import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Editor } from './Editor';

describe('Editor', () => {
  it('renders the app shell', () => {
    render(<Editor />);
    expect(screen.getByText('antd-builder')).toBeInTheDocument();
  });
});
