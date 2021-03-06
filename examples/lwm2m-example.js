var readline = require('readline');
var lwm2m = new(require('../src/lwm2m.js'))();
var artik = require('../src');
var fs = require('fs');
var security = new artik.security.Security();

var server_id = 123;
var server_uri = 'coaps+tcp://coaps-api.artik.cloud:5689';
var lifetime = 30;
var connect_timeout = 1000;
var dtls_psk_id = '11531fffb0fa49a0b24be13f460278ff';
var dtls_psk_key = '88bb82a2aed3421ca45dbd4fde37f262';
/*
var certificate_mode_config = { // Certificate mode: no client certificate, no verify
    'verify_cert': 'none'
};
*/
/*
var certificate_mode_config = null; // Certificate mode: disable

var certificate_mode_config = { // Certificate mode: external client certificate
    'client_cert': fs.readFileSync('path client cert.pem'),
    'client_private_key': fs.readFileSync('path private key.pem'),
    'server_or_root_cert': fs.readFileSync('path server cert.cert')
};
*/
var certificate_mode_config = { // Certificate mode: client certificate stored in the SE
    se_config : {
        key_id: "ARTIK/0",
        key_algo: "ecc_sec_p256r1"
    },
    'server_or_root_cert': null,
    'verify_cert' : 'none',
};

certificate_mode_config.client_cert = security.get_certificate('ARTIK/0', 'ARTIK_SECURITY_CERT_TYPE_PEM');
certificate_mode_config.client_private_key = security.get_publickey("ecc_sec_p256r1", 'ARTIK/0');

var objects = {
    device: {
        manufacturer: 'Samsung',
        model: 'ARTIK',
        serial: '09877666666',
        fwVersion: '1.0',
        hwVersion: '1.0',
        swVersion: '1.0',
        deviceType: 'Hub',
        powerSource: 0,
        powerVoltage: 5000,
        powerCurrent: 1500,
        batteryLevel: 100,
        memoryTotal: 1000000,
        memoryFree: 200000,
        timeZone: 'Europe/Paris',
        utcOffset: '+01:00',
        bindingModes: 'U'
    },
    firmware : {
        pkgName : 'ota-sample-app',
        pkgVersion : '1.0-0'
    }
};

rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('lwm2m>');
rl.prompt();

function usage() {
    console.log('Commands:');
    console.log('\tread <uri>');
    console.log('\twrite <uri> <value>');
    console.log('\tquit');
}

rl.on('line', function(line) {
    if (line.trim().startsWith('read')) {
        var opts = line.trim().split(' ');
        if (opts.length != 2)
            usage();
        else {
            var buf = lwm2m.client_read_resource(opts[1].toString());
            console.log('URI: ' + opts[1] + ' - Value: ' + buf);
        }
    } else if (line.trim().startsWith('write')) {
        var opts = line.trim().split(' ');
        if (opts.length != 3)
            usage();
        else {
            var buf = new Buffer(opts[2]);
            lwm2m.client_write_resource(opts[1].toString(), buf);
        }
    } else if (line.trim().startsWith('quit')) {
        lwm2m.client_disconnect();
        lwm2m.client_release();
        process.exit(0);
    } else {
        usage();
    }
    rl.prompt();
});

lwm2m.on('started', function() {
    console.log("start lwm2m connection");
    lwm2m.client_request(server_id, server_uri, dtls_psk_id, lifetime,
            connect_timeout, objects, dtls_psk_id, dtls_psk_key,
            certificate_mode_config);
    lwm2m.client_connect();
});

lwm2m.on('error', function(err) {
    console.log('\r\nLWM2M error: ' + err);
    rl.prompt();
});

lwm2m.on('connected', function(status) {
    console.log('\r\nStatus connection: ' + status);
});

lwm2m.on('disconnected', function(status) {
    console.log('\r\nStatus connection: ' + status);
});

lwm2m.on('execute', function(uri) {
    var exe_uri = uri;

    switch (uri) {
    case lwm2m.LWM2M_URI_DEVICE_REBOOT:
        exe_uri = "Reboot";
        break;
    case lwm2m.LWM2M_URI_DEVICE_FACTORY_RESET:
        exe_uri = "Factory Reset";
        break;
    case lwm2m.LWM2M_URI_DEVICE_RESET_ERROR_CODE:
        exe_uri = "Reset Error code";
        break;
    default:
        break;
    }

    console.log('\r\nLWM2M execute: ' + exe_uri);
    rl.prompt();
});

lwm2m.on('changed', function(uri, buffer) {
    console.log('\r\nLWM2M changed: ' + uri);
    console.log('with buffer: ' + buffer.toString('utf8'));
    rl.prompt();
});

process.on('SIGINT', function () {
    lwm2m.client_disconnect();
    lwm2m.client_release();
    process.exit(0);
});
