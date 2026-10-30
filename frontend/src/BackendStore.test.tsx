import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StoreProvider, useStore } from '@/data/mock-store'
import { setSession } from '@/services/apiClient'

function StoreProbe() {
  const store = useStore()
  return <>
    <div data-testid="status">{store.backendStatus}</div>
    <div data-testid="users">{store.users.map(user => user.id).join(',')}</div>
    <button onClick={store.refreshBackend}>Retry</button>
  </>
}

const responses: Record<string, object> = {
  '/api/users': { users: [{ id: 'DB_USER', code: 'DB001', name: 'Database User', email: 'db@example.com', role: 'student', isActive: true }] },
  '/api/roster': { roster: [] },
  '/api/audit-logs': { logs: [] },
  '/api/categories': { categories: [] },
  '/api/document-types': { documentTypes: [] },
}

describe('Backend store without demo fallback', () => {
  beforeEach(() => { vi.stubEnv('MODE', 'development'); setSession('test-session-token', 'admin') })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); setSession(null) })

  it('does not call the API while signed out', async () => {
    setSession(null)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<StoreProvider><StoreProbe /></StoreProvider>)
    await new Promise(r => setTimeout(r, 20))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends the session token and active role with every request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => ({
      ok: true,
      json: async () => responses[new URL(String(input)).pathname] ?? {},
    } as Response))
    render(<StoreProvider><StoreProbe /></StoreProvider>)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    for (const [, init] of fetchSpy.mock.calls) {
      const headers = (init as RequestInit).headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer test-session-token')
      expect(headers['x-active-role']).toBe('admin')
    }
  })

  it('starts empty and replaces data with the backend response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => ({
      ok: true,
      json: async () => responses[new URL(String(input)).pathname] ?? {},
    } as Response))
    render(<StoreProvider><StoreProbe /></StoreProvider>)
    expect(screen.getByTestId('users')).toBeEmptyDOMElement()
    expect(screen.getByTestId('status')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('users')).toHaveTextContent(/^DB_USER$/)
  })

  it('reports unavailable backend without showing demo users and supports retry', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response)
    render(<StoreProvider><StoreProbe /></StoreProvider>)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'))
    expect(screen.getByTestId('users')).toBeEmptyDOMElement()
    fetchSpy.mockImplementation(async input => ({
      ok: true,
      json: async () => responses[new URL(String(input)).pathname] ?? {},
    } as Response))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('users')).toHaveTextContent(/^DB_USER$/)
  })
})
