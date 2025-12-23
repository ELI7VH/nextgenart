/**
 * Hybrid Relay Client
 * Automatically selects the best connection method:
 * 1. Try WebSocket first (bidirectional, lower latency)
 * 2. Fall back to SSE if WebSocket fails (one-way, more reliable)
 */

import { RelaySocket } from './RelaySocket'
import { RelaySSE } from './RelaySSE'

type EventCallback = (data: any) => void
type ConnectionMode = 'websocket' | 'sse' | 'disconnected'

export class RelayClient {
  private client: RelaySocket | RelaySSE | null = null
  private url: string
  private mode: ConnectionMode = 'disconnected'
  private eventHandlers: Map<string, EventCallback[]> = new Map()
  private preferredMode: ConnectionMode = 'websocket'
  private fallbackTimeout: number = 5000 // 5 seconds to try WebSocket before falling back

  public id: string = ''
  public connected: boolean = false

  constructor(url: string, options?: { preferSSE?: boolean }) {
    this.url = url

    if (options?.preferSSE) {
      this.preferredMode = 'sse'
    }

    this.connect()
  }

  private connect() {
    if (this.preferredMode === 'sse') {
      this.connectSSE()
    } else {
      this.connectWebSocket()
    }
  }

  private connectWebSocket() {
    console.log('Attempting WebSocket connection...')
    this.mode = 'websocket'

    const ws = new RelaySocket(this.url)
    this.client = ws

    // Forward all events
    ws.on('connect', () => {
      console.log('WebSocket connected successfully')
      this.connected = true
      this.id = ws.id
      this.emit('connect')
    })

    ws.on('osc', (data) => this.emit('osc', data))
    ws.on('message', (data) => this.emit('message', data))
    ws.on('error', (error) => this.emit('error', error))

    ws.on('disconnect', () => {
      console.log('WebSocket disconnected')
      this.connected = false
      this.emit('disconnect')
    })

    // Set up fallback timer
    const fallbackTimer = window.setTimeout(() => {
      if (!this.connected && this.mode === 'websocket') {
        console.warn('WebSocket connection timeout, falling back to SSE...')
        this.fallbackToSSE()
      }
    }, this.fallbackTimeout)

    // Cancel fallback if we connect successfully
    ws.on('connect', () => {
      clearTimeout(fallbackTimer)
    })
  }

  private fallbackToSSE() {
    // Clean up WebSocket
    if (this.client && 'close' in this.client) {
      this.client.close()
    }

    this.connectSSE()
  }

  private connectSSE() {
    console.log('Using SSE connection...')
    this.mode = 'sse'

    const sse = new RelaySSE(this.url)
    this.client = sse

    // Forward all events
    sse.on('connect', () => {
      console.log('SSE connected successfully')
      this.connected = true
      this.id = sse.id
      this.emit('connect')
    })

    sse.on('osc', (data) => this.emit('osc', data))
    sse.on('message', (data) => this.emit('message', data))
    sse.on('meta', (data) => this.emit('meta', data))
    sse.on('snapshot', (data) => this.emit('snapshot', data))
    sse.on('error', (error) => this.emit('error', error))

    sse.on('disconnect', () => {
      console.log('SSE disconnected')
      this.connected = false
      this.emit('disconnect')
    })
  }

  /**
   * Register an event handler
   */
  on(event: string, callback: EventCallback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(callback)

    // Also register with the underlying client if it exists
    if (this.client && 'on' in this.client) {
      // We don't need to do this since we're already forwarding events
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(event: string, data?: any) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }

  /**
   * Get a cached OSC value (only works with SSE mode)
   */
  get(address: string): any[] | undefined {
    if (this.client && 'get' in this.client) {
      return this.client.get(address)
    }
    return undefined
  }

  /**
   * Send a message (only works with WebSocket mode)
   */
  send(data: any) {
    if (this.client && 'send' in this.client) {
      this.client.send(data)
    } else {
      console.warn('Current connection mode does not support sending messages')
    }
  }

  /**
   * Get the current connection mode
   */
  getMode(): ConnectionMode {
    return this.mode
  }

  /**
   * Close the connection
   */
  close() {
    if (this.client) {
      this.client.close()
      this.client = null
    }
    this.connected = false
    this.mode = 'disconnected'
  }
}
