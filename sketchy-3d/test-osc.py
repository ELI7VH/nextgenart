#!/usr/bin/env python3

"""
Test script for OSC to Dankstore integration (Python version)

This script sends test OSC messages to the server to verify that:
1. OSC messages are received by the server
2. Server broadcasts them via Socket.IO
3. Sketch updates dankstore
4. URL search params are updated

Requirements:
    pip install python-osc

Usage:
    python3 test-osc.py

Or with a specific host:
    python3 test-osc.py relay.elijahlucian.ca
"""

import sys
import time
from pythonosc import udp_client

def main():
    host = sys.argv[1] if len(sys.argv) > 1 else 'localhost'
    port = 57121

    print("\nOSC Dankstore Integration Test")
    print("==============================")
    print(f"Target: {host}:{port}\n")

    client = udp_client.SimpleUDPClient(host, port)

    # Test sequence
    tests = [
        {
            'name': 'Set BPM to 128',
            'address': '/bpm',
            'args': [128],
            'delay': 1.0,
        },
        {
            'name': 'Set speed to 2.5',
            'address': '/speed',
            'args': [2.5],
            'delay': 1.0,
        },
        {
            'name': 'Set xLim to 10',
            'address': '/xLim',
            'args': [10],
            'delay': 1.0,
        },
        {
            'name': 'Set yLim to 15',
            'address': '/yLim',
            'args': [15],
            'delay': 1.0,
        },
        {
            'name': 'Set depth to 30',
            'address': '/depth',
            'args': [30],
            'delay': 1.0,
        },
        {
            'name': 'Generic param: Set BPM to 140',
            'address': '/param/bpm',
            'args': [140],
            'delay': 1.0,
        },
        {
            'name': 'Generic param: Set speed to 1.0',
            'address': '/param/speed',
            'args': [1.0],
            'delay': 1.0,
        },
        {
            'name': 'Trigger song start',
            'address': '/songStart',
            'args': [],
            'delay': 1.0,
        },
    ]

    print('Starting test sequence in 1 second...\n')
    time.sleep(1)

    for i, test in enumerate(tests):
        print(f"[{i + 1}/{len(tests)}] {test['name']}")
        print(f"  → Sending: {test['address']} {test['args']}")

        try:
            if test['args']:
                client.send_message(test['address'], test['args'])
            else:
                client.send_message(test['address'], [])
            print("  ✓ Sent")
        except Exception as e:
            print(f"  ✗ Error: {e}")

        time.sleep(test['delay'])

    print('\n✓ All tests sent successfully')
    print('\nCheck your browser:')
    print('  1. URL should show updated params')
    print('  2. Console should show OSC messages received')
    print('  3. Visual should reflect parameter changes\n')

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nTest interrupted')
        sys.exit(0)
