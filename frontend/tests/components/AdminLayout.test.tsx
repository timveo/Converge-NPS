import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminLayout from '../../src/components/AdminLayout';

describe('AdminLayout', () => {
  it('should render admin panel header', () => {
    render(
      <BrowserRouter>
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      </BrowserRouter>
    );

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Converge-NPS')).toBeInTheDocument();
  });

  it('should render all navigation items', () => {
    render(
      <BrowserRouter>
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      </BrowserRouter>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Smartsheet')).toBeInTheDocument();
  });

  it('should render back to app link', () => {
    render(
      <BrowserRouter>
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      </BrowserRouter>
    );

    expect(screen.getByText('Back to App')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(
      <BrowserRouter>
        <AdminLayout>
          <div data-testid="child-content">Test Content</div>
        </AdminLayout>
      </BrowserRouter>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should have correct navigation links', () => {
    render(
      <BrowserRouter>
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      </BrowserRouter>
    );

    const overviewLink = screen.getByRole('link', { name: /overview/i });
    const sessionsLink = screen.getByRole('link', { name: /sessions/i });
    const usersLink = screen.getByRole('link', { name: /users/i });

    expect(overviewLink).toHaveAttribute('href', '/admin');
    expect(sessionsLink).toHaveAttribute('href', '/admin/sessions');
    expect(usersLink).toHaveAttribute('href', '/admin/users');
  });
});
