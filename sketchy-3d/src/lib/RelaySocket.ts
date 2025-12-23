/**
 * WebSocket client for connecting to the relay service
 * Provides a Socket.IO-like interface but uses standard WebSocket
 */

interface RelayMessage {
  type: string
  address?: string
  args?: any[]
  data?: any
  timestamp?: number
}

type EventCallback = (data: any) => void

export class RelaySocket {
  private ws: WebSocket | null = null
  private url: string
  private eventHandlers: Map<string, EventCallback[]> = new Map()
  private reconnectInterval: number = 3000
  private reconnectTimer: number | null = null
  private shouldReconnect: boolean = true

  public id: string = ''
  public connected: boolean = false

  constructor(url: string) {
    // Ensure URL uses ws:// or wss:// protocol
    if (url.startsWith('http://')) {
      this.url = url.replace('http://', 'ws://') + '/ws'
    } else if (url.startsWith('https://')) {
      this.url = url.replace('https://', 'wss://') + '/ws'
    } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      // Assume https for production relay
      this.url = 'wss://' + url + '/ws'
    } else {
      this.url = url
    }

    this.connect()
  }

  private connect() {
    try {
      console.log('Connecting to relay:', this.url)
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('WebSocket connected to relay')
        this.connected = true
        this.id = Math.random().toString(36).substring(7)
        this.emit('connect')

        // Clear reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message: RelayMessage = JSON.parse(event.data)
          // console.log('Relay message:', message)

          // Emit the message type as an event
          if (message.type === 'osc') {
            // For OSC messages, emit with address and args
            this.emit('osc', {
              address: message.address,
              args: message.args,
            })
          } else if (message.type === 'connected') {
            // Welcome message from server
            console.log('Relay server:', message.data)
          } else {
            // For other message types, emit the whole message
            this.emit(message.type, message)
          }
        } catch (error) {
          console.error('Error parsing relay message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected from relay')
        this.connected = false
        this.emit('disconnect')

        // Attempt to reconnect
        if (this.shouldReconnect) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.emit('error', error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      this.emit('error', error)

      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
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
   * Send a message to the relay server
   */
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
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
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
