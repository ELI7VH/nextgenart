#!/usr/bin/env node

/**
 * Test script for OSC to Dankstore integration
 *
 * This script sends test OSC messages to the server to verify that:
 * 1. OSC messages are received by the server
 * 2. Server broadcasts them via Socket.IO
 * 3. Sketch updates dankstore
 * 4. URL search params are updated
 *
 * Usage:
 *   node test-osc.js
 *
 * Or with a specific host:
 *   node test-osc.js relay.elijahlucian.ca
 */

const osc = require('node-osc');

const host = process.argv[2] || 'localhost';
const port = 57121;

console.log(`\nOSC Dankstore Integration Test`);
console.log(`==============================`);
console.log(`Target: ${host}:${port}\n`);

const client = new osc.Client(host, port);

// Test sequence
const tests = [
  {
    name: 'Set BPM to 128',
    address: '/bpm',
    args: [128],
    delay: 1000,
  },
  {
    name: 'Set speed to 2.5',
    address: '/speed',
    args: [2.5],
    delay: 1000,
  },
  {
    name: 'Set xLim to 10',
    address: '/xLim',
    args: [10],
    delay: 1000,
  },
  {
    name: 'Set yLim to 15',
    address: '/yLim',
    args: [15],
    delay: 1000,
  },
  {
    name: 'Set depth to 30',
    address: '/depth',
    args: [30],
    delay: 1000,
  },
  {
    name: 'Generic param: Set BPM to 140',
    address: '/param/bpm',
    args: [140],
    delay: 1000,
  },
  {
    name: 'Generic param: Set speed to 1.0',
    address: '/param/speed',
    args: [1.0],
    delay: 1000,
  },
  {
    name: 'Trigger song start',
    address: '/songStart',
    args: [],
    delay: 1000,
  },
];

let currentTest = 0;

function runNextTest() {
  if (currentTest >= tests.length) {
    console.log('\n✓ All tests sent successfully');
    console.log('\nCheck your browser:');
    console.log('  1. URL should show updated params');
    console.log('  2. Console should show OSC messages received');
    console.log('  3. Visual should reflect parameter changes\n');
    client.close();
    return;
  }

  const test = tests[currentTest];
  console.log(`[${currentTest + 1}/${tests.length}] ${test.name}`);
  console.log(`  → Sending: ${test.address} ${JSON.stringify(test.args)}`);

  client.send(test.address, ...test.args, (err) => {
    if (err) {
      console.error(`  ✗ Error:`, err.message);
    } else {
      console.log(`  ✓ Sent`);
    }

    currentTest++;
    setTimeout(runNextTest, test.delay);
  });
}

// Start after a brief delay
console.log('Starting test sequence in 1 second...\n');
setTimeout(runNextTest, 1000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n\nTest interrupted');
  client.close();
  process.exit();
});
