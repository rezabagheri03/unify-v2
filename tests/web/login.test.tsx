/**
 * tests/web/login.test.tsx — Login page unit test.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../../apps/web/src/app/(auth)/login/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/login',
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn() },
}));

describe('LoginPage', () => {
  it('renders the login form with Persian labels', () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <LoginPage />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/یونیفای/)).toBeInTheDocument();
    expect(screen.getByLabelText(/شماره دانشجویی/)).toBeInTheDocument();
    expect(screen.getByLabelText(/رمز عبور/)).toBeInTheDocument();
  });
});
