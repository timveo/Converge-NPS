import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import MessagesPage from '../../src/pages/MessagesPage';

const mockNavigate = vi.fn();
const mockLocation = { state: undefined as any };

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    Link: ({ children }: any) => children,
  };
});

describe('MessagesPage - fast start conversation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { api } = await import('@/lib/api');
    (api.get as any).mockResolvedValue({ success: true, data: [] });
  });

  it('creates/opens conversation and redirects when navigation state provides startConversationWithUserId', async () => {
    const { api } = await import('@/lib/api');

    mockLocation.state = { startConversationWithUserId: 'recipient-uuid' };
    (api.post as any).mockResolvedValue({
      success: true,
      data: { id: 'conversation-uuid' },
    });

    render(<MessagesPage />);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/messages/conversations', {
        recipientId: 'recipient-uuid',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/messages/conversation-uuid', { replace: true });
    });
  });

  it('does not create a conversation when no navigation state is provided', async () => {
    const { api } = await import('@/lib/api');

    mockLocation.state = undefined;

    render(<MessagesPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/messages/conversations');
    });

    expect(api.post).not.toHaveBeenCalled();
  });
});
