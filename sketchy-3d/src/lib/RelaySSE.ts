/**
 * Server-Sent Events (SSE) client for connecting to the relay service
 * Provides a Socket.IO-like interface but uses SSE for one-way streaming
 * This is useful as a fallback when WebSocket connections are blocked
 */

interface StateUpdate {
  address: string
  args: any[]
  updated_at: string
}

interface MetaUpdate {
  uptime: string
  client_count: number
}

type EventCallback = (data: any) => void

export class RelaySSE {
  private eventSource: EventSource | null = null
  private url: string
  private stateUrl: string
  private eventHandlers: Map<string, EventCallback[]> = new Map()
  private reconnectInterval: number = 3000
  private reconnectTimer: number | null = null
  private shouldReconnect: boolean = true
  private stateCache: Map<string, any> = new Map()

  public id: string = ''
  public connected: boolean = false

  constructor(url: string) {
    // Ensure URL uses https:// protocol for SSE
    if (url.startsWith('ws://')) {
      this.url = url.replace('ws://', 'http://')
    } else if (url.startsWith('wss://')) {
      this.url = url.replace('wss://', 'https://')
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Assume https for production relay
      this.url = 'https://' + url
    } else {
      this.url = url
    }

    // Remove /ws suffix if present
    if (this.url.endsWith('/ws')) {
      this.url = this.url.slice(0, -3)
    }

    this.stateUrl = this.url + '/state'
    this.url = this.url + '/state/stream'

    this.connect()
  }

  private connect() {
    try {
      console.log('Connecting to relay SSE:', this.url)
      this.eventSource = new EventSource(this.url)

      this.eventSource.onopen = () => {
        console.log('SSE connected to relay')
        this.connected = true
        this.id = Math.random().toString(36).substring(7)
        this.emit('connect')

        // Load initial state snapshot
        this.fetchStateSnapshot()

        // Clear reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
      }

      // Listen for 'update' events (OSC value changes)
      this.eventSource.addEventListener('update', (event) => {
        try {
          const update: StateUpdate = JSON.parse(event.data)
          // console.log('SSE update:', update)

          // Cache the latest value
          this.stateCache.set(update.address, update.args)

          // Emit in OSC format compatible with existing handlers
          this.emit('osc', {
            address: update.address,
            args: update.args,
          })
        } catch (error) {
          console.error('Error parsing SSE update:', error)
        }
      })

      // Listen for 'meta' events (system metadata)
      this.eventSource.addEventListener('meta', (event) => {
        try {
          const meta: MetaUpdate = JSON.parse(event.data)
          // console.log('SSE meta:', meta)
          this.emit('meta', meta)
        } catch (error) {
          console.error('Error parsing SSE meta:', error)
        }
      })

      // Generic message handler (fallback)
      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          // console.log('SSE message:', message)
          this.emit('message', message)
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error)
        this.connected = false
        this.emit('error', error)
        this.emit('disconnect')

        // EventSource will auto-reconnect, but we handle it manually for consistency
        if (this.eventSource) {
          this.eventSource.close()
          this.eventSource = null
        }

        // Attempt to reconnect
        if (this.shouldReconnect) {
          this.scheduleReconnect()
        }
      }
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      this.emit('error', error)

      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }
  }

  /**
   * Fetch the current state snapshot from /state endpoint
   * This provides all current OSC values at once
   */
  private async fetchStateSnapshot() {
    try {
      const response = await fetch(this.stateUrl)
      if (!response.ok) {
        console.warn('Failed to fetch state snapshot:', response.statusText)
        return
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const state = await response.json()
        console.log('State snapshot loaded:', Object.keys(state).length, 'values')

        // Cache all values
        for (const [address, data] of Object.entries(state)) {
          if (typeof data === 'object' && data !== null && 'args' in data) {
            this.stateCache.set(address, (data as any).args)
          }
        }

        // Emit snapshot event for consumers who want to initialize from it
        this.emit('snapshot', state)
      }
    } catch (error) {
      console.error('Error fetching state snapshot:', error)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return // Already scheduled
    }

    console.log(`Reconnecting in ${this.reconnectInterval}ms...`)
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, this.reconnectInterval)
  }

  /**
   * Register an event handler
   */
  on(event: string, callback: EventCallback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(callback)
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
   * Get a cached OSC value by address
   * Returns the most recent value received for the address
   */
  get(address: string): any[] | undefined {
    return this.stateCache.get(address)
  }

  /**
   * Get all cached OSC values
   * Returns a map of address -> args
   */
  getAll(): Map<string, any[]> {
    return new Map(this.stateCache)
  }

  /**
   * SSE is one-way, so send() is not supported
   * This is here for API compatibility with RelaySocket
   */
  send(data: any) {
    console.warn('SSE does not support sending messages (one-way only)')
  }

  /**
   * Close the connection
   */
  close() {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }
}
